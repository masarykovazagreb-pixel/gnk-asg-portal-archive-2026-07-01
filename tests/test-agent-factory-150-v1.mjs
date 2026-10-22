import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planRoles,runFactory} from '../scripts/agent-factory-150-v1.mjs';

const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const regions=json('apps/region/channels.json').channels;
const world=json('config/control-plane/world-free-portal-network-v1.json');
const config=json('config/control-plane/agent-factory-150-v1.json');
const agents=planRoles(regions,world.sites,config);
assert.equal(agents.length,150);
assert.equal(new Set(agents.map(x=>x.id)).size,150);
assert.equal(agents.filter(x=>x.group==='regional').length,96);
assert.equal(agents.filter(x=>x.group==='world').length,48);
assert.equal(agents.filter(x=>x.group==='supervisor').length,6);
assert.equal(new Set(world.sites.map(x=>x.lang)).size>=8,true);
for(const site of world.sites){
 assert.equal(site.publicUrl,null,'never invent live free domain');
 assert.equal(site.publishState,'staged-unverified');
 const content=fs.readFileSync(site.outputDirectory+'/index.html','utf8');
 assert.ok(content.includes('lang="'+site.lang+'"'),'localized lang '+site.id);
 assert.ok(content.includes('name="robots" content="noindex'),'staged sites must not be prematurely indexed');
 assert.ok(content.includes('property="og:image"')&&content.includes('twitter:card'),'social metadata '+site.id);
 assert.ok(content.includes('gnk-asg.hr/gnk-aktual/'),'canonical brand link '+site.id);
 assert.ok(content.includes('Nermin Sefić'),'editor credit '+site.id);
}
const run=runFactory({now:new Date('2026-10-22T12:00:00Z')});
assert.equal(run.rolesExecuted,150);
assert.equal(run.worldPortalsStaged,12);
assert.equal(run.regionalEditions,8);
assert.equal(run.paidApiCalls,0);
assert.equal(run.externalPublications,0);
assert.equal(run.publicUrlsVerified,0);
assert.ok(run.statuses.every(x=>x.status));
assert.equal(run.statuses.filter(x=>x.role==='release-preflight'&&x.status==='hold').length,8);
assert.equal(run.statuses.filter(x=>x.role==='portal-health').length,12);
assert.ok(run.statuses.every(x=>x.group!=='world'||x.evidence.publicUrl!==undefined||x.role!=='portal-health'));
assert.throws(()=>planRoles(regions,world.sites.slice(1),config),/topology mismatch/);
console.log('PASS 150 deterministic role executions + 12 multilingual staged portals + free-tier fences');
