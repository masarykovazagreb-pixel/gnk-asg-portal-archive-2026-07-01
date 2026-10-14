#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const failures=[];

execFileSync(process.execPath,['scripts/build-aktual-media-weekly-v1.mjs'],{
  env:{...process.env,AKTUAL_WEEKLY_FORCE:'1'},
  stdio:'inherit'
});
execFileSync(process.execPath,['scripts/enforce-nermin-author-seo-v1.mjs'],{stdio:'inherit'});

const files={
  data:'apps/portal/data/aktual-weekly.json',
  hr:'apps/portal/gnk-aktual/tjedni/index.html',
  en:'apps/portal/en/gnk-aktual/weekly/index.html',
  js:'apps/portal/assets/aktual-media-weekly-v1.js',
  css:'apps/portal/assets/aktual-media-weekly-v1.css',
  newsroomHr:'apps/portal/gnk-aktual/index.html',
  newsroomEn:'apps/portal/en/gnk-aktual/index.html',
  worldJs:'apps/portal/assets/aktual-media-world-v1.js',
  menu:'apps/portal/assets/public-unified-menu-v6.js',
  sitemap:'apps/portal/sitemap.xml',
  workflow:'.github/workflows/editorial-scheduled-publish.yml',
  curation:'apps/portal/data/aktual-weekly-curation.json',
  columnsHr:'apps/portal/gnk-aktual/kolumne/index.html',
  columnsEn:'apps/portal/en/gnk-aktual/columns/index.html',
  originalsHr:'apps/portal/gnk-aktual/originali/index.html',
  originalsEn:'apps/portal/en/gnk-aktual/originals/index.html',
  registry:'apps/portal/data/editorial-registry.json'
};
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const d=JSON.parse(read(files.data));
if(d.version!=='AKTUAL_MEDIA_WEEKLY_V1') failures.push('data: version mismatch');
if(!/^\d{4}-\d{2}-\d{2}$/.test(d.issue_week||'')) failures.push('data: issue_week missing');
if((d.counts?.selected_items||0)<12) failures.push('data: too few selected lifestyle stories');
if((d.counts?.sources||0)<4) failures.push('data: source diversity too low');
if((d.sections||[]).length<5) failures.push('data: too few weekly sections');

const forbidden=/\b(war|ukraine|russia|attack|attacker|killed|dies|death|dead|rape|sexual assault|assault|murder|crime|criminal|cancer|disease|poison|poisoned|crisis|accident|injury|injured|hospital|funeral|ceasefire|shooting|bomb|flood|wildfire|mosquito|haze|lawsuit|trial|court|police|gambling|casino|prediction market|betting|poplava|poginuo|poginula|stravičn|nesreć|rat|ubojstvo|bolnica|ozlijeđen|ozlijeđena)\b/i;
const selected=(d.sections||[]).flatMap(sec=>sec.items||[]);
const weeklyImages=selected.map(item=>item.image).filter(Boolean);
if(new Set(weeklyImages).size!==weeklyImages.length) failures.push('data: every weekly story must have a unique topic image');
for(const sec of d.sections||[]){
  if(!sec.id||!sec.label_hr||!sec.label_en) failures.push('data: malformed section');
  for(const item of sec.items||[]){
    const hay=[item.title,item.summary,item.category,item.group].join(' ');
    if(forbidden.test(hay)) failures.push('data: heavy/non-lifestyle item leaked into '+sec.id+': '+item.title);
    if(!item.url||!/^https?:\/\//.test(item.url)) failures.push('data: non-source-linked URL in '+sec.id);
    if(!item.image||!(/^(?:https?:\/\/|\/assets\/)/.test(item.image))) failures.push('data: missing approved source/local image in '+sec.id);
    if(!item.image_credit) failures.push('data: image credit/provenance missing in '+sec.id+': '+item.title);
  }
}

const curation=JSON.parse(read(files.curation));
if(curation.version!=='AKTUAL_MEDIA_WEEKLY_CURATION_V1') failures.push('curation: version mismatch');
if(curation.issue_week!==d.issue_week) failures.push('curation issue_week mismatch');
if(!Array.isArray(curation.items)||curation.items.length<8) failures.push('curation: too few hand-curated items');
for(const item of curation.items||[]){
  if(!item.section||!item.title||!item.url||!item.source) failures.push('curation: malformed item');
  if(!/^https?:\/\//.test(item.url||'')) failures.push('curation: external source URL required');
  if(!item.image||!item.image_credit) failures.push('curation: unique image + image credit required for '+item.title);
}
if(new Set((curation.items||[]).map(x=>x.image)).size!==(curation.items||[]).length) failures.push('curation: duplicate story images are not allowed');

const hr=read(files.hr),en=read(files.en);
for(const [name,html] of [['hr',hr],['en',en]]){
  if(!html.includes('/assets/aktual-media-weekly-v1.css')) failures.push(name+': weekly CSS missing');
  if(!html.includes('/assets/aktual-media-weekly-v1.js')) failures.push(name+': weekly JS missing');
  if(/<meta\s+name=["']keywords["']/i.test(html)) failures.push(name+': meta keywords are not allowed');
  if(!html.includes('"editor":{"@type":"Person","name":"Nermin Sefić"')) failures.push(name+': editor schema missing');
  if(!html.includes('rel="author" href="https://gnk-asg.hr/nermin-sefic/"')) failures.push(name+': rel=author missing');
  if(!html.includes('id="twColumnGrid"')) failures.push(name+': Nermin Sefić columns spotlight missing');
  if(!html.includes('AKTUAL MEDIA')) failures.push(name+': full AKTUAL MEDIA brand missing');
  if(/Učitavanje tjednog izbora|Loading weekly selection/.test(html)) failures.push(name+': weekly page must be pre-rendered, not loader-only');
  for(const item of selected){
    if(!html.includes(item.image)) failures.push(name+': pre-rendered weekly image missing: '+item.image);
  }
}
const weeklyJs=read(files.js);
if(!weeklyJs.includes('image_credit')) failures.push('weekly JS: image credit support missing');
const columnsHr=read(files.columnsHr),columnsEn=read(files.columnsEn);
const hrColumnsSection=(columnsHr.match(/<section id="columns"[^>]*>([\s\S]*?)<\/section>/i)||[])[1]||'';
const enColumnsSection=(columnsEn.match(/<section id="columns"[^>]*>([\s\S]*?)<\/section>/i)||[])[1]||'';
if(!/class="card"/.test(hrColumnsSection)||!(/class="card"/.test(enColumnsSection))) failures.push('columns hubs must contain pre-rendered cards');
if(/<p class="empty">/.test(hrColumnsSection)||/<p class="empty">/.test(enColumnsSection)) failures.push('columns hubs must not render loader placeholders in the canonical HTML section');
const registry=JSON.parse(read(files.registry));
const hrRegistry=(registry.items||[]).filter(x=>x.language==='hr'&&x.path);
const enRegistry=(registry.items||[]).filter(x=>x.language==='en'&&x.path);
const originalsHr=read(files.originalsHr),originalsEn=read(files.originalsEn);
for(const item of hrRegistry) if(!originalsHr.includes('href="'+item.path+'"')) failures.push('HR originals archive missing '+item.path);
for(const item of enRegistry) if(!originalsEn.includes('href="'+item.path+'"')) failures.push('EN originals archive missing '+item.path);
if(!read(files.newsroomHr).includes('/gnk-aktual/tjedni/')) failures.push('HR newsroom: weekly link missing');
if(!read(files.newsroomEn).includes('/en/gnk-aktual/weekly/')) failures.push('EN newsroom: weekly link missing');
if(!read(files.worldJs).includes("'/gnk-aktual/tjedni/'")) failures.push('world nav: weekly route missing');
if(!read(files.menu).includes("['AKTUAL MEDIA TJEDNI','AKTUAL MEDIA WEEKLY'")) failures.push('unified menu: weekly entry missing');
for(const url of ['https://gnk-asg.hr/gnk-aktual/tjedni/','https://gnk-asg.hr/en/gnk-aktual/weekly/']) if(!read(files.sitemap).includes('<loc>'+url+'</loc>')) failures.push('sitemap missing '+url);
const wf=read(files.workflow);
if(!wf.includes('build-aktual-media-weekly-v1.mjs')) failures.push('workflow: weekly builder not integrated');
if(!wf.includes('apps/portal/data/aktual-weekly.json')) failures.push('workflow: weekly data not staged by single writer');
if(!wf.includes('apps/portal/data/aktual-weekly-curation.json')) failures.push('workflow: curated weekly seed not watched');
if(!wf.includes('scripts/enforce-nermin-author-seo-v1.mjs')) failures.push('workflow: author SEO maintenance missing');

console.log(JSON.stringify({version:'AKTUAL_MEDIA_WEEKLY_CONTRACT_V1',issue_week:d.issue_week,counts:d.counts,failures},null,2));
if(failures.length) process.exit(1);
