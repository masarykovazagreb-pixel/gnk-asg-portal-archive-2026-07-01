import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=read('config/control-plane/master-asg-150-agent-registry-v1.json');
const sourceNetwork=read('config/control-plane/aktual-editorial-network-v1.json');
const globalSites=read('config/control-plane/aktual-global-12-free-sites-v1.json');
const regions=read('apps/region/channels.json');
const report=read('artifacts/aktual-world-agent-factory/report.json');
const drafts=read('artifacts/aktual-world-agent-factory/review-packets.json');
test('Exactly 150 operational responsibilities across 15 national, 8 regional, and 127 engineering roles',()=>{
 assert.equal(registry.total,150);
 assert.equal(registry.agents.length,150);
 assert.equal(new Set(registry.agents.map(a=>a.id)).size,150);
 assert.equal(registry.agents.filter(a=>a.lane==='national-editorial').length,15);
 assert.equal(registry.agents.filter(a=>a.lane==='regional-editorial').length,8);
 assert.equal(registry.agents.filter(a=>!a.lane.endsWith('editorial')).length,127);
 assert.equal(sourceNetwork.national.sources.length,15);
 assert.equal(regions.channels.length,8);
 assert.equal(report.agents.length,150);
 assert.equal(new Set(report.agents.map(a=>a.id)).size,150);
});
test('No implicit production, payments, paid API or external dispatch privileges',()=>{
 assert.equal(registry.authorizations.directMainWrites,false);
 assert.equal(registry.authorizations.paidAPIs,false);
 assert.equal(sourceNetwork.execution.allowExternalPosting,false);
 assert.equal(sourceNetwork.execution.allowDirectMainWrites,false);
 assert.equal(sourceNetwork.execution.allowProdDeploy,false);
 assert.equal(report.safeguards.noNewPaidAPIs,true);
 assert.equal(report.safeguards.noProductionWrites,true);
 assert.equal(report.safeguards.noExternalPublishing,true);
 assert.equal(report.evidence.unverified.includes('production deploy'),true);
});
test('Twelve localized free static portals built; STAGING, no fake URLs, safe SEO',()=>{
 assert.equal(globalSites.editions.length,12);
 assert.equal(report.siteBundles.length,12);
 assert.equal(new Set(globalSites.editions.map(e=>e.id)).size,12);
 assert.ok(new Set(globalSites.editions.map(e=>e.region)).size>=5);
 for(const edition of globalSites.editions){
   const base=path.join('apps/global-free/sites',edition.id);
   const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
   const css=fs.readFileSync(path.join(base,'style.css'),'utf8');
   const headers=fs.readFileSync(path.join(base,'_headers'),'utf8');
   assert.match(html,new RegExp('<html lang="'+edition.locale+'"'));
   assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
   assert.match(html,/name="description"/);
   assert.match(html,/property="og:title"/);
   assert.match(html,/name="twitter:card"/);
   assert.match(html,/gnk-asg\.hr\/gnk-aktual\//);
   assert.match(html,/gnk-asg\.hr\/izdanja\//);
   assert.match(html,/<img[^>]*alt=/);
   assert.doesNotMatch(html,/rel="canonical"/);
   assert.match(headers,/X-Robots-Tag: noindex/);
   assert.ok(css.length>100);
 }
});
test('All daily packets remain unpublished and do not impersonate personal author',()=>{
 assert.equal(drafts.status,'HOLD');
 const byAgent=new Map();
 for(const c of drafts.candidates){
   assert.equal(c.status,'HOLD_SOURCE_REVIEW');
   assert.equal(c.publicationReady,false);
   assert.equal(c.personalAuthor,null);
   assert.equal(c.quality.reviewedByHuman,false);
   assert.equal(c.quality.originalFullText,false);
   assert.match(c.source.url,/^https:\/\//);
   byAgent.set(c.agent,(byAgent.get(c.agent)||0)+1);
 }
 for(const count of byAgent.values())assert.ok(count<=5);
 assert.ok(drafts.candidates.length<=115);
});
