import fs from 'node:fs';
import assert from 'node:assert/strict';

const plan=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/manifest.json','utf8'));
for(const pack of plan.packages)pack.items=(pack.files||[]).flatMap(file=>JSON.parse(fs.readFileSync(`apps/portal/data/editorial-plan/${file}`,'utf8')));
assert.equal(plan.packages.length,2);
for(const pack of plan.packages){
  assert.equal(pack.items.filter(x=>x.type==='objava').length,10,`${pack.id} publications`);
  assert.equal(pack.items.filter(x=>x.type==='komentar').length,3,`${pack.id} commentaries`);
  assert.equal(pack.deployApproved,true);
  for(const item of pack.items){
    assert.match(item.slug,/^[a-z0-9-]+$/);
    assert.ok(item.seoTitle&&item.description&&item.summary&&item.paragraphs?.length>=3);
    assert.ok(item.links?.length>=2);
  }
}
assert.match(plan.packages[0].publishAt,/2026-07-14T20:00:00\+02:00/);
assert.match(plan.packages[1].publishAt,/2026-07-15T08:15:00\+02:00/);

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
for(const marker of ['OpinionNewsArticle','application/ld+json','rel="canonical"','property="og:title"','name="twitter:card"','Urednička odgovornost','EDITORIAL_NOW','deployApproved'])assert.ok(publisher.includes(marker),marker);
for(const file of ['scripts/seo-visibility-cycle-v1.mjs','scripts/refresh-public-news-v4.mjs','.github/workflows/editorial-scheduled-publish.yml','.github/workflows/seo-news-cycle.yml','.github/workflows/editorial-content-deploy.yml'])assert.ok(fs.existsSync(file)&&fs.statSync(file).size,file);
const seo=fs.readFileSync('scripts/seo-visibility-cycle-v1.mjs','utf8');
assert.match(seo,/artificialTraffic:false/);assert.match(seo,/keywordStuffing:false/);
const workflow=fs.readFileSync('.github/workflows/seo-news-cycle.yml','utf8');assert.match(workflow,/timeout-minutes: 10/);assert.match(workflow,/cron: '17 \*\/2 \* \* \*'/);
console.log(JSON.stringify({ok:true,packages:plan.packages.map(x=>({id:x.id,publications:10,commentaries:3,publishAt:x.publishAt})),seo:{cycleHours:2,timeoutMinutes:10,artificialTraffic:false}},null,2));
