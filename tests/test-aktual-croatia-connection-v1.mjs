import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const link='https://j1hex9qg03f0-d.space-z.ai/?country=hrvatska';
test('portal and AKTUAL entry points visibly link to the external Croatia test edition',()=>{
 for(const [file,label] of [
  ['apps/portal/index.html','Vanjsko probno izdanje Hrvatska'],['apps/portal/en/index.html','External Croatia test edition'],
  ['apps/portal/aktual-media/index.html','Hrvatska: vanjsko probno izdanje'],['apps/portal/en/aktual-media/index.html','Croatia: external test edition'],
  ['apps/portal/gnk-aktual/index.html','Hrvatska · vanjsko probno izdanje'],['apps/portal/en/gnk-aktual/index.html','Croatia · external test edition'],
 ]){
  const html=fs.readFileSync(file,'utf8');assert.ok(html.includes(`href="${link}" rel="external noopener noreferrer">${label}`),file);
  for(const tag of ['#NerminSefić','#NerminSefic','#AKTUALMEDIA']) assert.ok(html.toLowerCase().includes(tag.toLowerCase()),`${file}: ${tag}`);
  assert.match(html,/<link rel="canonical" href="https:\/\/gnk-asg\.hr\//,file);
 }
 const source=fs.readFileSync('apps/region/engine/data-desk.mjs','utf8');assert.ok(source.includes(link));assert.ok(source.includes('Croatia: external test edition'));
 const js=fs.readFileSync('apps/portal/assets/aktual-media-world-v1.js','utf8');assert.ok(js.includes(link));assert.ok(js.includes('Hrvatska · vanjsko probno izdanje'));
});
test('Croatian hub meta descriptions are consistent, meaningful and stable',()=>{
 const html=fs.readFileSync('apps/portal/gnk-aktual/index.html','utf8');
 const attrs=['name="description"','property="og:description"','name="twitter:description"'];
 const values=attrs.map(a=>html.match(new RegExp(`<meta ${a} content="([^"]*)"`))?.[1]);
 assert.ok(values.every(Boolean));assert.equal(new Set(values).size,1);assert.match(values[0],/Hrvatske i svijeta/);assert.match(values[0],/Nermin Sefić/);assert.ok(values[0].length<=160);
 const source=fs.readFileSync('apps/region/engine/aktual-central.mjs','utf8');assert.ok(source.includes('const metaDesc = `'+values[0]+'`'));
});
