// GNK ASG — dodaje <link rel="alternate" type="application/rss+xml"> u <head>
// svake stranice koja to još nema — HR feed za HR stranice, EN feed za EN.
// Aditivno, minimalno.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT='apps/portal';
const SKIP=new Set(['admin','admin-center','control','automation-status','webmail','mail-studio','campaign-mailer','email-status','worker-ops','operator-dashboard','digital-headquarters','media-registration-admin','podijeli','api','assets','data','__preview']);
const pages=[];
(function walk(dir){
  for(const n of readdirSync(dir)){
    const p=join(dir,n); let st;
    try{ st=statSync(p); }catch{continue;}
    if(st.isDirectory()){ if(dir===ROOT&&SKIP.has(n)) continue;
      const parts=p.substring(ROOT.length+1).split('/'); if(parts[0]==='en'&&parts[1]&&SKIP.has(parts[1])) continue;
      walk(p); }
    else if(n==='index.html') pages.push(p);
  }
})(ROOT);
let added=0;
for(const file of pages){
  let html=readFileSync(file,'utf8');
  if(/rel="alternate"[^>]+application\/rss\+xml/i.test(html)) continue;
  const isEn=/<html[^>]+lang="en"/i.test(html);
  const feed=isEn?'/en/feed.xml':'/feed.xml';
  const atom=isEn?'/en/atom.xml':'/atom.xml';
  html=html.replace('</head>',`<link rel="alternate" type="application/rss+xml" title="GNK ASG RSS" href="${feed}"><link rel="alternate" type="application/atom+xml" title="GNK ASG Atom" href="${atom}"></head>`);
  writeFileSync(file,html); added++;
}
console.log(JSON.stringify({feedDiscoveryAdded:added,scanned:pages.length},null,2));
