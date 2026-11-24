#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const load=p=>fs.readFileSync(p,'utf8');
const sources=JSON.parse(load('apps/portal/data/hr-news-sources-v1.json'));
assert.ok(sources.sources.length>=10,'Need 10+ candidate publishers');
const domains=new Set();
for(const s of sources.sources) {
 assert.ok(s.enabled&&s.feed.startsWith('https://')&&s.domain&&s.rights==='external_title_link_only');
 assert.ok(!domains.has(s.domain),'Duplicate publisher domain');
 domains.add(s.domain);
}
assert.ok(!domains.has('hina.hr'),'HINA without a content license must not be scraped');
assert.equal(sources.sources.find(s=>s.name==='HRT Vijesti')?.feed,'https://vijesti.hrt.hr/rss/rss-feed.xml');
assert.ok(sources.sources.find(s=>s.name==='24sata')?.fallbackFeeds?.includes('https://www.24sata.hr/feeds/news.xml'));
assert.ok(sources.sources.every(s=>(s.fallbackFeeds||[]).every(url=>url.startsWith('https://'))));
assert.equal(sources.sources.find(s=>s.name==='tportal')?.feed,'https://www.tportal.hr/rss-najnovije.xml','Use publisher-supported tportal RSS endpoint');
const index=load('apps/portal/news/index.html');
assert.match(index,/<title>HR News/);
assert.match(index,/id="count"/);
assert.match(index,/id="originalItems"/);
assert.match(index,/hr-news-live-v1\.js/);
const client=load('apps/portal/assets/hr-news-live-v1.js');
assert.match(client,/MAX=200/);
assert.match(client,/hr-news-feed-v1\.json/);
assert.match(client,/news_archive\.json/);
assert.match(client,/textContent/);
assert.doesNotMatch(client,/\.innerHTML\s*=/);
const canonical=load('.github/workflows/gnk-news-refresh-v2.yml');
assert.match(canonical,/scripts\/hr-news-refresh-v1\.mjs/);
assert.match(canonical,/scripts\/hr-news-agents-v1\.mjs/);
assert.match(canonical,/git add apps\/portal\/data\/hr-news-feed-v1\.json/);
assert.equal((canonical.match(/cron:/g)||[]).length,1,'No new recurring Actions writers');
const scripts=['scripts/hr-news-refresh-v1.mjs','scripts/hr-news-agents-v1.mjs','scripts/hr-news-one-command-v1.mjs'];
for(const p of scripts){
 const cmd=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
 assert.equal(cmd.status,0,'Syntax failed: '+p+' '+cmd.stderr);
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hr-news-contract-'));
try {
 const paras=Array.from({length:4},(_,i)=>'Izvorni autorski pregled '+(i+1)+': dvije javno dostupne službene stranice daju provjerljive primjere sustava distribuiranja informacija i prava izdavača. Urednička analiza razlikuje činjenice od preporuka te poziva na čitanje izvornika.');
 const sample={slug:'primjer-urednicke-provjere',title:'Kako odgovorno povezivati izvore i provjeravati javne informacije',description:'Primjer uredničkog članka o provjeri izvora i pravilnom povezivanju prema izvornim izdavačima bez preuzimanja njihovih zaštićenih fotografija.',paragraphs:paras,
 approvedForPublication:true,originalWork:true,editorialEvidenceReviewed:true,publishedAt:new Date().toISOString(),hashtags:['#AktualMedia','#HRNews'],
 sources:[{name:'Zakonodavstvo RH',url:'https://zakonodavstvo.gov.hr/rss/394',checkedAt:new Date().toISOString(),factSupported:'Javni službeni izvor objavljuje RSS stranicu.'},{name:'24sata RSS',url:'https://www.24sata.hr/flatpages/rss/',checkedAt:new Date().toISOString(),factSupported:'Izdavač javno navodi RSS kanale za vijesti.'}]};
 const fixture=path.join(tmp,'reviewed.json');fs.writeFileSync(fixture,JSON.stringify(sample));
 const env={...process.env,HR_NEWS_BUILD_ROOT:path.join(tmp,'out')};
 const ok=spawnSync(process.execPath,['scripts/hr-news-one-command-v1.mjs',fixture],{encoding:'utf8',env});
 assert.equal(ok.status,0,'Reviewed publication build failed: '+ok.stderr);
 const html=load(path.join(tmp,'out/news/clanci/'+sample.slug+'/index.html'));
 const svg=load(path.join(tmp,'out/assets/editorial/hr-news/'+sample.slug+'.svg'));
 const generated=JSON.parse(load(path.join(tmp,'out/data/hr-news-original-v1.json')));
 assert.match(html,/NewsArticle/);assert.match(html,/Provjerljivi izvori/);
 assert.ok(html.includes('data-am-design="v1"'),'Approved articles must include shared design tokens');
 assert.ok(html.includes('"@type":"WebSite"'),'Approved articles must include canonical WebSite JSON-LD');
 assert.equal((html.match(/"@type":"WebSite"/g)||[]).length,1,'Original article must have exactly one WebSite JSON-LD');
 assert.match(svg,/<svg/);assert.match(svg,/Izvorna konceptualna ilustracija/);
 assert.equal(generated.items.length,1);
 sample.approvedForPublication=false;fs.writeFileSync(fixture,JSON.stringify(sample));
 const invalid=spawnSync(process.execPath,['scripts/hr-news-one-command-v1.mjs',fixture],{encoding:'utf8',env});
 assert.notEqual(invalid.status,0,'Unapproved report unexpectedly published');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
console.log(JSON.stringify({ok:true,hrNews:true,publishers:sources.sources.length,maxExternalLinks:200,operationalProcessors:10,targetOriginalReportsPerDay:20,publishRequiresReviewedOriginal:true,isolatedBuildTest:true}));

// Corporate network SEO must remain semantic: no fabricated parent-child corporate links.
const networkHtml=load('apps/portal/poslovna-mreza/index.html');
for(const name of ['GNK ASG','GNK DINAMO Ltd.','AKTUAL MEDIA','Sports Performance Tracking','Omega Holding Beograd','Organa','Geotehnika Eko','Nermin Sefić']) assert.ok(networkHtml.includes(name),'Missing entity '+name);
assert.match(load('apps/portal/index.html'),/href="\/poslovna-mreza\/"/);
assert.match(load('apps/portal/sitemap.xml'),/https:\/\/gnk-asg\.hr\/poslovna-mreza\//);
assert.match(load('apps/portal/sitemap-index.xml'),/https:\/\/gnk-asg\.hr\/news\/sitemap\.xml/);
assert.match(load('apps/portal/sitemap-index.xml'),/https:\/\/gnk-asg\.hr\/en\/gnk-aktual\/media\/sitemap\.xml/,'English media sitemap must be indexed');
assert.match(load('apps/portal/news/index.html'),/data-am-design="v1"/);
assert.match(load('apps/portal/poslovna-mreza/index.html'),/data-am-design="v1"/);
for(const page of ['apps/portal/news/index.html','apps/portal/poslovna-mreza/index.html']){
  const html=load(page);
  const structured=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  const sites=structured.filter(x=>x['@type']==='WebSite');
  assert.equal(sites.length,1,'New public routes need one WebSite node: '+page);
  assert.equal(sites[0]['@id'],'https://gnk-asg.hr/#website');
  assert.equal(sites[0].publisher['@id'],'https://gnk-asg.hr/#gnk-asg');
}

assert.doesNotMatch(networkHtml,/\"parentOrganization\"|\"subOrganization\"/);
const tags=JSON.parse(load('apps/portal/data/corporate-seo-taxonomy-v1.json'));
assert.equal(tags.topicHashtags.length,20);
assert.ok(tags.defaultPerArticleHashtagLimit<=5);
