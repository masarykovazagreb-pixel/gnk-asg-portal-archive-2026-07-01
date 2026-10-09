// GNK ASG Public Status Center — testovi i integritetni guard.
// Pokretanje: node --test apps/portal/tests/public-status-center.test.mjs
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { test } from 'node:test';

const run = promisify(execFile);
const root = new URL('../../../', import.meta.url);
const snapshotPath = new URL('apps/portal/data/public_service_status.json', root);
const pageHtml = await readFile(new URL('apps/portal/status/index.html', root), 'utf8');
const statusJs = await readFile(new URL('apps/portal/status/status.js', root), 'utf8');
const snapshotRaw = await readFile(snapshotPath, 'utf8');
const snapshot = JSON.parse(snapshotRaw);

const ALLOWED_TOP = ['schemaVersion', 'generatedAt', 'snapshotType', 'overallStatus', 'notice', 'services', 'quality', 'freshness', 'notMonitored', 'knownLimitations', 'history'];

test('Snapshot: only allowlisted top-level fields and a repository-snapshot type', () => {
  for (const key of Object.keys(snapshot)) assert.ok(ALLOWED_TOP.includes(key), `unexpected field: ${key}`);
  assert.equal(snapshot.snapshotType, 'repository-snapshot');
  assert.ok(['operational', 'degraded'].includes(snapshot.overallStatus));
  assert.match(snapshot.notice, /not a live uptime guarantee/);
});

test('Snapshot: service catalogue is complete and every status is operational or degraded', () => {
  const ids = snapshot.services.map((s) => s.id);
  for (const required of ['portal', 'developer-tools', 'data-clinic', 'methodology-library', 'public-status']) {
    assert.ok(ids.includes(required), `missing service ${required}`);
  }
  for (const s of snapshot.services) {
    assert.ok(['operational', 'degraded'].includes(s.status), `${s.id}: ${s.status}`);
    assert.deepEqual(Object.keys(s).sort(), ['checkedAt', 'id', 'name', 'status']);
  }
});

test('Snapshot: overall status is degraded whenever a check fails', () => {
  const anyDegraded = snapshot.services.some((s) => s.status !== 'operational')
    || snapshot.quality.sitemapMissingLocalFiles > 0
    || snapshot.quality.jsonLdInvalidPages > 0
    || snapshot.freshness.mediaIntelligence.status === 'stale';
  assert.equal(snapshot.overallStatus === 'degraded', anyDegraded);
});

test('Snapshot: Adria Pay and live uptime are explicitly marked as not monitored', () => {
  const ids = snapshot.notMonitored.map((n) => n.id);
  assert.ok(ids.includes('adria-pay'));
  assert.ok(ids.includes('live-uptime'));
  assert.ok(ids.includes('organism-heartbeat'));
});

test('Snapshot: contains no e-mail, IP, IBAN, path, secret or infrastructure detail', () => {
  const forbidden = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    /\bHR\d{2}\s?\d{4}/,
    /\/home\/|\/Users\//,
    /(?:secret|token|password|passwd|api[_-]?key)\s*[:=]/i,
    /\.workers\.dev|\.e2b\.app|cloudflare/i,
    /PAN|CVC|payment_?token/i
  ];
  for (const re of forbidden) assert.doesNotMatch(snapshotRaw, re, `forbidden pattern: ${re}`);
});

test('Snapshot: generator --check passes and is deterministic in shape', async () => {
  const { stdout } = await run(process.execPath, [new URL('scripts/public-status-snapshot-v1.mjs', root).pathname, '--check']);
  assert.match(stdout, /^OK check:/);
});

test('Generator: blocks an unknown field from leaking through the allowlist', async () => {
  const src = await readFile(new URL('scripts/public-status-snapshot-v1.mjs', root), 'utf8');
  assert.match(src, /function allowlist\(obj, keys\)/);
  assert.match(src, /assertSafe\(json\)/);
});

// Integritetni guard ----------------------------------------------------
test('public-status-integrity-guard-v1: page policy, fetch only same origin, accessible structure', () => {
  const cspMeta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(pageHtml);
  assert.ok(cspMeta, 'CSP meta tag required');
  assert.match(cspMeta[1], /connect-src 'self'/);
  assert.match(cspMeta[1], /form-action 'none'/);
  assert.doesNotMatch(cspMeta[1], /unsafe-eval|unsafe-inline/);
  const executableInline = [...pageHtml.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  assert.equal(executableInline.length, 0);
  assert.match(pageHtml, /<caption/, 'service table needs a caption');
  assert.match(pageHtml, /scope="col"/, 'table headers need scope');
  assert.match(pageHtml, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/status\/">/);
  assert.match(pageHtml, /class="dt-skip"/);
  assert.doesNotMatch(statusJs, /XMLHttpRequest|navigator\.sendBeacon|WebSocket|localStorage|sessionStorage|innerHTML|outerHTML|insertAdjacentHTML/);
  const fetches = [...statusJs.matchAll(/fetch\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ['../data/public_service_status.json']);
});
