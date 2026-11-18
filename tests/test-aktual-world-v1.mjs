import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {externalStationSection} from '../apps/shared/aktual-external-stations-v1.mjs';
const ROOT=process.cwd();
const src=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const slugs=src.countries.map(x=>x.slug),codes=src.countries.map(x=>x.code);
test('201 unique countries, 10 cities, 435 configured sources',()=>{
  assert.equal(slugs.length,201);
  assert.equal(new Set(slugs).size,201);
  assert.equal(new Set(codes).size,201);
  assert.equal(src.cities.length,10);
  assert.equal(src.countries.reduce((sum,c)=>sum+c.sourcesList.length,0),435);
});
test('build includes only real generated URLs and no fake headlines',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aktual-world-test-'));
  const cachePath='apps/portal/data/aktual-world-headlines-v1.json';
  const cache=fs.existsSync(cachePath)?JSON.parse(fs.readFileSync(cachePath,'utf8')):null;
  const fresh=cache && Date.now()-Date.parse(cache.updatedAt)<86400000 && Date.now()>=Date.parse(cache.updatedAt);
  try {
    const build=spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs','--base','https://gnk-asg.hr/gnk-aktual/'],{cwd:ROOT,env:{...process.env,AKTUAL_WORLD_OUT:tmp},encoding:'utf8'});
    assert.equal(build.status,0,build.stderr);
    const countries=fs.readdirSync(path.join(tmp,'media')).filter(f=>fs.statSync(path.join(tmp,'media',f)).isDirectory());
    assert.equal(countries.length,201);
    assert.equal(fs.readdirSync(path.join(tmp,'grad')).length,10);
    for(const slug of countries){
      const page=fs.readFileSync(path.join(tmp,'media',slug,'index.html'),'utf8');
      const feed=fs.readFileSync(path.join(tmp,'media',slug,'feed.xml'),'utf8');
      if (!(fresh && cache.countries?.[slug]?.length)) assert.ok(page.includes('Trenutačno nema provjerenog svježeg skupa naslova'));
      const station = externalStationSection(slug);
      assert.ok(page.includes(station), `generated cross-link for ${slug}`);
      assert.ok(page.includes('data-world-navigation="v1"'), `generated navigation for ${slug}`);
      assert.ok(!page.includes('Bot čita i prepisuje vijesti'));
      if (!(fresh && cache.countries?.[slug]?.length)) assert.ok(!feed.includes('<item>'));
      assert.match(feed,/<rss version="2\.0"/);
    }
    for (const file of [path.join(tmp,'media','hrvatska','index.html'),path.join(tmp,'grad','zagreb','index.html')]) {
      const html=fs.readFileSync(file,'utf8');
      const keywords=(html.match(/<meta name="keywords" content="([^"]*)"/) || [])[1] || '';
      assert.ok(!/Nermin\s+Sefi[cć]/i.test(keywords)); assert.match(html,/<meta name="author" content="Nermin Sefić/);
      assert.match(html,/data-am-impressum="v1"/); assert.match(html,/am-refresh-v1\.js/); assert.match(html,/#NerminSefić/); assert.match(html,/rel="icon"/);
      const blocks=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
      const nodes=blocks.flatMap(x=>x['@graph'] || [x]).filter(x=>x['@type']==='WebSite');
      assert.equal(nodes.length,1); assert.equal(nodes[0]['@id'],'https://gnk-asg.hr/#website');
      assert.deepEqual(nodes[0].inLanguage,['hr','en']); assert.equal(nodes[0].publisher['@id'],'https://gnk-asg.hr/#gnk-asg');
    }
    const sitemap=fs.readFileSync(path.join(tmp,'media','sitemap.xml'),'utf8');
    assert.equal((sitemap.match(/<url>/g)||[]).length,211);
    for (const city of src.cities) assert.ok(sitemap.includes(`/grad/${city.slug}/`));
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});


test('AKTUAL network performance: only above-fold lead imagery is eager',()=>{
 const html=fs.readFileSync('apps/portal/gnk-aktual/index.html','utf8');
 const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 assert.ok(images.length>=60);
 const eager=images.filter(tag=>tag.includes('loading="eager"'));
 assert.equal(eager.length,2,'only atlas hero and Croatia-priority Zagreb card may be eager');
 assert.match(eager[0],/\/assets\/atlas\/aktual-media-atlas-1600\.webp/);
 assert.match(eager[1],/\/assets\/izdanja\/zagreb-440\.webp/);
 for(const city of ['beograd','sarajevo','tokio','peking']){
  const tag=images.find(s=>s.includes('/assets/izdanja/'+city+'-440.webp'));
  assert.ok(tag && tag.includes('loading="lazy"'),city+' must load near viewport');
 }
});
test('AKTUAL 201-country index retains crawlable links and progressive rendering',()=>{
 const html=fs.readFileSync('apps/portal/gnk-aktual/media/index.html','utf8');
 const styles=fs.readFileSync('apps/portal/assets/aktual-world-directory-v1.css','utf8');
 const shared=fs.readFileSync('apps/portal/assets/aktual-world-page-a11y-v1.css','utf8');
 const script=fs.readFileSync('apps/portal/assets/aktual-world-directory-v1.js','utf8');
 assert.equal((html.match(/data-world-country/g)||[]).length,201);
 assert.match(html,/aktual-world-directory-v1\.css\?v=20261118-perf1/);
 assert.match(html,/aktual-world-directory-v1\.js\?v=20261118-perf1/);
 assert.match(styles,/\.aw-region\{content-visibility:auto;/);
 assert.match(shared,/main#worldContent>\.section\{content-visibility:auto;/);
 assert.match(script,/indexedRows=rows\.map/);
 assert.doesNotMatch(script,/normalize\(row\.dataset\.search\)\.includes\(q\)/);
 assert.match(html,/\/radio\//);
});
