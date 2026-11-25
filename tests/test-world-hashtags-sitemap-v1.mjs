import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ensureWorldHashtags,worldHashtagBlock} from '../apps/shared/aktual-world-hashtags-v1.mjs';
const portal='apps/portal';
const countries=JSON.parse(readFileSync(`${portal}/data/world-countries-v1.json`,'utf8')).countries;
const index=readFileSync(`${portal}/sitemap-index.xml`,'utf8');
const source=readFileSync('apps/region/engine/hub.mjs','utf8');
test('201 EN directories show approved tags, preserving existing tags and author layers',()=>{
 assert.equal(JSON.parse(readFileSync(`${portal}/data/approved_mentions.json`,'utf8')).hashtag_scope,'all_pages');
 let inserted=0;
 for(const c of countries){
  const html=readFileSync(`${portal}/en/gnk-aktual/media/${c.slug}/index.html`,'utf8');
  assert.ok(html.includes('#NerminSefić')&&html.includes('#NerminSefic'),c.slug);
  assert.equal(ensureWorldHashtags(html),html,`${c.slug} must be idempotent`);
  if(html.includes('data-world-network-tags="v1"')){inserted++;assert.equal(html.split(worldHashtagBlock).length,2);assert.ok(html.includes('href="/en/nermin-sefic/"'));}
 }
 assert.ok(inserted<=countries.length);assert.ok(existsSync(`${portal}/en/nermin-sefic/index.html`));assert.ok(existsSync(`${portal}/en/gnk-aktual/index.html`));
 assert.throws(()=>ensureWorldHashtags('<main>#NerminSefić</main><footer class="am-footer">'),/Partial/);
 assert.throws(()=>ensureWorldHashtags('<main></main>'),/footer/);
 const checked=spawnSync(process.execPath,['scripts/ensure-aktual-world-en-hashtags-v1.mjs'],{encoding:'utf8'});assert.equal(checked.status,0,checked.stderr);
});
test('country generator emits the approved network tags without touching sitemap policy',()=>{
 const temp=mkdtempSync(join(tmpdir(),'world-hashtags-'));
 try{
  const run=spawnSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{encoding:'utf8',env:{...process.env,AKTUAL_EN_OUT:temp}});assert.equal(run.status,0,run.stderr);
  for(const c of countries){let html=readFileSync(join(temp,c.slug,'index.html'),'utf8');assert.ok(html.includes(worldHashtagBlock),c.slug);}
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test('English world sitemap is discoverable in root index and includes only indexable canonical pages',()=>{
 const url='https://gnk-asg.hr/en/gnk-aktual/media/sitemap.xml';
 assert.equal(index.split(`<loc>${url}</loc>`).length-1,1);
 assert.match(index,new RegExp(`<loc>${url}</loc>\\s*</sitemap>`));
 assert.ok(source.includes("['en/gnk-aktual/media/sitemap.xml', null]"));
 const sitemap=readFileSync(`${portal}/en/gnk-aktual/media/sitemap.xml`,'utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);assert.equal(new Set(urls).size,urls.length);assert.ok(urls.length>1);
 for(const loc of urls){
  const prefix='https://gnk-asg.hr/';assert.ok(loc.startsWith(prefix));
  const html=readFileSync(join(portal,loc.slice(prefix.length),'index.html'),'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="${loc}">`),loc);assert.doesNotMatch(html,/<meta name="robots" content="[^\"]*noindex/i,loc);
 }
});
