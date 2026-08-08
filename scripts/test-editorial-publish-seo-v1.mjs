import fs from 'node:fs';
import assert from 'node:assert/strict';

const plan=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/manifest.json','utf8'));
for(const pack of plan.packages)pack.items=(pack.files||[]).flatMap(file=>JSON.parse(fs.readFileSync(`apps/portal/data/editorial-plan/${file}`,'utf8')));
assert.ok(plan.packages.length>=2,`expected at least 2 packages, found ${plan.packages.length}`);
for(const pack of plan.packages){
  assert.ok(pack.items.filter(x=>x.type==='objava').length>=1,`${pack.id} needs at least 1 objava`);
  assert.ok(pack.deployApproved,true);
  const strictParagraphs=!pack.publishedAt;
  for(const item of pack.items){
    assert.match(item.slug,/^[a-z0-9-]+$/);
    assert.ok(item.seoTitle&&item.description&&item.summary&&item.paragraphs?.length>=1);
    if(strictParagraphs)assert.ok(item.paragraphs.length>=3,`${pack.id}/${item.slug} needs >=3 paragraphs before first publish`);
    assert.ok(item.links?.length>=1);
    if(strictParagraphs)assert.ok(item.links.length>=2,`${pack.id}/${item.slug} needs >=2 links before first publish`);
  }
}
assert.ok(plan.packages.every(p=>typeof p.publishAt==='string'&&p.publishAt.length>0),'every package needs a publishAt');

const immediate=plan.packages[0];
if(immediate.publishedAt){
  for(const item of immediate.items){
    const file=`apps/portal/${item.type==='objava'?'objave':'komentari'}/${item.slug}/index.html`;
    assert.ok(fs.existsSync(file),file);
    const html=fs.readFileSync(file,'utf8');
    for(const marker of ['rel="canonical"','property="og:title"','name="twitter:card"','application/ld+json','<h1>','Urednička odgovornost'])assert.ok(html.includes(marker),`${file}: ${marker}`);
  }
}
const publisher=fs.readFileSync('scripts/editorial-publish-scheduled-v1.mjs','utf8');
for(const marker of ['GNK_ASG_EDITORIAL_SCHEDULED_PUBLISH_V3_20260714','OpinionNewsArticle','application/ld+json','rel="canonical"','property="og:title"','name="twitter:card"','Urednička odgovornost','EDITORIAL_NOW','deployApproved','writeIfChanged','summary.publicChanged||summary.stateChanged','publication-holds.json','publicationHeld','summary.held'])assert.ok(publisher.includes(marker),marker);
for(const file of ['apps/portal/data/editorial-plan/publication-holds.json','scripts/seo-visibility-cycle-v1.mjs','scripts/refresh-public-news-v4.mjs','scripts/validate-editorial-content-policy-v1.mjs','scripts/test-editorial-content-policy-v1.mjs','.github/workflows/editorial-scheduled-publish.yml','.github/workflows/seo-news-cycle.yml','.github/workflows/gnk-seo-nightly-audit.yml','.github/workflows/editorial-content-deploy.yml'])assert.ok(fs.existsSync(file)&&fs.statSync(file).size,file);
const holds=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/publication-holds.json','utf8'));
assert.match(holds.version,/GNK_ASG_EDITORIAL_PUBLICATION_HOLDS_V1_20260805/);
assert.ok(Array.isArray(holds.holds)&&holds.holds.length>=1,'expected active editorial publication holds');
for(const hold of holds.holds){
  assert.ok(hold.packageId&&hold.active===true&&String(hold.reason||'').length>=20,`invalid publication hold: ${JSON.stringify(hold)}`);
  assert.ok(plan.packages.some(pack=>pack.id===hold.packageId),`publication hold references unknown package: ${hold.packageId}`);
}
const policy=fs.readFileSync('scripts/validate-editorial-content-policy-v1.mjs','utf8');
for(const marker of ['GNK_ASG_EDITORIAL_CONTENT_POLICY_V1_20260805','EDITORIAL_POLICY_CUTOFF','EDITORIAL_MIN_WORDS','EDITORIAL_MIN_INTERNAL_LINKS','digital-workforce-worker','EDITORIAL_HOLDS_PATH','activePublicationHolds'])assert.ok(policy.includes(marker),marker);
const seo=fs.readFileSync('scripts/seo-visibility-cycle-v1.mjs','utf8');
assert.match(seo,/GNK_ASG_SEO_VISIBILITY_CYCLE_V2_20260714/);
assert.match(seo,/artificialTraffic:false/);
assert.match(seo,/keywordStuffing:false/);
assert.match(seo,/idempotent:true/);
assert.match(seo,/existingLastmod/);
assert.match(seo,/writeIfChanged/);
const news=fs.readFileSync('scripts/refresh-public-news-v4.mjs','utf8');
assert.match(news,/GNK-ASG-News-Refresh\/4\.1/);
assert.match(news,/previousByKey/);
assert.match(news,/statusChanged/);
assert.match(news,/writeIfChanged/);

const seoWorkflow=fs.readFileSync('.github/workflows/seo-news-cycle.yml','utf8');
const nightlySeoWorkflow=fs.readFileSync('.github/workflows/gnk-seo-nightly-audit.yml','utf8');
const scheduler=fs.readFileSync('.github/workflows/editorial-scheduled-publish.yml','utf8');

for(const source of [seoWorkflow,nightlySeoWorkflow]){
  assert.match(source,/contents: read/);
  assert.doesNotMatch(source,/contents: write/);
  assert.doesNotMatch(source,/actions: write/);
  assert.doesNotMatch(source,/git push(?:\s+origin)?(?:\s+HEAD:main|\s+origin\s+main)?/);
  assert.doesNotMatch(source,/gh workflow run deploy-admin-auth-v6\.yml/);
}
assert.doesNotMatch(nightlySeoWorkflow,/blog-publish-resilient-v1\.mjs/);
assert.doesNotMatch(nightlySeoWorkflow,/BLOGGER_CLIENT_SECRET/);
assert.match(nightlySeoWorkflow,/Spremi SEO izvještaj kao artifact/);
assert.match(nightlySeoWorkflow,/IndexNow \(notification-only\)/);

assert.match(scheduler,/actions: write/);
assert.match(scheduler,/gh workflow run deploy-admin-auth-v6\.yml/);
assert.match(scheduler,/confirm_production_deploy=DEPLOY_ADMIN_AUTH_V6/);
assert.match(scheduler,/approved_sha="\$APPROVED_SHA"/);
assert.match(scheduler,/force_deploy/);

assert.match(seoWorkflow,/timeout-minutes: 10/);
assert.match(seoWorkflow,/cron: '17 9 \* \* \*'/);
assert.doesNotMatch(seoWorkflow,/cron: '17 \*\/2 \* \* \*'/);
assert.doesNotMatch(seoWorkflow,/\n  push:/);
assert.match(scheduler,/steps\.commit\.outputs\.changed == 'true'/);
assert.match(scheduler,/github\.event_name == 'push'/);
assert.match(scheduler,/git diff --quiet -- apps\/portal\/objave/);
const regressionIndex=scheduler.indexOf('node scripts/test-editorial-content-policy-v1.mjs');
const policyIndex=scheduler.indexOf('node scripts/validate-editorial-content-policy-v1.mjs');
const materializeIndex=scheduler.indexOf('node scripts/editorial-publish-scheduled-v1.mjs');
assert.ok(regressionIndex>=0&&policyIndex>regressionIndex&&materializeIndex>policyIndex,'policy test and gate must run before materialization');
console.log(JSON.stringify({ok:true,packages:plan.packages.map(x=>({id:x.id,publications:x.items.filter(i=>i.type==='objava').length,commentaries:x.items.filter(i=>i.type==='komentar').length,publishAt:x.publishAt})),seo:{cycleHours:24,scheduleUtc:'17 9 * * *',timeoutMinutes:10,artificialTraffic:false,idempotent:true,readOnly:true,nightlyReadOnly:true},editorialPolicy:{minimumWords:3000,minimumInternalLinks:5,preMaterialization:true,publicationHolds:holds.holds.length},deploy:{directExactShaDispatch:true,noOpScheduleDeploy:false,owner:'editorial-scheduled-publish'}},null,2));
