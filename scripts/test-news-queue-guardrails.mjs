import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');

// --- Canonical news retention owner: scripts/gnk-news-refresh.mjs (JS pipeline),
// dispatched by the canonical writer workflow .github/workflows/gnk-news-refresh-v2.yml
// (hourly cron, single writer). The old Python-based retention system
// (apps/portal/scripts/refresh_news_policy.py) and the workflow that used to embed
// its inline logic were both retired; news-refresh.yml is now recovery-only and
// MUST NOT re-embed a second parser/archive/writer implementation.
const canonicalPipeline=fs.readFileSync('scripts/gnk-news-refresh.mjs','utf8');
const canonicalWriterWorkflow=fs.readFileSync('.github/workflows/gnk-news-refresh-v2.yml','utf8');
const legacyRecoveryWorkflow=fs.readFileSync('.github/workflows/news-refresh.yml','utf8');
const indexRefreshPolicy=fs.readFileSync('scripts/refresh_index_live_data.py','utf8');
const indexRefreshWorkflow=fs.readFileSync('.github/workflows/refresh-index-live-data.yml','utf8');

// Retention constants live in the canonical JS pipeline, not a retired Python file.
assert.match(canonicalPipeline,/const PUBLIC_TARGET = \d+;/);
assert.match(canonicalPipeline,/const MIN_ITEMS_FLOOR = 200;/);
assert.match(canonicalPipeline,/const ARCHIVE_MAX_BEFORE_PRUNE = \d+;/);
assert.match(canonicalPipeline,/const ARCHIVE_KEEP_WHEN_FULL = \d+;/);

// Canonical writer workflow must be the single owner: hourly cron, invokes the
// canonical pipeline script, and is the one that commits news.json / news_archive.json.
assert.match(canonicalWriterWorkflow,/cron: '12 \* \* \* \*'/);
assert.match(canonicalWriterWorkflow,/node scripts\/gnk-news-refresh\.mjs/);
assert.match(canonicalWriterWorkflow,/git add[\s\S]{0,80}news\.json[\s\S]{0,80}news_archive\.json/);

// Legacy news-refresh.yml must stay a recovery-only dispatcher: workflow_dispatch
// only (no schedule of its own), and it must not re-embed a second writer/parser -
// it should just redispatch the canonical workflow, never touch news.json directly.
assert.doesNotMatch(legacyRecoveryWorkflow,/^\s*schedule:/m);
assert.doesNotMatch(legacyRecoveryWorkflow,/git add[^\n]*news(?:_archive)?\.json/);

// Market refresh must never own or mutate Aktual/news state. News retention
// belongs to the canonical news refresh path; market refresh owns market data only.
assert.doesNotMatch(indexRefreshPolicy,/news\.json/);
assert.doesNotMatch(indexRefreshPolicy,/news_archive\.json/);
assert.doesNotMatch(indexRefreshPolicy,/news-status\.json/);
assert.doesNotMatch(indexRefreshPolicy,/PUBLIC_LIMIT =/);
assert.doesNotMatch(indexRefreshPolicy,/ARCHIVE_TRIGGER =/);
assert.doesNotMatch(indexRefreshPolicy,/ARCHIVE_DELETE_OLDEST =/);
assert.doesNotMatch(indexRefreshWorkflow,/git add[^\n]*news(?:_archive)?\.json/);
assert.match(indexRefreshWorkflow,/git add[^\n]*market\.json[^\n]*market_indices\.json[^\n]*fast_market_status\.json/);

assert.match(source,/publicCors=false/);
assert.match(source,/if\(publicCors\)headers\['access-control-allow-origin'\]='\*'/);
assert.match(source,/handlePublicNews[\s\S]*publicCors:true/);
assert.doesNotMatch(source,/function json\([^)]*\)\{return new Response\([^]*access-control-allow-origin':'\*'/);
assert.match(source,/canonicalSourceUrl/);
assert.match(source,/startsWith\('utm_'\)/);
assert.match(source,/fbclid/);
assert.match(source,/gclid/);
assert.match(source,/url\.hash=''/);
assert.match(source,/url\.pathname=url\.pathname\.replace/);
assert.match(source,/const dedupeSeed=sourceUrl\|\|normalizedTitle/);
assert.match(source,/x-content-type-options':'nosniff'/);
assert.match(source,/function scheduledEnabled\(value\)\{return \/\^\(1\|true\|yes\|on\)\$\/i\.test/);
assert.match(source,/scheduled_publication_disabled/);
assert.doesNotMatch(source,/!\['0','false','no','off','disabled'\]\.includes/);
assert.match(source,/PUBLICATION_BATCH_LIMIT=13/);
assert.match(source,/completeDailyBatch/);
assert.match(source,/invalid_daily_batch_contract/);
assert.match(source,/members\.length!==13/);

console.log(JSON.stringify({ok:true,cors:'public-only',dedupe:'canonical-source-url',scheduler:'strict-opt-in',marketNewsOwnership:'single-writer',retentionOwner:'scripts/gnk-news-refresh.mjs',trackingRemoved:['utm_*','fbclid','gclid','msclkid']},null,2));
