import fs from 'node:fs';
import assert from 'node:assert/strict';

const news=JSON.parse(fs.readFileSync('apps/portal/data/news.json','utf8'));
assert.ok(Array.isArray(news),'news fallback must be an array');
assert.ok(news.length>=60,`news fallback has ${news.length} items; expected at least 60`);
for(const [index,item] of news.entries()){
  assert.ok(item&&typeof item==='object',`news item ${index} is invalid`);
  assert.ok(String(item.title||'').trim(),`news item ${index} has no title`);
}

const market=JSON.parse(fs.readFileSync('apps/portal/data/market.json','utf8'));
assert.equal(market.status,'ok');
assert.ok(Array.isArray(market.coins),'market coins must be an array');
assert.ok(market.coins.length>=2,`market fallback has ${market.coins.length} coins; expected at least 2`);

const publicAudit=JSON.parse(fs.readFileSync('artifacts/public-portal-audit.json','utf8'));
const routeAudit=JSON.parse(fs.readFileSync('artifacts/worker-route-ownership.json','utf8'));
assert.equal(publicAudit.summary.errors,0);
assert.equal(routeAudit.summary.directDeployConfigRouteLess,true);
assert.equal(routeAudit.directDeployConfig?.file,'workers/gnk-asg-direct-operator/wrangler.workforce-production-no-routes.toml');
assert.equal(routeAudit.directDeployConfig?.main,'src/index-digital-workforce-v1.js');
assert.deepEqual(routeAudit.directDeployConfig?.routes,[]);

console.log(JSON.stringify({
  ok:true,
  newsItems:news.length,
  marketCoins:market.coins.length,
  publicErrors:publicAudit.summary.errors,
  directDeployConfig:routeAudit.directDeployConfig?.file,
  directDeployEntrypoint:routeAudit.directDeployConfig?.main,
  directDeployConfigRouteLess:routeAudit.summary.directDeployConfigRouteLess
},null,2));