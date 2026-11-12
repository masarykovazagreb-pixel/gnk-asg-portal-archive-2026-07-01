import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const data=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const css=fs.readFileSync('apps/portal/assets/aktual-world-page-a11y-v1.css','utf8');
function check(html,label){
 const body=html.slice(html.search(/<body\b/i));
 assert.match(body,/<body[^>]*>\s*<a class="skip" href="#worldContent">Preskoči na sadržaj<\/a>/,`${label}: first body link`);
 assert.equal((body.match(/id="worldContent"/g)||[]).length,1,label);
 assert.match(body,/<main id="worldContent"[^>]*tabindex="-1">/,label);
 assert.equal((body.match(/<\/main>/g)||[]).length,1,label);
 assert.match(html,/<link rel="stylesheet" href="\/assets\/aktual-world-page-a11y-v1\.css">/,label);
 assert.match(html,/<link rel="stylesheet" href="\/assets\/am-design-v1\.css" data-am-design="v1">/,label);
}
test('existing 201 country and 10 city pages have keyboard skip and main landmark',()=>{
 for(const [type,items] of [['media',data.countries],['grad',data.cities]]) for(const item of items){
  const file=`apps/portal/gnk-aktual/${type}/${item.slug}/index.html`,html=fs.readFileSync(file,'utf8');check(html,file);
  assert.ok(html.includes('entity:v1')&&html.includes('am-ribbon')&&html.includes('data-am-author="v1"'),file);
 }
 assert.match(css,/:focus-visible/);assert.match(css,/overflow-wrap:\s*anywhere/);assert.match(css,/\.gnk-hashtags\s*\{\s*color:\s*#cbd5e1\s*!important/);
 const luminance=hex=>{const rgb=hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};
 for(const background of ['061019','071522']) assert.ok((luminance('cbd5e1')+0.05)/(luminance(background)+0.05)>=4.5,`hashtag contrast on #${background}`);
});
test('newly built editions retain accessibility structure',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-a11y-'));
 try {const run=spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs'],{env:{...process.env,AKTUAL_WORLD_OUT:tmp},encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  for(const [type,items] of [['media',data.countries],['grad',data.cities]])for(const item of items)check(fs.readFileSync(path.join(tmp,type,item.slug,'index.html'),'utf8'),`${type}/${item.slug}`);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
