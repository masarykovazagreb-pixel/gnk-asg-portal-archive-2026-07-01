import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build,ROOT } from '../apps/world-network/engine/build.mjs';
const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'config/control-plane/global-150-free-network-v1.json'),'utf8'));
assert.equal(registry.sites.length,15);
assert.equal(registry.agents.length,150);
assert.equal(registry.policy.paidApis,false);
assert.equal(registry.policy.externalPublicationEnabled,false);
assert.equal(registry.policy.autoApprovalEnabled,false);
assert.equal(registry.policy.reviewWindowMinutes,30);
assert.equal(registry.policy.reviewWindowBeginsOnlyAfterVerifiedDelivery,true);
const ids=new Set(registry.agents.map(x=>x.id));
assert.equal(ids.size,150);
assert.equal(registry.agents.filter(x=>x.scope==='platform').length,20);
assert.equal(registry.agents.filter(x=>x.scope==='regional').length,40);
assert.equal(registry.agents.filter(x=>x.scope==='world').length,90);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gnk-world-free-test-'));
try{
 const report=build({out:temp});
 assert.equal(report.sites,15);
 assert.equal(report.agents,150);
 assert.equal(report.published,false);
 for(const site of registry.sites){
  const dir=path.join(temp,site.id);
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const art=fs.readFileSync(path.join(dir,'assets/hero.svg'),'utf8');
  const state=JSON.parse(fs.readFileSync(path.join(dir,'status.json'),'utf8'));
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/property="og:site_name" content="AKTUAL MEDIA"/);
  assert.match(html,/name="twitter:card"/);
  assert.ok(html.includes('lang="'+site.lang+'"'));
  assert.ok(html.includes('Nermin Sefić'));
  assert.ok(html.includes('GNK ASG d.o.o.'));
  assert.ok(html.includes('https://gnk-asg.hr/gnk-aktual/'));
  assert.ok(html.includes('https://'+site.draftHost+'/'));
  assert.equal(state.state,'PREVIEW_NOT_DEPLOYED');
  assert.equal(state.articlesPublished,0);
  assert.ok(art.length>1500,'artwork too small: '+site.id);
  assert.match(art,/EDITORIAL NETWORK/);
  assert.ok(site.sourceLinks.length>=2);
  for(const source of site.sourceLinks){
   assert.ok(html.includes(source.url),'missing source link: '+source.url);
   assert.equal(new URL(source.url).protocol,'https:');
  }
  assert.match(fs.readFileSync(path.join(dir,'robots.txt'),'utf8'),/Disallow: \//);
 }
 console.log('PASS: 150 budget-safe roles, 15 language-aware world portal previews, artwork, citations, noindex publication hold');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
