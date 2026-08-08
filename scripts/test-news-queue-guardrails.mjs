import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');

const retentionPolicy=fs.readFileSync('apps/portal/scripts/refresh_news_policy.py','utf8');
const refreshWorkflow=fs.readFileSync('.github/workflows/news-refresh.yml','utf8');
const indexRefreshPolicy=fs.readFileSync('scripts/refresh_index_live_data.py','utf8');
const indexRefreshWorkflow=fs.readFileSync('.github/workflows/refresh-index-live-data.yml','utf8');

assert.match(retentionPolicy,/PUBLIC_LIMIT = 150/);
assert.match(retentionPolicy,/ARCHIVE_TRIGGER = 2000/);
assert.match(retentionPolicy,/ARCHIVE_DELETE_OLDEST = 1000/);
assert.match(retentionPolicy,/github_actions_rss_refresh_v4_retention_policy/);
assert.doesNotMatch(retentionPolicy,/ARCHIVE_TRIGGER = 1000/);
assert.doesNotMatch(retentionPolicy,/ARCHIVE_DELETE_OLDEST = 500/);
assert.match(refreshWorkflow,/archive_prune_trigger'\) == 2000/);
assert.match(refreshWorkflow,/archive_delete_oldest_batch'\) == 1000/);
assert.match(refreshWorkflow,/len\(archive\) <= 2000/);

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

console.log(JSON.stringify({ok:true,cors:'public-only',dedupe:'canonical-source-url',scheduler:'strict-opt-in',marketNewsOwnership:'single-writer',trackingRemoved:['utm_*','fbclid','gclid','msclkid']},null,2));
