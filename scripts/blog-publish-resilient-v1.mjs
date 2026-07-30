#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const QUEUE = resolve(ROOT, 'apps/portal/data/blog-content/queue.json');
const HEALTH = resolve(ROOT, 'apps/portal/data/blog-content/health.json');
const MAX_ATTEMPTS = Math.max(1, Number(process.env.BLOG_MAX_ATTEMPTS || 2));
const BASE_BACKOFF_MS = Math.max(1000, Number(process.env.BLOG_BACKOFF_MS || 60000));
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runPublisher() {
  return spawnSync(process.execPath, ['scripts/blog-publish-v1.mjs', '--live'], {
    cwd: ROOT,
    env: {
      ...process.env,
      BLOG_PER_RUN: process.env.BLOG_PER_RUN || '3',
      BLOG_PAUSE_MS: process.env.BLOG_PAUSE_MS || '15000'
    },
    encoding: 'utf8'
  });
}

const attempts = [];
let finalQueue = null;
let conclusion = 'failed';

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const startedAt = new Date().toISOString();
  const result = runPublisher();
  finalQueue = readJson(QUEUE, {});
  const failures = Array.isArray(finalQueue.failed) ? finalQueue.failed : [];
  const quotaLimited = failures.some((failure) => String(failure.error || '').includes('blogger_429'));
  const operationalFailure = result.status !== 0 || failures.some((failure) => !String(failure.error || '').includes('blogger_429'));

  attempts.push({
    attempt,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    posted: Array.isArray(finalQueue.posted) ? finalQueue.posted.length : 0,
    failed: failures.length,
    quotaLimited,
    stdoutTail: String(result.stdout || '').slice(-1000),
    stderrTail: String(result.stderr || '').slice(-1000)
  });

  if (!quotaLimited && !operationalFailure) {
    conclusion = 'healthy';
    break;
  }

  if (operationalFailure && !quotaLimited) {
    conclusion = 'failed';
    break;
  }

  conclusion = 'degraded-quota';
  if (attempt < MAX_ATTEMPTS) await sleep(BASE_BACKOFF_MS * (2 ** (attempt - 1)));
}

const pending = Number(finalQueue?.remainingAfterRun ?? finalQueue?.pending ?? 0);
const health = {
  version: 'GNK_ASG_BLOG_PUBLISH_HEALTH_V1',
  generatedAt: new Date().toISOString(),
  destination: 'Blogger / Aktual Media mirror',
  conclusion,
  pending,
  attempts,
  policy: {
    perRun: Number(process.env.BLOG_PER_RUN || 3),
    pauseMs: Number(process.env.BLOG_PAUSE_MS || 15000),
    maxAttempts: MAX_ATTEMPTS,
    exponentialBackoffBaseMs: BASE_BACKOFF_MS,
    singleWriterRequired: true
  }
};
writeJson(HEALTH, health);

console.log(JSON.stringify(health, null, 2));

// A quota-limited run is degraded and must be visible, but it is not data loss:
// the queue remains persisted for the next scheduled execution.
if (conclusion === 'failed') process.exit(1);
