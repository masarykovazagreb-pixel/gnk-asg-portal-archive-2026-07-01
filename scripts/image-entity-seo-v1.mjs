// GNK ASG — Image entity SEO: obogaćuje alt/title atribute entitetima
// (Nermin Sefić, GNK ASG, GNK DINAMO Ltd.) na sigurni način:
//  - samo DODAJE alt/title gdje nedostaje ili nadopunjuje gdje entitet fali
//  - nikad ne uklanja/mijenja postojeći smisleni sadržaj
//  - preskače <script> blokove (JS predlošci) i zaštićene admin rute
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT='apps/portal';
const SKIP=new Set(['admin','admin-center','control','automation-status','webmail','mail-studio','campaign-mailer','email-status','worker-ops','operator-dashboard','digital-headquarters','media-registration-admin','podijeli','api','assets','data']);
const pages=[];
(function walk(dir){
  for(const n of readdirSync(dir)){
    const p=join(dir,n);
    const st=statSync(p);
    if(st.isDirectory()){ if(dir===ROOT&&SKIP.has(n))continue; walk(p); }
    else if(n==='index.html') pages.push(p);
  }
})(ROOT);
console.log('pages:',pages.length);

const stats={filesChanged:0,altAdded:0,altEnriched:0,titleAdded:0};
for(const file of pages){
  let html=readFileSync(file,'utf8');
  const isEn=/<html[^>]+lang="en"/i.test(html);
  // mask script blocks
  const scripts=[];
  let masked=html.replace(/<script[\s\S]*?<\/script>/gi,m=>{scripts.push(m);return `\u0000S${scripts.length-1}\u0000`;});
  let changed=false;
  masked=masked.replace(/<img\b[^>]*>/gi,(tag)=>{
    const src=(tag.match(/src="([^"]*)"/i)||[])[1]||'';
    const isPerson=/\/assets\/people\/nermin-sefic\//.test(src);
    const isLogo=/logo-gnk-asg/.test(src);
    const isChart=/\/assets\/editorial\/world-topics\//.test(src);
    if(!isPerson&&!isLogo&&!isChart) return tag;
    let t=tag;
    const altM=t.match(/alt="([^"]*)"/i);
    const alt=altM?altM[1]:null;
    const personAlt=isEn?'Nermin Sefić — Director, GNK ASG d.o.o. | GNK DINAMO Ltd.':'Nermin Sefić — direktor GNK ASG d.o.o. | GNK DINAMO Ltd.';
    const logoAlt='GNK ASG d.o.o. — GNK DINAMO Ltd. Group';
    if(alt===null||alt.trim()===''){
      const val=isPerson?personAlt:(isLogo?logoAlt:(isEn?'Data chart · Nermin Sefić / GNK ASG':'Grafički prikaz · Nermin Sefić / GNK ASG'));
      t = alt===null ? t.replace(/<img\b/i,`<img alt="${val}"`) : t.replace(/alt="[^"]*"/i,`alt="${val}"`);
      stats.altAdded++; changed=true;
    } else if(isPerson&&!/sefi[ćc]/i.test(alt)){
      // "Nermin" -> "Nermin Sefić"; sve ostalo dobiva prefiks pune imenske kombinacije
      const enriched=/\bnermin\b/i.test(alt) ? alt.replace(/\bnermin\b/i,'Nermin Sefić') : `${alt} — Nermin Sefić (Sefic Nermin), GNK ASG`;
      t=t.replace(/alt="([^"]*)"/i,`alt="${enriched}"`);
      stats.altEnriched++; changed=true;
    } else if(isLogo&&!/gnk/i.test(alt)){
      t=t.replace(/alt="([^"]*)"/i,(m,a)=>`alt="${a} — GNK ASG"`);
      stats.altEnriched++; changed=true;
    } else if(isChart&&!/sefi[ćc]|gnk/i.test(alt)){
      t=t.replace(/alt="([^"]*)"/i,(m,a)=>`alt="${a} · Nermin Sefić / GNK ASG"`);
      stats.altEnriched++; changed=true;
    }
    if(isPerson&&!/title="/i.test(t)){
      t=t.replace(/<img\b/i,'<img title="Nermin Sefić (Sefic Nermin) — GNK ASG · GNK DINAMO Ltd."');
      stats.titleAdded++; changed=true;
    }
    return t;
  });
  if(changed){
    const out=masked.replace(/\u0000S(\d+)\u0000/g,(m,i)=>scripts[+i]);
    writeFileSync(file,out);
    stats.filesChanged++;
  }
}
console.log(JSON.stringify(stats,null,2));
