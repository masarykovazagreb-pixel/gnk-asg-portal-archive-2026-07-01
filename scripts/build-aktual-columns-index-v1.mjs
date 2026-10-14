#!/usr/bin/env node
import fs from 'node:fs';

const DATA='apps/portal/data/kolumne.json';
const HR='apps/portal/gnk-aktual/kolumne/index.html';
const EN='apps/portal/en/gnk-aktual/columns/index.html';
const WEEK_HR='apps/portal/gnk-aktual/tjedni/index.html';
const WEEK_EN='apps/portal/en/gnk-aktual/weekly/index.html';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=s=>String(s||'').replace(/\s+/g,' ').trim();
const doc=JSON.parse(fs.readFileSync(DATA,'utf8'));
const items=(Array.isArray(doc)?doc:(doc.items||[])).slice().sort((a,b)=>String(b.objavljeno||'').localeCompare(String(a.objavljeno||'')));
const pool=[
  '/assets/gallery/transparentno-upravljanje-violet-innovation-04-v2.svg',
  '/assets/gallery/inovacija-i-ai-teal-stability-06-v2.svg',
  '/assets/gallery/operativna-otpornost-violet-innovation-14-v2.svg',
  '/assets/gallery/financijska-stabilnost-bronze-heritage-09-v2.svg',
  '/assets/gallery/kiberneticka-sigurnost-steel-infrastructure-08-v2.svg',
  '/assets/gallery/strateski-projekti-emerald-growth-12-v2.svg'
];
const fallback=x=>pool[[...String(x.naslov||x.slug||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%pool.length];

function render(lang,limit=Infinity,weekly=false){
  return items.slice(0,limit).map(x=>{
    const en=lang==='en';
    const title=en?(x.naslov_en||x.naslov):x.naslov;
    const summary=en?(x.meta_opis_en||x.tekst_en||x.meta_opis||x.tekst||''):(x.meta_opis||x.tekst||'');
    const url=en?(x.url_en||x.url):x.url;
    const img=x.slika||fallback(x);
    const cls=weekly?'tw-card tw-column-card':'card';
    const body=weekly?'tw-card-body':'body';
    const tag=x.tag||(en?'Column · Nermin Sefić':'Kolumna Nermina Sefića');
    const date=String(x.objavljeno||'').slice(0,10);
    return '<a class="'+cls+'" href="'+esc(url)+'"><img loading="lazy" width="1600" height="900" src="'+esc(img)+'" alt="'+esc(title)+' — Nermin Sefić"><div class="'+body+'"><span class="tag">'+esc(tag)+'</span><h2>'+esc(title)+'</h2><p class="summary">'+esc(text(summary).slice(0,180))+(text(summary).length>180?'…':'')+'</p><div class="meta">'+esc(date)+' · AKTUAL MEDIA</div></div></a>';
  }).join('');
}
function writeIfChanged(path,next){
  const before=fs.readFileSync(path,'utf8');
  if(before===next)return false;
  fs.writeFileSync(path,next); return true;
}
function updateColumns(path,lang){
  const html=fs.readFileSync(path,'utf8');
  const next=html.replace(/<section id="columns" class="grid" aria-live="polite">[\s\S]*?<\/section>/,
    '<section id="columns" class="grid" aria-live="polite">'+render(lang)+'</section>');
  if(next===html)throw new Error(path+': columns marker missing or unchanged unexpectedly');
  return writeIfChanged(path,next);
}
function updateWeekly(path,lang){
  const html=fs.readFileSync(path,'utf8');
  const next=html.replace(/<div class="tw-grid" id="twColumnGrid">[\s\S]*?<\/div><p>/,
    '<div class="tw-grid" id="twColumnGrid">'+render(lang,3,true)+'</div><p>');
  if(next===html)throw new Error(path+': weekly columns marker missing or unchanged unexpectedly');
  return writeIfChanged(path,next);
}
const changed=[
  updateColumns(HR,'hr'),
  updateColumns(EN,'en'),
  updateWeekly(WEEK_HR,'hr'),
  updateWeekly(WEEK_EN,'en')
];
console.log(JSON.stringify({version:'AKTUAL_COLUMNS_STATIC_INDEX_V1',items:items.length,changed},null,2));
