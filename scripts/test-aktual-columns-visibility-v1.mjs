#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const data=JSON.parse(fs.readFileSync('apps/portal/data/kolumne.json','utf8'));
const items=Array.isArray(data)?data:(data.items||[]);
const hr=fs.readFileSync('apps/portal/gnk-aktual/kolumne/index.html','utf8');
const en=fs.readFileSync('apps/portal/en/gnk-aktual/columns/index.html','utf8');
const whr=fs.readFileSync('apps/portal/gnk-aktual/tjedni/index.html','utf8');
const wen=fs.readFileSync('apps/portal/en/gnk-aktual/weekly/index.html','utf8');

assert.ok(items.length>=1,'column feed must not be empty');
const hrSection=(hr.match(/<section id="columns"[\s\S]*?<\/section>/)||[])[0]||'';
const enSection=(en.match(/<section id="columns"[\s\S]*?<\/section>/)||[])[0]||'';
assert.ok(hrSection.includes('class="card"'),'HR columns must be statically rendered');
assert.ok(enSection.includes('class="card"'),'EN columns must be statically rendered');
assert.ok(!hrSection.includes('Učitavanje kolumni'),'HR static section must not be loading-only');
assert.ok(!enSection.includes('Loading columns'),'EN static section must not be loading-only');

const imageUse=new Map();
for(const item of items){
  assert.ok(item.url,'column discovery item needs URL');
  assert.ok(item.slika,'column discovery item needs image');
  assert.ok(hrSection.includes(item.url),'HR columns index must expose '+item.url);
  const key=item.slika; imageUse.set(key,(imageUse.get(key)||0)+1);
  const remote=/^https?:\/\//.test(item.slika);
  if(remote){
    assert.ok(item.slika_autor&&item.slika_licenca&&item.slika_izvor,'remote image needs author/licence/source: '+item.slug);
  }else{
    assert.ok(/^\/(?:assets|spt)\//.test(item.slika),'local image must be approved portal asset: '+item.slug);
  }
  if(item.url_en)assert.ok(enSection.includes(item.url_en),'EN columns index must expose '+item.url_en);
  if(String(item.path||'').startsWith('/gnk-aktual/kolumne/')){
    const p='apps/portal'+item.path+'index.html';
    assert.ok(fs.existsSync(p),'canonical column HTML missing: '+p);
    const html=fs.readFileSync(p,'utf8');
    for(const marker of ['rel="canonical"','property="og:title"','property="og:url"','property="og:image"','name="twitter:card"','application/ld+json','Nermin Sefić'])assert.ok(html.includes(marker),p+': '+marker);
  }
}
assert.ok(Math.max(...imageUse.values())<=2,'one editorial image is reused by too many discovery items');
for(const item of items.slice(0,3)){
  assert.ok(whr.includes(item.url),'HR Weekly must statically expose top column '+item.url);
  if(item.url_en)assert.ok(wen.includes(item.url_en),'EN Weekly must statically expose top column '+item.url_en);
}
console.log(JSON.stringify({ok:true,items:items.length,uniqueImages:imageUse.size,canonicalColumns:items.filter(x=>String(x.path||'').startsWith('/gnk-aktual/kolumne/')).length},null,2));
