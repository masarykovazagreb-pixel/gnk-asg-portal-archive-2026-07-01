#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const roots=['apps/portal/gnk-aktual','apps/portal/en/gnk-aktual'];
const failures=[];
const warnings=[];
const files=[];

function walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile()&&ent.name==='index.html') files.push(p);
  }
}
roots.forEach(walk);

const isAuthorArticle=file=>{const parts=file.split('/');const i=Math.max(parts.indexOf('kolumne'),parts.indexOf('columns'));return i>=0&&parts.length>i+2&&parts.at(-1)==='index.html'};
const get=(html,re)=>html.match(re)?.[1]||'';

for(const file of files){
  if(isAuthorArticle(file)) continue;
  const html=fs.readFileSync(file,'utf8');
  const title=get(html,/<title>([^<]+)<\/title>/i).trim();
  const canonical=get(html,/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const robots=get(html,/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const site=get(html,/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
  const ogImage=get(html,/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const twitter=get(html,/<meta\s+name=["']twitter:card["']\s+content=["']([^"']+)["']/i);

  if(!title) failures.push(file+': title missing');
  else if(title.length>60) warnings.push(file+': title '+title.length+' chars — manual shortening candidate');
  if(!canonical||!/^https:\/\/gnk-asg\.hr\//.test(canonical)) failures.push(file+': canonical missing/invalid');
  if(!/index,follow/i.test(robots)||!/max-image-preview:large/i.test(robots)) failures.push(file+': robots must allow index/follow and large image preview');
  if(!/^AKTUAL MEDIA(?:\b|\s*\|)/.test(site)) failures.push(file+': og:site_name must identify AKTUAL MEDIA');
  if(!ogImage) failures.push(file+': og:image missing');
  if(twitter!=='summary_large_image') failures.push(file+': twitter large-card metadata missing');
  if(/<meta\s+name=["']keywords["']/i.test(html)) failures.push(file+': meta keywords prohibited');
  if(!/<meta\s+name=["']description["']\s+content=["'][^"']{80,}["']/i.test(html)) warnings.push(file+': meta description is short or missing');
  if(!/hreflang=["'](?:hr|en|x-default)["']/i.test(html)) warnings.push(file+': hreflang not detected');
}

console.log(JSON.stringify({
  version:'AKTUAL_SEO_SURFACE_V2',
  scanned:files.length,
  checked:files.filter(f=>!isAuthorArticle(f)).length,
  warnings,
  failures
},null,2));
if(failures.length) process.exit(1);
