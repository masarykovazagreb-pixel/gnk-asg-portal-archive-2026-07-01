// GNK ASG — Share buttons row for editorial pages (Facebook, LinkedIn, X, Copy URL).
// Aditivno: dodaje <div class="ak-share"> na kraj svakog editorial <article class="article-body">
// (samo ako ne postoji). Native share URLs; nema tracking-a, nema third-party skripti.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const reg=read('apps/portal/data/editorial-registry.json',{items:[]});
const SITE='https://gnk-asg.hr';
const enc=s=>encodeURIComponent(s);

let added=0, skipped=0;
for(const it of reg.items||[]){
  if(!it?.path||!it?.url) continue;
  const file='apps/portal'+it.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  if(/class="ak-share"/.test(html)){ skipped++; continue; }
  const bodyM=html.match(/<article[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  if(!bodyM) continue;
  const isEn=(it.language==='en'||it.path.startsWith('/en/'));
  const L=isEn ? {t:'Share:',fb:'Facebook',li:'LinkedIn',x:'X (Twitter)',cp:'Copy link',cd:'Copied ✓',w:'WhatsApp'}
              : {t:'Podijeli:',fb:'Facebook',li:'LinkedIn',x:'X (Twitter)',cp:'Kopiraj link',cd:'Kopirano ✓',w:'WhatsApp'};
  const url=it.url;
  const title=String(it.title||'').replace(/\s*\|.*$/,'').trim();
  const share=`<div class="ak-share" role="group" aria-label="${L.t}"><strong>${L.t}</strong>`+
    `<a href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${L.fb}">${L.fb}</a>`+
    `<a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${L.li}">${L.li}</a>`+
    `<a href="https://twitter.com/intent/tweet?url=${enc(url)}&amp;text=${enc(title)}" target="_blank" rel="noopener noreferrer" aria-label="${L.x}">${L.x}</a>`+
    `<a href="https://api.whatsapp.com/send?text=${enc(title+' — '+url)}" target="_blank" rel="noopener noreferrer" aria-label="${L.w}">${L.w}</a>`+
    `<button type="button" class="ak-share-copy" data-url="${url}" data-copied="${L.cd}" style="background:none;border:1px solid currentColor;color:inherit;font:inherit;padding:6px 12px;border-radius:4px;cursor:pointer">${L.cp}</button>`+
    `</div>`+
    `<script>(function(){var b=document.currentScript.previousElementSibling.querySelector('.ak-share-copy');if(!b)return;b.addEventListener('click',function(){navigator.clipboard&&navigator.clipboard.writeText(b.dataset.url).then(function(){var t=b.textContent;b.textContent=b.dataset.copied;setTimeout(function(){b.textContent=t},1800)})})})();</script>`;
  const newBody=bodyM[0].replace(/<\/article>$/i, share+'</article>');
  html=html.replace(bodyM[0], newBody);
  writeFileSync(file, html);
  added++;
}
console.log(JSON.stringify({shareAdded:added,alreadyPresent:skipped},null,2));
