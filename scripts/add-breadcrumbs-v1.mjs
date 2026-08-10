// GNK ASG — BreadcrumbList JSON-LD for editorial pages.
// Aditivno: dodaje BreadcrumbList schema (Home → Kategorija → Članak) u <head>
// samo ako još ne postoji na stranici. Sekcijski labeli lokalizirani HR/EN.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const SITE='https://gnk-asg.hr';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const reg=read('apps/portal/data/editorial-registry.json',{items:[]});

const LABELS={
 hr:{home:'Naslovnica', analize:'Analize', kolumne:'Kolumne', komentari:'Komentari', objave:'Objave', tematske:'Tematske stranice'},
 en:{home:'Home', analyses:'Analyses', publications:'Publications', kolumne:'Kolumne', komentari:'Komentari', tematske:'Themes'}
};

let updated=0, skipped=0;
for(const it of reg.items||[]){
  if(!it?.path||!it?.url) continue;
  const file='apps/portal'+it.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  if(/"@type"\s*:\s*"BreadcrumbList"/.test(html)){ skipped++; continue; }

  const lang=(it.language==='en'||it.path.startsWith('/en/'))?'en':'hr';
  const L=LABELS[lang];
  const parts=it.path.replace(/^\/|\/$/g,'').split('/');
  // trim locale prefix
  const rel = parts[0]==='en' ? parts.slice(1) : parts;

  const list=[];
  list.push({'@type':'ListItem',position:1,name:L.home,item: lang==='en'?`${SITE}/en/`:`${SITE}/`});
  if(rel.length>=2){
    const section=rel[0];
    const sectionName=L[section]||section;
    const sectionUrl=lang==='en'?`${SITE}/en/${section}/`:`${SITE}/${section}/`;
    list.push({'@type':'ListItem',position:2,name:sectionName,item:sectionUrl});
    list.push({'@type':'ListItem',position:3,name:String(it.title||rel[rel.length-1]).replace(/\s*\|.*$/,'').trim(),item:it.url});
  }
  const bl={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:list};
  html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(bl)}</script></head>`);
  writeFileSync(file,html); updated++;
}
console.log(JSON.stringify({breadcrumbAdded:updated,alreadyPresent:skipped},null,2));
