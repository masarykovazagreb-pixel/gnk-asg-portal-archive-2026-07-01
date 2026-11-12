import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {countryNavigation,cityNavigation} from '../apps/shared/aktual-world-navigation-v1.mjs';
import {externalStationSection} from '../apps/shared/aktual-external-stations-v1.mjs';
const data=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const root='apps/portal/gnk-aktual';
const countryBlock=/  <div class="section">\n    <h2>Posljednje povezane vijesti<\/h2>[\s\S]*?\n  <\/div>/g;
const cityBlock=/<p class="muted">(?:Poveznice na izvornike, zadnji uspješan dohvat: [\s\S]*?|Nema svježih provjerenih naslova za ovo izdanje; vijesti nisu automatski objavljene\.)<\/p>\n<ul>[\s\S]*?<\/ul>(?=<p><a href="[^"\n]*feed\.xml")/g;
const scrub=(html,pattern)=>html.replace(pattern,'DYNAMIC_HEADLINES');
test('all country and city navigation is present without guessed external routes',()=>{
  const directory=fs.readFileSync(`${root}/media/index.html`,'utf8');
  for(const c of data.countries){
    const html=fs.readFileSync(`${root}/media/${c.slug}/index.html`,'utf8');
    assert.ok(html.includes(countryNavigation(c,data.cities)),c.slug);
    assert.ok(html.includes(externalStationSection(c.slug)),c.slug);
    assert.ok(directory.includes(`href="/gnk-aktual/media/${c.slug}/" data-world-country data-language="${c.language}"`));
    assert.ok(html.includes(`rel="canonical" href="https://gnk-asg.hr/gnk-aktual/media/${c.slug}/"`),c.slug);
    assert.ok(html.includes('entity:v1') && html.includes('am-ribbon') && html.includes('data-am-author="v1"'),c.slug);
  }
  for(const city of data.cities){
    const html=fs.readFileSync(`${root}/grad/${city.slug}/index.html`,'utf8');
    assert.ok(html.includes(cityNavigation(city,data.countries.find(c=>c.slug===city.country)).trimEnd()),city.slug);
    assert.ok(html.includes('entity:v1') && html.includes('am-ribbon') && html.includes('data-am-author="v1"'),city.slug);
  }
});
test('rebuild changes only headline blocks in existing HTML and fails before writes on unexpected templates',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-layers-'));
  try{
    const pages=[];
    for(const [type,items,pattern] of [['media',data.countries,countryBlock],['grad',data.cities,cityBlock]]) for(const item of items){
      const relative=`${type}/${item.slug}/index.html`, dest=path.join(tmp,relative), original=fs.readFileSync(`${root}/${relative}`,'utf8');
      fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original);pages.push({dest,original,pattern});
    }
    const run=()=>spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs'],{env:{...process.env,AKTUAL_WORLD_OUT:tmp},encoding:'utf8'});
    const first=run();assert.equal(first.status,0,first.stderr);
    for(const p of pages) assert.equal(scrub(fs.readFileSync(p.dest,'utf8'),p.pattern),scrub(p.original,p.pattern),p.dest);
    const sentinel=path.join(tmp,'media','hrvatska','feed.xml');fs.writeFileSync(sentinel,'unchanged');
    const bad=pages.at(-1).dest;fs.writeFileSync(bad,'unexpected template');
    const failure=run();assert.notEqual(failure.status,0);assert.match(failure.stderr,/Unexpected headline block/);assert.equal(fs.readFileSync(sentinel,'utf8'),'unchanged');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
