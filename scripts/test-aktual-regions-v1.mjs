#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/regije/index.html',
  en:'apps/portal/en/gnk-aktual/regions/index.html',
  js:'apps/portal/assets/aktual-regions-v1.js',
  css:'apps/portal/assets/aktual-regions-v1.css',
  newsroomHr:'apps/portal/gnk-aktual/index.html',
  newsroomEn:'apps/portal/en/gnk-aktual/index.html',
  worldJs:'apps/portal/assets/aktual-media-world-v1.js',
  news:'apps/portal/data/news.json',
  sitemap:'apps/portal/sitemap.xml',
  taskboard:'config/control-plane/workforce-bot-taskboard-v1.json'
};
const failures=[];
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en),js=read(files.js),css=read(files.css);
for(const [name,html] of [['hr',hr],['en',en]]){
  for(const id of ['rgStatus','rgLeadMain','rgRail','rgCount','rgGrid','rgSourceCount','rgSources']){
    if(!html.includes('id="'+id+'"')) failures.push(name+': missing #'+id);
  }
  for(const filter of ['all','india','asia']) if(!html.includes('data-rg-filter="'+filter+'"')) failures.push(name+': missing '+filter+' filter');
  if(!html.includes('/assets/aktual-regions-v1.css')) failures.push(name+': missing regional CSS');
  if(!html.includes('/assets/aktual-regions-v1.js')) failures.push(name+': missing regional JS');
  if(/<meta\s+name=["']keywords["']/i.test(html)) failures.push(name+': regional desk must not add meta keywords');
}
if(!js.includes("fetch('/data/news.json")) failures.push('js: canonical news feed missing');
if(!js.includes("String(x.group||'').toLowerCase()==='regije'")) failures.push('js: regional group filter missing');
if(!js.includes("raw==='indija'")||!js.includes("raw==='azija'")) failures.push('js: India/Asia category mapping missing');
for(const forbidden of ['localStorage','sessionStorage','sendBeacon','XMLHttpRequest','WebSocket']) if(js.includes(forbidden)) failures.push('js: forbidden browser capability '+forbidden);
if(/fetch\s*\(\s*['"]https?:/i.test(js)) failures.push('js: external fetch is not allowed');
if(!css.includes('.rg-grid')||!css.includes('.rg-lead')||!css.includes('@media')) failures.push('css: responsive regional layout incomplete');

const news=JSON.parse(read(files.news));
const items=(Array.isArray(news)?news:(news.items||[])).filter(x=>x&&x.verified!==false);
const regional=items.filter(x=>String(x.group||'').toLowerCase()==='regije');
const india=regional.filter(x=>['indija','india'].includes(String(x.category||'').toLowerCase()));
const asia=regional.filter(x=>['azija','asia'].includes(String(x.category||'').toLowerCase()));
if(regional.length===0) failures.push('feed evidence: regional group is empty; promoted regional desk is no longer justified');
if(india.length===0) failures.push('feed evidence: India regional corpus is empty');
if(asia.length===0) failures.push('feed evidence: Asia regional corpus is empty');

const newsroomHr=read(files.newsroomHr),newsroomEn=read(files.newsroomEn),worldJs=read(files.worldJs),sitemap=read(files.sitemap);
if(!newsroomHr.includes('/gnk-aktual/regije/')) failures.push('HR newsroom: regional link missing');
if(!newsroomEn.includes('/en/gnk-aktual/regions/')) failures.push('EN newsroom: regional link missing');
if(!worldJs.includes("'/gnk-aktual/regije/'")||!worldJs.includes("'/en/gnk-aktual/regions/'")) failures.push('world JS: dynamic regional nav missing');
for(const url of ['https://gnk-asg.hr/gnk-aktual/regije/','https://gnk-asg.hr/en/gnk-aktual/regions/']){
  if(!sitemap.includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);
}

const taskboard=JSON.parse(read(files.taskboard));
const build=taskboard.tasks?.find(x=>x.id==='BOT-TASK-015');
const maintain=taskboard.tasks?.find(x=>x.id==='BOT-TASK-019');
if(build?.status!=='done') failures.push('taskboard: BOT-TASK-015 must be done');
if(maintain?.status!=='active') failures.push('taskboard: BOT-TASK-019 must be active');

console.log(JSON.stringify({
  version:'AKTUAL_REGIONS_V1_TEST',
  evidence:{total:items.length,regional:regional.length,india:india.length,asia:asia.length},
  failures
},null,2));
if(failures.length) process.exit(1);
