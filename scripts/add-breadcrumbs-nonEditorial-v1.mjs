// GNK ASG — BreadcrumbList JSON-LD for key non-editorial pages
// (naslovnica, AKTUAL, /ai/, /feed/, section indexes).
// Aditivno: samo ako BreadcrumbList već ne postoji na stranici.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const SITE='https://gnk-asg.hr';

const PAGES=[
 {file:'apps/portal/index.html', lang:'hr', crumbs:[['Naslovnica','/']]},
 {file:'apps/portal/en/index.html', lang:'en', crumbs:[['Home','/en/']]},
 {file:'apps/portal/gnk-aktual/index.html', lang:'hr', crumbs:[['Naslovnica','/'],['AKTUAL MEDIA','/gnk-aktual/']]},
 {file:'apps/portal/en/gnk-aktual/index.html', lang:'en', crumbs:[['Home','/en/'],['AKTUAL MEDIA','/en/gnk-aktual/']]},
 {file:'apps/portal/ai/index.html', lang:'en', crumbs:[['Home','/'],['AI / LLM Endpoint','/ai/']]},
 {file:'apps/portal/feed/index.html', lang:'hr', crumbs:[['Naslovnica','/'],['Feedovi','/feed/']]},
 {file:'apps/portal/en/feed/index.html', lang:'en', crumbs:[['Home','/en/'],['Feeds','/en/feed/']]},
 {file:'apps/portal/objave/index.html', lang:'hr', crumbs:[['Naslovnica','/'],['Objave','/objave/']]},
 {file:'apps/portal/en/publications/index.html', lang:'en', crumbs:[['Home','/en/'],['Publications','/en/publications/']]},
 {file:'apps/portal/analize/index.html', lang:'hr', crumbs:[['Naslovnica','/'],['Analize','/analize/']]},
 {file:'apps/portal/komentari/index.html', lang:'hr', crumbs:[['Naslovnica','/'],['Komentari','/komentari/']]},
];

let added=0, skipped=0;
for(const p of PAGES){
  if(!existsSync(p.file)) continue;
  let html=readFileSync(p.file,'utf8');
  if(/"@type"\s*:\s*"BreadcrumbList"/.test(html)){ skipped++; continue; }
  const items=p.crumbs.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:SITE+path}));
  const bl={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items};
  html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(bl)}</script></head>`);
  writeFileSync(p.file,html); added++;
}
console.log(JSON.stringify({breadcrumbAdded:added,alreadyPresent:skipped},null,2));
