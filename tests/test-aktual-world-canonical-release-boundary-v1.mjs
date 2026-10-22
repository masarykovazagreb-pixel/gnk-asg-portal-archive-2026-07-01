import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('Exactly twelve canonical world editions and no fabricated live domains',()=>{
 const c=read('config/control-plane/world-free-portal-network-v1.json');
 assert.equal(c.sourceRepository,'masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01');
 assert.equal(c.sites.length,12);
 assert.equal(new Set(c.sites.map(s=>s.id)).size,12);
 assert.equal(c.noPaidServices,true);
 assert.equal(c.release.state,'STAGING_ONLY');
 assert.equal(c.release.publishDefault,false);
 for(const s of c.sites){
   assert.equal(s.publicUrl,null,'unverified site cannot claim a public address: '+s.id);
   assert.equal(s.publishState,'staged-unverified');
   assert.ok(s.outputDirectory.startsWith('apps/world/site/'));
   assert.equal(s.outputDirectory,'apps/world/site/'+s.id);
   const html=fs.readFileSync(s.outputDirectory+'/index.html','utf8');
   assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
   assert.match(html,/AKTUAL MEDIA/);
   assert.ok(html.includes('https://gnk-asg.hr/gnk-aktual/'));
 }
});
test('World prototypes are strictly separate from the canonical twelve',()=>{
 const c=read('config/control-plane/world-free-portal-network-v1.json');
 const staging=read('config/control-plane/global-150-free-network-v1.json');
 assert.ok(staging.sites.length>=c.sites.length);
 assert.equal(staging.policy.externalPublicationEnabled,false);
 assert.equal(staging.policy.autoApprovalEnabled,false);
 assert.equal(staging.policy.noNewCosts,true);
 assert.equal(staging.policy.hostnamesAreProposedNotVerified,true);
});
test('New staging handoff has no Cloudflare mutation privileges',()=>{
 const yml=fs.readFileSync('.github/workflows/aktual-world-free-release.yml','utf8');
 assert.match(yml,/permissions:\s*\n\s*contents: read/);
 assert.match(yml,/expected_main_sha/);
 assert.doesNotMatch(yml,/wrangler|pages deploy|CLOUDFLARE_API_TOKEN|CF_TOKEN|create.cloudflare|secrets.CLOUDFLARE/i);
 assert.doesNotMatch(yml,/\n\s+schedule:/);
});
