#!/usr/bin/env node
import fs from 'node:fs';

const files=[
  'apps/portal/gnk-aktual/index.html',
  'apps/portal/en/gnk-aktual/index.html',
  'apps/portal/gnk-aktual/radar/index.html',
  'apps/portal/en/gnk-aktual/radar/index.html',
  'apps/portal/gnk-aktual/izvori/index.html',
  'apps/portal/en/gnk-aktual/sources/index.html',
  'apps/portal/gnk-aktual/regije/index.html',
  'apps/portal/en/gnk-aktual/regions/index.html',
  'apps/portal/gnk-aktual/teme/index.html',
  'apps/portal/en/gnk-aktual/topics/index.html',
  'apps/portal/gnk-aktual/tjedni/index.html',
  'apps/portal/en/gnk-aktual/weekly/index.html',
  'apps/portal/gnk-aktual/kolumne/index.html',
  'apps/portal/en/gnk-aktual/columns/index.html'
];

const req=[
  ['title',/<title>[^<]+<\/title>/i],
  ['description',/<meta\s+name=["']description["'][^>]+content=["'][^"']+["']/i],
  ['canonical',/<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/gnk-asg\.hr\//i],
  ['robots',/<meta\s+name=["']robots["'][^>]+content=["'][^"']*index/i],
  ['og:title',/<meta\s+property=["']og:title["'][^>]+content=["'][^"']+["']/i],
  ['og:description',/<meta\s+property=["']og:description["'][^>]+content=["'][^"']+["']/i],
  ['og:url',/<meta\s+property=["']og:url["'][^>]+content=["']https:\/\/gnk-asg\.hr\//i],
  ['og:image',/<meta\s+property=["']og:image["'][^>]+content=["']https:\/\/gnk-asg\.hr\//i],
  ['twitter:card',/<meta\s+name=["']twitter:card["'][^>]+content=["'][^"']+["']/i],
  ['hreflang hr',/<link\s+rel=["']alternate["'][^>]+hreflang=["']hr["']/i],
  ['hreflang en',/<link\s+rel=["']alternate["'][^>]+hreflang=["']en["']/i],
  ['hreflang x-default',/<link\s+rel=["']alternate["'][^>]+hreflang=["']x-default["']/i]
];

const critical=[],warnings=[],rows=[];
for(const file of files){
  if(!fs.existsSync(file)){critical.push(file+': missing');continue}
  const html=fs.readFileSync(file,'utf8');
  const missing=req.filter(([,rx])=>!rx.test(html)).map(([name])=>name);
  if(missing.length)critical.push(file+': missing '+missing.join(', '));
  if(/<meta\s+name=["']keywords["']/i.test(html)) critical.push(file+': meta keywords present');
  const title=(html.match(/<title>([^<]+)<\/title>/i)||[])[1]||'';
  const desc=(html.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)||[])[1]||'';
  if(title.length>65)warnings.push(file+': title '+title.length+' chars');
  if(desc.length<70||desc.length>180)warnings.push(file+': description '+desc.length+' chars');
  if(!/AKTUAL MEDIA/i.test(title+' '+html.slice(0,12000))) warnings.push(file+': weak AKTUAL MEDIA brand signal');
  rows.push({file,title_length:title.length,description_length:desc.length,critical_missing:missing});
}
const report={version:'AKTUAL_META_MATRIX_V1',checked:files.length,critical,warnings,rows};
fs.mkdirSync('artifacts/seo',{recursive:true});
fs.writeFileSync('artifacts/seo/aktual-meta-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(critical.length)process.exit(1);
