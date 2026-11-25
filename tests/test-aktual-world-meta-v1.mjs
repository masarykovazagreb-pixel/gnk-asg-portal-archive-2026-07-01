import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {countryDirectoryDescription,englishWorldDirectoryDescription} from '../apps/shared/aktual-world-meta-v1.mjs';

const countries=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8')).countries;
const root='apps/portal/en/gnk-aktual/media';
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metas(html){
 return ['name="description"','property="og:description"','name="twitter:description"'].map(key=>{
  const tags=[...html.matchAll(new RegExp(`<meta\\s+${key}\\s+content="([^"]*)"\\s*\\/?>`,'g'))];
  assert.equal(tags.length,1,`${key} must occur exactly once`);return tags[0][1];
 });
}
test('201 English directories have country-specific, aligned and cautious preview descriptions',()=>{
 assert.equal(countries.length,201);let texts=new Set();let indexable=0,noindex=0;
 for(const c of countries){
  const html=fs.readFileSync(path.join(root,c.slug,'index.html'),'utf8');const desc=countryDirectoryDescription(c.nameEn);
  assert.ok(desc.length>=70&&desc.length<=180,`${c.slug}: ${desc.length}`);
  assert.deepEqual(metas(html),[escape(desc),escape(desc),escape(desc)],c.slug);
  assert.match(desc,/Source availability may vary/);assert.doesNotMatch(desc,/current RSS|independent/i);
  assert.ok(html.includes(`<link rel="canonical" href="https://gnk-asg.hr/en/gnk-aktual/media/${c.slug}/"`),`${c.slug}: canonical`);
  /<meta name="robots" content="noindex/.test(html)?noindex++:indexable++;
  texts.add(desc);
 }
 assert.equal(texts.size,201);assert.ok(indexable>0&&noindex>0,'retain existing mixed indexability policy');
});
test('world index has the same description across search and social previews',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const value=escape(englishWorldDirectoryDescription);
 assert.deepEqual(metas(html),[value,value,value]);
});
test('isolated generator reproduces the metadata for every country and directory',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'aktual-world-meta-'));
 try{
  const env={...process.env,AKTUAL_EN_OUT:out};
  execFileSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs'],{env,stdio:'pipe'});
  execFileSync(process.execPath,['scripts/build-aktual-world-en-v1.mjs','--check'],{env,stdio:'pipe'});
  for(const slug of [...countries.map(c=>c.slug),'']){
   const current=fs.readFileSync(path.join(root,slug,'index.html'),'utf8');
   const generated=fs.readFileSync(path.join(out,slug,'index.html'),'utf8');
   assert.deepEqual(metas(generated),metas(current),slug||'directory');
  }
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
