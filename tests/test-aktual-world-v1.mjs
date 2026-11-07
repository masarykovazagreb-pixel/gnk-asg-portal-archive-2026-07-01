import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
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
      assert.ok(!page.includes('Bot čita i prepisuje vijesti'));
      if (!(fresh && cache.countries?.[slug]?.length)) assert.ok(!feed.includes('<item>'));
      assert.match(feed,/<rss version="2\.0"/);
    }
    for (const file of [path.join(tmp,'media','hrvatska','index.html'),path.join(tmp,'grad','zagreb','index.html')]) {
      const html=fs.readFileSync(file,'utf8');
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
