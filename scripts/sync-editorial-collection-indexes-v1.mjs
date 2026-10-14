#!/usr/bin/env node
import fs from 'node:fs';

const REG='apps/portal/data/editorial-registry.json';
const CONFIG={
  objava:{file:'apps/portal/objave/index.html',label:'Objava',cta:'Otvori objavu →'},
  komentar:{file:'apps/portal/komentari/index.html',label:'Komentar',cta:'Otvori komentar →'},
  analiza:{file:'apps/portal/analize/index.html',label:'Analiza',cta:'Otvori analizu →'}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localImage=url=>{
  const s=String(url||'');
  if(s.startsWith('https://gnk-asg.hr/'))return s.slice('https://gnk-asg.hr'.length);
  if(s.startsWith('/'))return s;
  return '/assets/gnk-asg-social-card.png';
};
const reg=JSON.parse(fs.readFileSync(REG,'utf8'));
const hr=(reg.items||[]).filter(x=>x.language==='hr'&&CONFIG[x.type]);
const result={version:'EDITORIAL_INDEX_SYNC_V1',added:{objava:0,komentar:0,analiza:0},total:0};

for(const [type,cfg] of Object.entries(CONFIG)){
  let html=fs.readFileSync(cfg.file,'utf8');
  const start=html.indexOf('<section class="editorial-grid">');
  const end=start>=0?html.indexOf('</section>',start):-1;
  if(start<0||end<0)throw new Error('Editorial grid marker missing: '+cfg.file);
  const items=hr.filter(x=>x.type===type).sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
  const cards=[];
  for(const item of items){
    if(html.includes('href="'+item.path+'"'))continue;
    const date=String(item.publishedAt||'').slice(0,10);
    const image=localImage(item.image);
    cards.push('<article class="editorial-card" data-registry-synced="1"><img src="'+esc(image)+'" width="1200" height="675" alt="'+esc(item.title)+'" loading="lazy"><p class="eyebrow">'+esc(cfg.label+(date?' · '+date:''))+'</p><h2>'+esc(item.title)+'</h2><p>'+esc(String(item.description||'').replace(/\s+/g,' ').trim().slice(0,220))+'</p><a href="'+esc(item.path)+'">'+esc(cfg.cta)+'</a></article>');
    result.added[type]++;
  }
  if(cards.length){
    html=html.slice(0,end)+cards.join('')+html.slice(end);
    fs.writeFileSync(cfg.file,html);
  }
}
result.total=Object.values(result.added).reduce((a,b)=>a+b,0);
console.log(JSON.stringify(result,null,2));
