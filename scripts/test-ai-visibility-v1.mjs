import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const read = path => readFileSync(path,'utf8');
const source=JSON.parse(read('data/ai-visibility/verified-facts.json'));
const publicFacts=JSON.parse(read('apps/portal/ai-visibility/facts.json'));
const spec=JSON.parse(read('apps/portal/ai-visibility/openapi.json'));
assert.equal(source.schemaVersion,'1.0');
assert.equal(publicFacts.reviewedAt,source.reviewedAt);
assert.deepEqual(publicFacts.facts,source.facts);
assert.equal(publicFacts.access,'public read-only');
assert(source.facts.length>=5);
assert.equal(new Set(source.facts.map(f=>f.id)).size,source.facts.length);
for(const f of source.facts){
  assert(f.id && f.subject && f.statement && f.source);
  assert(/^https:\/\/(?:infobiz\.fina\.hr|gnk-asg\.hr)\//.test(f.source),'Unreviewed source domain: '+f.id);
}
assert.equal(spec.servers[0].url,'https://gnk-asg.hr');
assert(spec.paths['/ai-visibility/facts.json'].get.operationId);
const html=read('apps/portal/ai-visibility/index.html');
assert(html.includes('rel="canonical" href="https://gnk-asg.hr/ai-visibility/"'));
assert(html.includes('href="https://infobiz.fina.hr/tvrtka/gnk-asg-d-o-o/OIB-75227917632"'));
assert(html.includes('href="facts.json"'));
const check=spawnSync(process.execPath,['scripts/generate-ai-visibility-v1.mjs','--check'],{encoding:'utf8'});
assert.equal(check.status,0,check.stderr||check.stdout);
console.log('AI visibility source/exports/OpenAPI/SEO/safety: PASS');
