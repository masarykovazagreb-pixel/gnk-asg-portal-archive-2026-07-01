#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/radar/index.html',
  en:'apps/portal/en/gnk-aktual/radar/index.html',
  js:'apps/portal/assets/aktual-radar-v1.js',
  css:'apps/portal/assets/aktual-radar-v1.css',
  newsroomHr:'apps/portal/gnk-aktual/index.html',
  newsroomEn:'apps/portal/en/gnk-aktual/index.html',
  worldJs:'apps/portal/assets/aktual-media-world-v1.js',
  sitemap:'apps/portal/sitemap.xml',
  taskboard:'config/control-plane/workforce-bot-taskboard-v1.json'
};
const failures=[];
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en),js=read(files.js),css=read(files.css);
for(const [name,html] of [['hr',hr],['en',en]]){
  for(const id of ['arStatus','arTopSource','arItems','arSources','arSections','arLatest','arBars','arConcentration','arSourceRows','arFreshness']){
    if(!html.includes('id="'+id+'"')) failures.push(name+': missing #'+id);
  }
  if(!html.includes('/assets/aktual-radar-v1.css')) failures.push(name+': missing Radar CSS');
  if(!html.includes('/assets/aktual-radar-v1.js')) failures.push(name+': missing Radar JS');
  if(/name=["']keywords["']/i.test(html)) failures.push(name+': meta keywords should not be added to Radar');
}
if(!js.includes("fetch('/data/news.json")) failures.push('js: canonical news feed missing');
for(const forbidden of ['localStorage','sessionStorage','sendBeacon','XMLHttpRequest','WebSocket']) if(js.includes(forbidden)) failures.push('js: forbidden browser capability '+forbidden);
if(/fetch\s*\(\s*['"]https?:/i.test(js)) failures.push('js: external fetch is not allowed');
if(!js.includes("aliases={world:'international'")) failures.push('js: canonical section aliases missing');
if(!css.includes('.ar-grid')||!css.includes('.ar-bars')||!css.includes('@media')) failures.push('css: responsive Radar layout incomplete');

const newsroomHr=read(files.newsroomHr),newsroomEn=read(files.newsroomEn),worldJs=read(files.worldJs),sitemap=read(files.sitemap);
if(!newsroomHr.includes('/gnk-aktual/radar/')) failures.push('HR newsroom: Radar link missing');
if(!newsroomEn.includes('/en/gnk-aktual/radar/')) failures.push('EN newsroom: Radar link missing');
if(!worldJs.includes("'/gnk-aktual/radar/'")||!worldJs.includes("'/en/gnk-aktual/radar/'")) failures.push('world JS: dynamic Radar nav missing');
for(const url of ['https://gnk-asg.hr/gnk-aktual/radar/','https://gnk-asg.hr/en/gnk-aktual/radar/']) if(!sitemap.includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);

const taskboard=JSON.parse(read(files.taskboard));
const build=taskboard.tasks?.find(x=>x.id==='BOT-TASK-012');
const maintain=taskboard.tasks?.find(x=>x.id==='BOT-TASK-017');
if(build?.status!=='done') failures.push('taskboard: BOT-TASK-012 must be done');
if(maintain?.status!=='active') failures.push('taskboard: BOT-TASK-017 must be active');

console.log(JSON.stringify({version:'AKTUAL_RADAR_V1_TEST',files:Object.keys(files).length,failures},null,2));
if(failures.length) process.exit(1);
