import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/refresh-index-live-data.yml','utf8');
const guard=JSON.parse(fs.readFileSync('ops/digital-assets-single-writer-guard-v1.json','utf8'));

assert.match(workflow,/cron:\s*'5 7,15 \* \* \*'/);
assert.match(workflow,/python scripts\/test_index_live_data_cadence_v1\.py/);
assert.match(workflow,/python scripts\/validate_index_live_data\.py/);
assert.match(workflow,/python apps\/portal\/scripts\/refresh_market_satellites\.py/);
assert.match(workflow,/python apps\/portal\/scripts\/update_reference_assets\.py/);
assert.doesNotMatch(workflow,/git rebase/);

assert.equal(guard.canonicalWriter.type,'github-actions');
assert.equal(guard.canonicalWriter.workflow,'.github/workflows/refresh-index-live-data.yml');
assert.equal(guard.canonicalWriter.targetCadence,'2x daily');

const expected=[
  'apps/portal/data/market.json',
  'apps/portal/data/market_indices.json',
  'apps/portal/data/fast_market_status.json',
  'apps/portal/data/stablecoins.json',
  'apps/portal/data/btc_chart.json',
  'apps/portal/data/exchange_compare.json',
  'apps/portal/data/stock_exchanges.json',
  'apps/portal/data/asg_gold_asset.json',
  'apps/portal/data/reference_assets_status.json'
];
for(const file of expected)assert.ok(guard.canonicalWriter.writes.includes(file),`Missing canonical market output: ${file}`);
assert.ok(!guard.canonicalWriter.writes.includes('apps/portal/data/news.json'));
assert.ok(!guard.canonicalWriter.writes.includes('apps/portal/data/news_archive.json'));
assert.ok(guard.legacyPaths.every(item=>item.status==='legacy-hold'));
assert.ok(guard.legacyPaths.some(item=>item.path==='apps/portal/.github/workflows/fast-market-update.yml'));
assert.ok(guard.rules.some(rule=>rule.includes('nested apps/portal/.github/workflows/fast-market-update.yml')));
assert.ok(guard.rules.some(rule=>rule.includes('do not rebase generated state')));

console.log(JSON.stringify({
  ok:true,
  canonicalWriter:guard.canonicalWriter.workflow,
  cadence:guard.canonicalWriter.targetCadence,
  outputs:guard.canonicalWriter.writes,
  legacyPaths:guard.legacyPaths.map(item=>item.path)
},null,2));
