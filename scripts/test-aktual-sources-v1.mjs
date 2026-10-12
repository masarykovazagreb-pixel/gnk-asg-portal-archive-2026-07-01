#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/izvori/index.html',
  en:'apps/portal/en/gnk-aktual/sources/index.html',
  js:'apps/portal/assets/aktual-sources-v1.js',
  css:'apps/portal/assets/aktual-sources-v1.css',
  newsroomHr:'apps/portal/gnk-aktual/index.html',
  newsroomEn:'apps/portal/en/gnk-aktual/index.html',
  radarHr:'apps/portal/gnk-aktual/radar/index.html',
  radarEn:'apps/portal/en/gnk-aktual/radar/index.html',
  worldJs:'apps/portal/assets/aktual-media-world-v1.js',
  sitemap:'apps/portal/sitemap.xml',
  taskboard:'config/control-plane/workforce-bot-taskboard-v1.json'
};
const failures=[];
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en),js=read(files.js),css=read(files.css);
for(const [name,html] of [['hr',hr],['en',en]]){
  for(const id of ['asStatus','asItems','asSources','asTopShare','asSearch','asCount','asGrid']){
    if(!html.includes('id="'+id+'"')) failures.push(name+': missing #'+id);
  }
  if(!html.includes('/assets/aktual-sources-v1.css')) failures.push(name+': missing Sources CSS');
  if(!html.includes('/assets/aktual-sources-v1.js')) failures.push(name+': missing Sources JS');
  if(/<meta\s+name=["']keywords["']/i.test(html)) failures.push(name+': Source directory must not add meta keywords');
  if(!/hreflang=["']hr["']/.test(html)||!/hreflang=["']en["']/.test(html)||!/hreflang=["']x-default["']/.test(html)) failures.push(name+': hreflang set incomplete');
}
if(!js.includes("fetch('/data/news.json")) failures.push('js: canonical news feed missing');
for(const forbidden of ['localStorage','sessionStorage','sendBeacon','XMLHttpRequest','WebSocket']) if(js.includes(forbidden)) failures.push('js: forbidden browser capability '+forbidden);
if(/fetch\s*\(\s*['"]https?:/i.test(js)) failures.push('js: external fetch is not allowed');
if(!js.includes("aliases={world:'international'")) failures.push('js: canonical section aliases missing');
if(!js.includes('rec.items.length')||!js.includes('rec.groups')) failures.push('js: evidence-derived source aggregation missing');
for(const forbiddenClaim of ['trust score','quality score','bias score','sentiment score','popularity score']){
  if(js.toLowerCase().includes(forbiddenClaim)) failures.push('js: forbidden rating concept '+forbiddenClaim);
}
if(!css.includes('.as-grid')||!css.includes('.as-card')||!css.includes('@media')) failures.push('css: responsive directory layout incomplete');

const newsroomHr=read(files.newsroomHr),newsroomEn=read(files.newsroomEn);
const radarHr=read(files.radarHr),radarEn=read(files.radarEn),worldJs=read(files.worldJs),sitemap=read(files.sitemap);
if(!newsroomHr.includes('/gnk-aktual/izvori/')) failures.push('HR newsroom: source directory link missing');
if(!newsroomEn.includes('/en/gnk-aktual/sources/')) failures.push('EN newsroom: source directory link missing');
if(!radarHr.includes('/gnk-aktual/izvori/')) failures.push('HR Radar: source directory link missing');
if(!radarEn.includes('/en/gnk-aktual/sources/')) failures.push('EN Radar: source directory link missing');
if(!worldJs.includes("'/gnk-aktual/izvori/'")||!worldJs.includes("'/en/gnk-aktual/sources/'")) failures.push('world JS: dynamic source nav missing');
for(const url of ['https://gnk-asg.hr/gnk-aktual/izvori/','https://gnk-asg.hr/en/gnk-aktual/sources/']){
  if(!sitemap.includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);
}

const taskboard=JSON.parse(read(files.taskboard));
const build=taskboard.tasks?.find(x=>x.id==='BOT-TASK-014');
const maintain=taskboard.tasks?.find(x=>x.id==='BOT-TASK-018');
if(build?.status!=='done') failures.push('taskboard: BOT-TASK-014 must be done');
if(maintain?.status!=='active') failures.push('taskboard: BOT-TASK-018 must be active');

console.log(JSON.stringify({version:'AKTUAL_SOURCES_V1_TEST',files:Object.keys(files).length,failures},null,2));
if(failures.length) process.exit(1);
