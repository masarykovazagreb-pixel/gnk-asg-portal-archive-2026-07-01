#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { publishedItems } from './lib/publication-gate-v2.mjs';

const ROOT = process.cwd();
const REGISTRY = resolve(ROOT, 'apps/portal/data/editorial-registry.json');
const QUEUE = resolve(ROOT, 'apps/portal/data/blog-content/queue.json');
const STATE = resolve(ROOT, 'apps/portal/data/blog-content/published.json');
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

function currentPublicationState() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {} });
  const items = publishedItems(registry);
  const posted = state && typeof state.posted === 'object' && state.posted ? state.posted : {};
  const pending = items.filter((item) => item?.path && !posted[item.path]).length;
  return {
    registryTotal: items.length,
    publishedTotal: Object.keys(posted).length,
    pending
  };
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
  const nonQuotaFailure = failures.some((failure) => !String(failure.error || '').includes('blogger_429'));
  const configurationFailure = finalQueue.mode !== 'live' || finalQueue.credentialsPresent !== true;
  const operationalFailure = Boolean(result.error) || result.status !== 0 || configurationFailure || nonQuotaFailure;

  attempts.push({
    attempt,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    publisherMode: finalQueue.mode || 'unknown',
    credentialsConfigured: finalQueue.credentialsPresent === true,
    posted: Array.isArray(finalQueue.posted) ? finalQueue.posted.length : 0,
    failed: failures.length,
    quotaLimited,
    operationalFailure,
    stdoutTail: String(result.stdout || '').slice(-1000),
    stderrTail: String(result.stderr || result.error || '').slice(-1000)
  });

  if (operationalFailure) {
    conclusion = 'failed';
    break;
  }

  if (!quotaLimited) {
    conclusion = 'healthy';
    break;
  }

  conclusion = 'degraded-quota';
  if (attempt < MAX_ATTEMPTS) await sleep(BASE_BACKOFF_MS * (2 ** (attempt - 1)));
}

const publicationState = currentPublicationState();
const health = {
  version: 'GNK_ASG_BLOG_PUBLISH_HEALTH_V2',
  generatedAt: new Date().toISOString(),
  destination: 'Blogger / Aktual Media mirror',
  conclusion,
  pending: publicationState.pending,
  registryTotal: publicationState.registryTotal,
  publishedTotal: publicationState.publishedTotal,
  publisherMode: finalQueue?.mode || 'unknown',
  credentialsConfigured: finalQueue?.credentialsPresent === true,
  attempts,
  policy: {
    perRun: Number(process.env.BLOG_PER_RUN || 3),
    pauseMs: Number(process.env.BLOG_PAUSE_MS || 15000),
    maxAttempts: MAX_ATTEMPTS,
    exponentialBackoffBaseMs: BASE_BACKOFF_MS,
    singleWriterRequired: true,
    missingCredentialsFailClosed: true
  }
};

writeJson(HEALTH, health);
console.log(JSON.stringify(health, null, 2));

if (conclusion === 'failed') process.exit(1);
