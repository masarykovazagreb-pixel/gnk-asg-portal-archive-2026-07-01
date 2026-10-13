#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/index.html',
  en:'apps/portal/en/gnk-aktual/index.html',
  topicsHr:'apps/portal/gnk-aktual/teme/index.html',
  topicsEn:'apps/portal/en/gnk-aktual/topics/index.html',
  css:'apps/portal/assets/aktual-media-world-v1.css',
  js:'apps/portal/assets/aktual-media-world-v1.js',
  sitemap:'apps/portal/sitemap.xml',
  comments:'apps/portal/data/aktual-editorial-comments.json'
};
const failures=[];
for(const [name,p] of Object.entries(files)){
  if(!fs.existsSync(p)) failures.push(name+': missing '+p);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en),topicsHr=read(files.topicsHr),topicsEn=read(files.topicsEn),js=read(files.js),css=read(files.css),sitemap=read(files.sitemap);
for(const [name,html] of [['hr',hr],['en',en]]){
  for(const id of ['amEditionDate','amFeedStatus','amSectionNav','amBreakingTrack','amLead','amRail','amLatestList','amSources','amSearchForm','amSearchInput','amSearchResults','amGroups','amEditorialLinks']){
    if(!html.includes('id="'+id+'"')) failures.push(name+': missing #'+id);
  }
  if(!html.includes('/assets/aktual-media-world-v1.css')) failures.push(name+': missing world CSS');
  if(!html.includes('/assets/aktual-media-world-v1.js')) failures.push(name+': missing world JS');
  if(!html.includes('id="aktualSova"')) failures.push(name+': missing AKTUAL Sova desk');
  if(!html.includes('/assets/aktual-sova-v1.js')) failures.push(name+': missing AKTUAL Sova module');
  for(const tab of ['source','foresight','weekly','explain']) if(!html.includes('data-sova-tab="'+tab+'"')) failures.push(name+': missing Sova '+tab+' tab');
  const keywordTags=[...html.matchAll(/<meta\s+name=["']keywords["'][^>]*>/gi)].map(m=>m[0]);
  if(keywordTags.some(x=>/Nermin\s+Sefi[cć]/i.test(x))) failures.push(name+': author name present in meta keywords');
}
if(!hr.toLocaleLowerCase('hr').includes('modelirani digitalni vodič')||!hr.toLocaleLowerCase('hr').includes('modelirani strateški foresight vodič')) failures.push('hr: Sova transparent classification missing');
if(!en.toLowerCase().includes('modelled digital guide')||!en.toLowerCase().includes('modelled strategic foresight guide')) failures.push('en: Sova transparent classification missing');
for(const [name,html] of [['topicsHr',topicsHr],['topicsEn',topicsEn]]){
  if(!html.includes('data-aktual-view="topics"')) failures.push(name+': wrong view mode');
  if(!html.includes('id="amTopicGrid"')) failures.push(name+': missing topic grid');
  if(!html.includes('id="amSources"')) failures.push(name+': missing source map');
}
if(!js.includes("fetch('/data/news.json")) failures.push('js: must consume canonical news feed');
if(!js.includes("fetch('/data/kolumne.json")) failures.push('js: must consume canonical columns feed');
if(!js.includes("fetch('/data/aktual-editorial-comments.json")) failures.push('js: must consume separate editorial commentary overlay');
if(!js.includes("note.source_url!==item.url||note.source_name!==item.source||note.source_published_at!==item._published")) failures.push('js: commentary must fail closed on source identity mismatch');
if(!js.includes("commentary:'Komentar redakcije'")) failures.push('js: Croatian editorial commentary label missing');
if(!js.includes("world:'international'")) failures.push('js: world alias normalization missing');
if(!js.includes("business:'economy'")) failures.push('js: business alias normalization missing');
if(/innerHTML\s*=\s*[^;]*item\.title/.test(js)) failures.push('js: unescaped direct title injection detected');
if(!css.includes('.am-leadgrid')||!css.includes('.am-cardgrid')||!css.includes('@media')) failures.push('css: required responsive newsroom layout missing');
if(!css.includes('.am-commentary')) failures.push('css: editorial commentary treatment missing');
for(const url of ['https://gnk-asg.hr/gnk-aktual/teme/','https://gnk-asg.hr/en/gnk-aktual/topics/']){
  if(!sitemap.includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);
}
const report={version:'AKTUAL_MEDIA_WORLD_V1_TEST',files:Object.keys(files).length,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length) process.exit(1);
