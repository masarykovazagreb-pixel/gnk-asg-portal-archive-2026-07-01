import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('builder rejects invalid, stale and duplicate headlines and labels source date',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-news-'));
  try {
    const now=new Date().toISOString();
    const rows=[{title:'Vijest & naslov',url:'https://example.com/story',source:'Izvor',publishedAt:now},
      {title:'Duplikat',url:'https://example.com/story',source:'Izvor',publishedAt:now},
      {title:'Pogrešan datum',url:'https://example.com/bad-date',source:'Izvor',publishedAt:'invalid'},
      {title:'Stara vijest',url:'https://example.com/old',source:'Izvor',publishedAt:'2001-01-01T00:00:00Z'},
      {title:'Opasna adresa',url:'javascript:alert(1)',source:'Izvor',publishedAt:now}];
    const cache=path.join(dir,'cache.json');fs.writeFileSync(cache,JSON.stringify({updatedAt:now,countries:{hrvatska:rows},cities:{zagreb:rows},sourceChecks:[{kind:'country',scope:'hrvatska',status:'headlines'},{kind:'country',scope:'hrvatska',status:'failed'},{kind:'country',scope:'hrvatska',status:'no-eligible-headlines'}]}));
    const result=spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs'],{env:{...process.env,AKTUAL_WORLD_CACHE:cache,AKTUAL_WORLD_OUT:path.join(dir,'out')},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const countryPage=fs.readFileSync(path.join(dir,'out/media/hrvatska/index.html'),'utf8');
    assert.ok(countryPage.includes('s prihvaćenim naslovima 1, bez prihvatljivih naslova 1, neuspješnih 1'));
    for(const relative of ['media/hrvatska','grad/zagreb']){
      const html=fs.readFileSync(path.join(dir,'out',relative,'index.html'),'utf8');
      const feed=fs.readFileSync(path.join(dir,'out',relative,'feed.xml'),'utf8');
      assert.ok(html.includes('Vijest &amp; naslov'));assert.ok(html.includes(`<time datetime="${now}">`));
      for(const forbidden of ['Duplikat','Pogrešan datum','Stara vijest','Opasna adresa']){assert.ok(!html.includes(forbidden));assert.ok(!feed.includes(forbidden));}
      assert.equal((feed.match(/<item>/g)||[]).length,1);
    }
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
