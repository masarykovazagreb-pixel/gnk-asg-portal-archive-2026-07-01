import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function walk(dir) {
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
}
test('workforce pages have a localized skip link and one focusable target',()=>{
 for (const [dir,lang,count] of [['apps/portal/digital-workforce','hr',56],['apps/portal/en/digital-workforce','en',55]]) {
  const files=walk(dir);assert.ok(files.length>=count);
  for(const file of files){
   const html=fs.readFileSync(file,'utf8');
   if(file===`${dir}/index.html`){assert.match(html,/<a class="dw-skip-link" href="#dwMain">/);assert.match(html,/<main class="dw-shell" id="dwMain" tabindex="-1">/);continue;}
   const label=lang==='hr'?'Preskoči na sadržaj':'Skip to content';
   assert.ok(html.includes(`<a class="skip" href="#dwSkipMain">${label}</a>`),file);
   assert.match(html,/<body\b[^>]*><a class="skip" href="#dwSkipMain">/,file);
   assert.match(html,/<main id="dwSkipMain" tabindex="-1" class="(?:dw-shell|kb-wrap|editorial-wrap)">/,file);
   assert.equal((html.match(/id="dwSkipMain"/g)||[]).length,1,file);
   assert.match(html,/<link\b[^>]*href="\/assets\/am-design-v1\.css(?:\?[^"\s]*)?"[^>]*data-am-design="v1"[^>]*>/,file);
  }
 }
});
test('newsroom generator renders localized access and preserves simulation notice',()=>{
 const src=fs.readFileSync('scripts/generate-digital-workforce-newsroom-pages-v1.mjs','utf8');
 const start=src.indexOf('function buildPage('),end=src.indexOf('\nasync function main()',start);assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(`(${src.slice(start,end)})`,{esc:String,formatDate:()=> 'date'});
 const item={slug:'example',author:'Desk',editor:'Editor',publishedAt:'2026-01-01',title:'Title',excerpt:'Text',seo:{title:'Title',description:'Text',image:'/image.webp',canonical:'https://gnk-asg.hr/example/'}};
 for(const [lang,label,notice] of [['hr','Preskoči na sadržaj','Ne predstavlja stvarne poslovne podatke'],['en','Skip to content','does not represent real business data']]){
  const html=fn(item,lang);assert.ok(html.includes(`<body><a class="skip" href="#dwSkipMain">${label}</a>`));
  assert.match(html,/<main id="dwSkipMain" tabindex="-1" class="editorial-wrap">/);
  assert.ok(html.includes('/assets/am-design-v1.css'));assert.ok(html.includes(notice));
 }
});
