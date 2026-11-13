import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
function check(html, file){
 const en=/<html\s+lang="en"/i.test(html),text=en?'Skip to content':'Preskoči na sadržaj';
 assert.ok(html.includes('data-am-design="v1"'),`${file}: shared skip CSS`);
 assert.match(html,new RegExp(`<body>\\s*<a class="skip" href="#galleryContent">${text}</a>`),file);
 assert.equal((html.match(/id="galleryContent"/g)||[]).length,1,file);
 assert.match(html,/<main id="galleryContent" tabindex="-1"[^>]*>/,file);
}
test('gallery and visual index pages have a working, language-appropriate skip link',()=>{
 const files=['galerija','visual-index','en/visual-index'].flatMap(dir=>walk(`apps/portal/${dir}`));
 assert.ok(files.length>=404,'expected at least the existing gallery and visual-index pages');
 for(const file of files){const html=fs.readFileSync(file,'utf8');check(html,file);}
 const css=fs.readFileSync('apps/portal/assets/am-design-v1.css','utf8');assert.match(css,/\.skip:focus/);
});
test('brand gallery generator creates accessible editions in isolation',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'brand-gallery-a11y-'));
 try{
  for(const file of ['scripts/build-brand-gallery-v1.mjs','scripts/lib/article-meta-v1.mjs','apps/portal/data/aktual-logos-v1.json','apps/region/channels.json','apps/portal/galerija/index.html','apps/portal/galerija/sitemap.xml']){
   const dest=path.join(tmp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);
  }
  const run=spawnSync(process.execPath,[path.join(tmp,'scripts/build-brand-gallery-v1.mjs')],{cwd:tmp,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const outputs=walk(path.join(tmp,'apps/portal/galerija')).filter(p=>p!==path.join(tmp,'apps/portal/galerija/index.html'));assert.ok(outputs.length>1);
  for(const file of outputs)check(fs.readFileSync(file,'utf8'),file);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('standalone gallery builder creates accessible fresh pages in isolation',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-a11y-'));
 try{
  const data=path.join(tmp,'apps/portal/data');fs.mkdirSync(data,{recursive:true});
  for(const f of ['visual_gallery.json','aktual-logos-v1.json'])fs.copyFileSync(`apps/portal/data/${f}`,path.join(data,f));
  const run=spawnSync('python3',[path.resolve('scripts/build_gallery_standalone_pages.py')],{cwd:tmp,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const manifest=JSON.parse(fs.readFileSync(path.join(data,'visual_gallery.json'),'utf8'));
  check(fs.readFileSync(path.join(tmp,'apps/portal/galerija/index.html'),'utf8'),'new gallery');
  const id=manifest.items[0].id;
  for(const route of [`galerija/${id}`,`visual-index/${id}`,`en/visual-index/${id}`])check(fs.readFileSync(path.join(tmp,'apps/portal',route,'index.html'),'utf8'),route);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
