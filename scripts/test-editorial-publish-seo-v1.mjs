import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const plan=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/manifest.json','utf8'));
for(const pack of plan.packages)pack.items=(pack.files||[]).flatMap(file=>JSON.parse(fs.readFileSync(`apps/portal/data/editorial-plan/${file}`,'utf8')));
assert.ok(plan.packages.length>=2,`expected at least 2 packages, found ${plan.packages.length}`);
const registry=JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json','utf8'));
const quoteDescription=registry.items.find(item=>item.path==='/komentari/rutina-koja-postane-nevidljiva/')?.description||'';
assert.ok(quoteDescription.length>=80&&quoteDescription.length<=200,'SEO description parser must preserve quoted text and keep the description within 80-200 characters');
assert.ok(quoteDescription.includes('tako radimo'),'apostrophes inside a quoted meta attribute must not truncate the registry description');
for(const pack of plan.packages){
  assert.ok(pack.items.length>=1,`${pack.id} needs at least 1 daily editorial item`);
  assert.ok(pack.items.every(x=>x.type==='objava'||x.type==='komentar'),`${pack.id} contains unsupported editorial item type`);
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
const oct9=plan.packages.flatMap(pack=>pack.items).find(item=>item.slug==='sastanak-bez-odluke-nije-neuspjeh-ali-mora-biti-svjestan');
assert.ok(oct9,'Oct 9 commentary must remain in editorial plan');
assert.equal(oct9.image,'/assets/gallery/sastanak-bez-odluke-20261009.svg','Oct 9 commentary must keep its dedicated topic image');
assert.equal(oct9.headings?.length,8,'Oct 9 commentary must keep explicit editorial section headings');
assert.equal(new Set(oct9.headings).size,oct9.headings.length,'Oct 9 editorial section headings must be unique');
const oct9Html=fs.readFileSync('apps/portal/komentari/sastanak-bez-odluke-nije-neuspjeh-ali-mora-biti-svjestan/index.html','utf8');
const oct9Cover=oct9Html.match(/<img class="article-cover" src="([^"]+)"[^>]*>/)?.[1]||'';
assert.match(oct9Cover,/^\/assets\/editorial\/generated\/komentari-sastanak-bez-odluke-nije-neuspjeh-ali-mora-biti-svjestan-[a-f0-9]+\.webp$/,'published Oct 9 page must use its dedicated original topic illustration');
assert.ok(fs.existsSync(`apps/portal${oct9Cover}`),'published Oct 9 original illustration asset must exist');
assert.match(oct9Html,/alt="Urednička ilustracija za tekst: Sastanak bez odluke nije neuspjeh, ali mora biti svjestan izbor"/,'published Oct 9 illustration must have descriptive alt text');
assert.ok((oct9Html.match(/<h2>Zaključak<\/h2>/g)||[]).length<=1,'published Oct 9 page must not repeat Zaključak headings');

const publisher=fs.readFileSync('scripts/editorial-publish-scheduled-v1.mjs','utf8');

for(const marker of ['GNK_ASG_EDITORIAL_SCHEDULED_PUBLISH_V4_ATTRIBUTION','OpinionNewsArticle','application/ld+json','rel="canonical"','property="og:title"','name="twitter:card"','name="editor"','Urednička odgovornost','EDITORIAL_NOW','deployApproved','writeIfChanged','summary.publicChanged || summary.stateChanged','publication-holds.json','publicationHeld','summary.held','articleAuthorFor(item)','isProtectedEditorialRoute(route)','isVerifiedNerminAuthor(item)','const cardImage = articleImage(item).path','headings[index - 1]'])assert.ok(publisher.includes(marker),marker);
assert.doesNotMatch(publisher,/hashtagsFor|article-hashtags|AUTHOR_TAGS|GROUP_ENTITY/,'scheduled articles must not inject social hashtags or author/group keywords');

// Scheduled publication must append cards to both legacy and generated static listings.
const appendCardStart=publisher.indexOf('function appendCard(');
const appendCardEnd=publisher.indexOf(String.fromCharCode(10)+'function appendEditorialListingCard(',appendCardStart);
assert.ok(appendCardStart>=0&&appendCardEnd>appendCardStart,'publisher must expose collection-card integration');
const routeForCardTest=item=>`/${item.type==='objava'?'objave':'komentari'}/${item.slug}/`;
const authorImageForCardTest=publisher.match(/const AUTHOR_IMAGE\s*=\s*'([^']+)'/)?.[1];
assert.ok(authorImageForCardTest,'publisher must keep a canonical portrait for verified personal bylines only');
const escapeCardTest=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const writeCardIfChangedTest=(file,content)=>{
  if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===content)return false;
  fs.writeFileSync(file,content);return true;
};
const appendCard=vm.runInNewContext(`(${publisher.slice(appendCardStart,appendCardEnd)})`,{
  fs,articleImage:item=>({path:item.image||'/assets/gnk-asg-social-card.png'}),routeFor:routeForCardTest,esc:escapeCardTest,writeIfChanged:writeCardIfChangedTest,
});
const listingTmp=fs.mkdtempSync(path.join(os.tmpdir(),'gnk-scheduled-grid-test-'));
try{
  const generatedListing=fs.readFileSync('apps/portal/objave/index.html','utf8');
  assert.ok(generatedListing.includes('data-static-editorial-listing="v1"'),'fixture must use generated static-listing markup');
  const generatedFile=path.join(listingTmp,'generated.html');
  fs.writeFileSync(generatedFile,generatedListing);
  const sample={type:'objava',slug:'scheduled-grid-regression',title:'Scheduled & <test>',section:'Publication scheduling',summary:'A safe <summary>.',image:'/assets/editorial/test.svg'};
  assert.equal(appendCard(generatedFile,sample),true,'generated listing with attributes must accept a scheduled card');
  const generatedAfter=fs.readFileSync(generatedFile,'utf8');
  assert.ok(generatedAfter.includes('<h2>Scheduled &amp; &lt;test&gt;</h2>'),'scheduled title must be escaped');
  assert.ok(generatedAfter.includes('<p>A safe &lt;summary&gt;.</p>'),'scheduled summary must be escaped');
  assert.equal(generatedAfter.split('href="/objave/scheduled-grid-regression/"').length-1,1,'scheduled route must be linked exactly once');
  assert.equal(appendCard(generatedFile,sample),false,'repeat append must be a no-op');
  assert.equal(fs.readFileSync(generatedFile,'utf8'),generatedAfter,'idempotent append must not rewrite the listing');

  const legacyFile=path.join(listingTmp,'legacy.html');
  fs.writeFileSync(legacyFile,'<main><section class="editorial-grid"><article>Existing</article></section></main>');
  const legacyItem={type:'komentar',slug:'legacy-grid-regression',title:'Legacy card',section:'Testing',summary:'Compatibility check.'};
  assert.equal(appendCard(legacyFile,legacyItem),true,'legacy exact-class listing must remain supported');
  assert.ok(fs.readFileSync(legacyFile,'utf8').includes('href="/komentari/legacy-grid-regression/"'));

  const missingGridFile=path.join(listingTmp,'missing-grid.html');
  fs.writeFileSync(missingGridFile,'<main>No listing section</main>');
  assert.throws(()=>appendCard(missingGridFile,legacyItem),/Editorial grid markers not found/,'missing listing must fail closed');
  assert.equal(fs.readFileSync(missingGridFile,'utf8'),'<main>No listing section</main>','failed append must not alter the page');

  const routeFnStart=publisher.indexOf('function appendEditorialListingCard(');
  const routeFnEnd=publisher.indexOf(String.fromCharCode(10)+'function appendAktualCard(',routeFnStart);
  assert.ok(routeFnStart>=0&&routeFnEnd>routeFnStart,'publisher must route new cards by editorial type');
  const routedCards=[];
  const routeEditorialCard=vm.runInNewContext(`(${publisher.slice(routeFnStart,routeFnEnd)})`,{
    path,ROOT:listingTmp,appendCard:(file,item)=>{routedCards.push({file,item});return true;},
  });
  assert.equal(routeEditorialCard({type:'objava',slug:'post-route'}),true);
  assert.equal(routedCards.at(-1).file,path.join(listingTmp,'objave','index.html'),'publications belong only in /objave/');
  assert.equal(routeEditorialCard({type:'komentar',slug:'comment-route'}),true);
  assert.equal(routedCards.at(-1).file,path.join(listingTmp,'komentari','index.html'),'commentary belongs in /komentari/');
  const routedCount=routedCards.length;
  assert.equal(routeEditorialCard({type:'analiza',slug:'unsupported-route'}),false,'unsupported editorial types must not enter either listing');
  assert.equal(routedCards.length,routedCount,'unsupported routes must not alter collection lists');
}finally{
  fs.rmSync(listingTmp,{recursive:true,force:true});
}

// Behavioral regression for the current AKTUAL editorial container.
const aktualFixture=fs.readFileSync('apps/portal/gnk-aktual/index.html','utf8');
assert.match(aktualFixture,/<div class="am-editorial-links" id="amEditorialLinks">/);
const aktualFnStart=publisher.indexOf('function appendAktualCard(');
const aktualFnEnd=publisher.indexOf('\nfunction appendSitemap(',aktualFnStart);
assert.ok(aktualFnStart>=0&&aktualFnEnd>aktualFnStart,'publisher must expose AKTUAL integration');
const aktualFnSource=publisher.slice(aktualFnStart,aktualFnEnd);
assert.doesNotMatch(aktualFnSource,/akKomentarIstaknuti|akKomentariGrid/,'publisher must not depend on retired AKTUAL markup');
const aktualTmp=fs.mkdtempSync(path.join(os.tmpdir(),'gnk-aktual-publish-test-'));
try{
  const aktualFile=path.join(aktualTmp,'gnk-aktual','index.html');
  fs.mkdirSync(path.dirname(aktualFile),{recursive:true});
  fs.writeFileSync(aktualFile,aktualFixture);
  const routeForTest=item=>`/${item.type==='objava'?'objave':'komentari'}/${item.slug}/`;
  const escapeTest=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const writeIfChangedTest=(file,content)=>{
    if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===content)return false;
    fs.writeFileSync(file,content);return true;
  };
  const appendAktual=vm.runInNewContext('('+aktualFnSource+')',{
    fs,path,ROOT:aktualTmp,routeFor:routeForTest,esc:escapeTest,writeIfChanged:writeIfChangedTest,
  });
  const sample={type:'komentar',slug:'test-integracija-aktual',title:'Analiza & <provjera>'};
  assert.equal(appendAktual(sample,'2026-10-13T12:00:00+02:00'),true,'first append must modify AKTUAL');
  const first=fs.readFileSync(aktualFile,'utf8');
  assert.ok(first.includes('<a href="/komentari/test-integracija-aktual/" data-published="2026-10-13T12:00:00+02:00">Analiza &amp; &lt;provjera&gt;</a>'),'link must be escaped, correctly routed, and time-stamped');
  assert.equal((first.match(/href="\/komentari\/test-integracija-aktual\//g)||[]).length,1,'new link must occur exactly once');
  assert.equal(appendAktual(sample,'2026-10-13T12:00:00+02:00'),false,'repeat append must be a no-op');
  assert.equal(fs.readFileSync(aktualFile,'utf8'),first,'idempotent call must not rewrite HTML');
  fs.writeFileSync(aktualFile,'<main>No editorial links container</main>');
  assert.throws(()=>appendAktual(sample,'2026-10-13T12:00:00+02:00'),/AKTUAL editorial links container not found/,'missing container must fail closed');
  assert.equal(fs.readFileSync(aktualFile,'utf8'),'<main>No editorial links container</main>','failed append must not alter the page');
}finally{
  fs.rmSync(aktualTmp,{recursive:true,force:true});
}
for(const file of ['apps/portal/data/editorial-plan/publication-holds.json','scripts/seo-visibility-cycle-v1.mjs','scripts/refresh-public-news-v4.mjs','scripts/validate-editorial-content-policy-v1.mjs','scripts/test-editorial-content-policy-v1.mjs','.github/workflows/editorial-scheduled-publish.yml','.github/workflows/seo-news-cycle.yml','.github/workflows/gnk-seo-nightly-audit.yml','.github/workflows/editorial-content-deploy.yml'])assert.ok(fs.existsSync(file)&&fs.statSync(file).size,file);
const holds=JSON.parse(fs.readFileSync('apps/portal/data/editorial-plan/publication-holds.json','utf8'));
assert.match(holds.version,/GNK_ASG_EDITORIAL_PUBLICATION_HOLDS_V(?:1_20260805|2_20260925_RESCHEDULED|3_20260925_DAILY|4_20261005_CLEARED|5_20261010_3000_WORDS_PENDING_POLICY_DECISION|6_20261016_INDEPENDENT_RELEASE_REVIEW)/);
if(holds.version==='GNK_ASG_EDITORIAL_PUBLICATION_HOLDS_V5_20261010_3000_WORDS_PENDING_POLICY_DECISION' ||
  holds.version==='GNK_ASG_EDITORIAL_PUBLICATION_HOLDS_V6_20261016_INDEPENDENT_RELEASE_REVIEW'){
  const required=['EDITORIAL-20261104-WEDNESDAY-SLOT1','EDITORIAL-20261105-THURSDAY-SLOT1','EDITORIAL-20261106-FRIDAY-SLOT1','EDITORIAL-20261107-SATURDAY-SLOT1','EDITORIAL-20261108-SUNDAY-SLOT1'];
  for(const id of required)assert.ok(holds.holds.some(h=>h.packageId===id&&h.active===true),`required future quality hold missing: ${id}`);
  assert.ok(!holds.holds.some(h=>h.packageId==='EDITORIAL-20261010-SATURDAY-SLOT1'&&h.active===true),'published Oct 10 package must not be retroactively held');
  if(holds.version==='GNK_ASG_EDITORIAL_PUBLICATION_HOLDS_V6_20261016_INDEPENDENT_RELEASE_REVIEW'){
    for(const h of holds.holds.filter(h=>h.active)){
      assert.equal(h.releaseAuthorized,false,'an independent review hold must not authorize release');
      assert.ok(h.reviewRequired?.includes('source-fact-attribution'),'source/fact verification must remain active');
      assert.ok(h.reviewRequired?.includes('image-provenance-license-alt-dimensions'),'image rights must remain active');
      assert.ok(!/below temporary|minimum .?\d+.? words/i.test(h.reason),'word counts cannot independently block publishing');
    }
  }
}
assert.ok(Array.isArray(holds.holds),'publication holds must be an array');
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
assert.match(nightlySeoWorkflow,/notify_search_engines:\s*\n\s*description:[^\n]*\n\s*required: true\n\s*type: boolean\n\s*default: false/);
assert.match(nightlySeoWorkflow,/if: github\.event_name == 'workflow_dispatch' && inputs\.notify_search_engines == true/);
assert.match(nightlySeoWorkflow,/name: Manually submit URLs to IndexNow after explicit approval/);

assert.match(scheduler,/actions: write/);
assert.match(scheduler,/gh workflow run deploy-admin-auth-v6\.yml/);
assert.match(scheduler,/confirm_production_deploy=DEPLOY_ADMIN_AUTH_V6/);
assert.match(scheduler,/approved_sha="\$APPROVED_SHA"/);
assert.match(scheduler,/force_deploy/);

assert.match(seoWorkflow,/timeout-minutes: 10/);
assert.match(seoWorkflow,/workflow_dispatch:/);
assert.doesNotMatch(seoWorkflow,/\n  schedule:/);
assert.doesNotMatch(seoWorkflow,/\n  push:/);
assert.match(scheduler,/steps\.commit\.outputs\.changed == 'true'/);
assert.match(scheduler,/git diff --quiet -- apps\/portal\/objave/);
assert.match(scheduler,/node scripts\/editorial-registry-v1\.mjs/);
assert.match(scheduler,/node scripts\/generate-editorial-sitemap-v2\.mjs/);
assert.match(scheduler,/apps\/portal\/sitemap-index\.xml/);
assert.match(scheduler,/apps\/portal\/gnk-aktual/);
assert.match(scheduler,/apps\/portal\/data\/editorial-registry\.json/);
assert.doesNotMatch(scheduler,/github\.event_name == 'push'/);
const registryGenerator=fs.readFileSync('scripts/editorial-registry-v1.mjs','utf8');
assert.match(registryGenerator,/substantiveUnchanged/);
assert.match(registryGenerator,/bez promjene:/);
assert.match(publisher,/Editorial grid markers not found/);
assert.match(publisher,/distributionContract/);
assert.doesNotMatch(publisher,/pack\.author===|authorBox\(item\)|hashtagsFor/,'future scheduled content must not infer personal authorship or inject hashtags');
const regressionIndex=scheduler.indexOf('node scripts/test-editorial-content-policy-v1.mjs');
const policyIndex=scheduler.indexOf('node scripts/validate-editorial-content-policy-v1.mjs');
const materializeIndex=scheduler.indexOf('node scripts/editorial-publish-scheduled-v1.mjs');
assert.ok(regressionIndex>=0&&policyIndex>regressionIndex&&materializeIndex>policyIndex,'policy test and gate must run before materialization');
console.log(JSON.stringify({ok:true,packages:plan.packages.map(x=>({id:x.id,publications:x.items.filter(i=>i.type==='objava').length,commentaries:x.items.filter(i=>i.type==='komentar').length,publishAt:x.publishAt})),seo:{cycleHours:null,scheduleUtc:null,trigger:'manual-only',timeoutMinutes:10,artificialTraffic:false,idempotent:true,readOnly:true,nightlyReadOnly:true},editorialPolicy:{minimumWords:3000,minimumInternalLinks:5,preMaterialization:true,publicationHolds:holds.holds.length},deploy:{directExactShaDispatch:true,noOpScheduleDeploy:false,owner:'editorial-scheduled-publish'}},null,2));
