// GNK ASG — Automatizacija i Mediji: granice svježine, zastarjeli zapisi i integritet stranica.
// Pokretanje: node --test apps/portal/tests/automation-mediji.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const A = require('../automation-status/automation-status.js');
const M = require('../mediji/mediji.js');
const news = JSON.parse(await readFile(new URL('../data/news-automation-status.json', import.meta.url), 'utf8'));
const fresh = JSON.parse(await readFile(new URL('../data/freshness-status.json', import.meta.url), 'utf8'));
const mediaStatus = JSON.parse(await readFile(new URL('../data/media_monitor_status.json', import.meta.url), 'utf8'));
const mediaQueries = JSON.parse(await readFile(new URL('../data/media_queries.json', import.meta.url), 'utf8'));
const approved = JSON.parse(await readFile(new URL('../data/approved_mentions.json', import.meta.url), 'utf8'));
const autoPage = await readFile(new URL('../automation-status/index.html', import.meta.url), 'utf8');
const mediaPage = await readFile(new URL('../mediji/index.html', import.meta.url), 'utf8');
const autoUi = await readFile(new URL('../automation-status/automation-status-ui.js', import.meta.url), 'utf8');
const mediaUi = await readFile(new URL('../mediji/mediji-ui.js', import.meta.url), 'utf8');

const MIN = 60000;
const NOW = Date.parse('2026-10-09T10:00:00Z');

test('ageState: boundary at exactly the allowed age is fresh, one minute over is stale', () => {
  const at = new Date(NOW - 60 * MIN).toISOString();
  assert.deepEqual(A.ageState(at, 60, NOW), { state: 'fresh', ageMinutes: 60 });
  const over = new Date(NOW - 61 * MIN).toISOString();
  assert.equal(A.ageState(over, 60, NOW).state, 'stale');
});

test('ageState: missing, invalid or missing limit is unknown, never fresh', () => {
  assert.equal(A.ageState(undefined, 60, NOW).state, 'unknown');
  assert.equal(A.ageState('not-a-date', 60, NOW).state, 'unknown');
  assert.equal(A.ageState(new Date(NOW).toISOString(), undefined, NOW).state, 'unknown');
});

test('summarize: a stale news feed is never reported as overall fresh, even when its own status says ok', () => {
  const staleNews = { ...news, ok: true, status: 'refreshed', updated_at: new Date(NOW - 1000 * MIN).toISOString(), freshness_sla_minutes: 290 };
  const s = A.summarize(staleNews, fresh, NOW);
  assert.equal(s.news.state, 'stale');
  assert.equal(s.overall, 'stale');
  assert.notEqual(s.overallLabel, 'Svježe');
});

test('summarize: a resource marked "fresh" in the file is stale when its timestamp is too old', () => {
  const f = { resources: { weather: { name: 'Weather', state: 'fresh', observedAt: new Date(NOW - 500 * MIN).toISOString(), maxAgeMinutes: 420, sourceState: 'live' } } };
  const s = A.summarize(news, f, NOW);
  assert.equal(s.rows[0].state, 'stale', 'the file state field must not be trusted');
  assert.equal(s.overall, 'stale');
});

test('summarize: repository snapshot is fresh shortly after its generation time', () => {
  const s = A.summarize(news, fresh, Date.parse(news.updated_at) + 5 * MIN);
  assert.equal(s.news.state, 'fresh');
  assert.equal(s.rows.length, Object.keys(fresh.resources).length);
  assert.ok(s.rows.every((r) => r.state === 'fresh' || r.state === 'unknown'), JSON.stringify(s.rows.map((r) => [r.key, r.state])));
});

test('formatAge: readable minutes and hours', () => {
  assert.equal(A.formatAge(null), 'nepoznato');
  assert.equal(A.formatAge(45), '45 min');
  assert.equal(A.formatAge(130), '2 h 10 min');
  assert.equal(A.formatAge(120), '2 h');
});

test('media: last run 31 May 2026 is stale on 9 Oct 2026 and is never shown as current', () => {
  const now = Date.parse('2026-10-09T10:00:00Z');
  const st = M.monitorState(mediaStatus, now, M.DEFAULT_MAX_AGE_DAYS);
  assert.equal(st.state, 'stale');
  assert.ok(st.ageDays > 100, `age ${st.ageDays}`);
});

test('media: errors or non-ok status become error, missing data becomes unknown', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  assert.equal(M.monitorState({ status: 'ok', updated_at: '2026-05-31T19:00:00Z', errors_count: 2 }, now).state, 'error');
  assert.equal(M.monitorState({ status: 'failed', updated_at: '2026-05-31T19:00:00Z', errors_count: 0 }, now).state, 'error');
  assert.equal(M.monitorState(null, now).state, 'unknown');
  assert.equal(M.monitorState({ status: 'ok', updated_at: 'nope' }, now).state, 'unknown');
  assert.equal(M.monitorState({ status: 'ok', updated_at: '2026-05-31T19:00:00Z', errors_count: 0 }, Date.parse('2026-06-10T00:00:00Z')).state, 'fresh');
});

test('media: query summary counts the real configuration; approvals are recorded', () => {
  const q = M.queriesSummary(mediaQueries);
  assert.equal(q.subjectCount, 3);
  assert.equal(q.queryCount, 8);
  // Owner approved all author-box articles on 2026-10-09 (see approved_mentions.json).
  assert.equal(M.approvedCount(approved), approved.approved_urls.length);
  assert.ok(approved.approved_by && approved.approved_on, 'approval must name approver and date');
});

test('pages: strict CSP and no inline executable script on both pages', () => {
  for (const [name, html] of [['automation', autoPage], ['mediji', mediaPage]]) {
    assert.match(html, /script-src 'self'/, name);
    assert.ok(!/script-src[^"]*unsafe-/.test(html), name);
    const inline = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(inline), `${name}: inline script`);
  }
});

test('pages: every id the UI writes to exists in the page', () => {
  for (const [html, js, name] of [[autoPage, autoUi, 'automation'], [mediaPage, mediaUi, 'mediji']]) {
    for (const m of js.matchAll(/\$\('([^']+)'\)/g)) {
      assert.ok(html.includes(`id="${m[1]}"`), `${name}: missing id ${m[1]}`);
    }
  }
});

test('sources: no HTML injection, no eval, no storage in the UI and modules', async () => {
  const libs = [
    await readFile(new URL('../automation-status/automation-status.js', import.meta.url), 'utf8'),
    await readFile(new URL('../mediji/mediji.js', import.meta.url), 'utf8'),
    autoUi, mediaUi
  ];
  for (const src of libs) {
    assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/.test(src));
    assert.ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket/.test(src));
  }
});
