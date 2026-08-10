// GNK ASG — dodaje share buttons (Facebook, X/Twitter, LinkedIn, Copy link)
// u tijelo svakog editorial članka. Aditivno: preskače stranice koje već
// imaju share widget (data-share-buttons ili class="ak-share").
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const reg=read('apps/portal/data/editorial-registry.json',{items:[]});
let added=0, skipped=0;
const isEn=lang=>lang==='en';
function shareBlock(url, title, lang){
  const en=isEn(lang);
  const u=encodeURIComponent(url); const t=encodeURIComponent(title||'');
  const L={
    label: en?'Share this article':'Podijeli članak',
    fb:'Facebook', x:'X (Twitter)', li:'LinkedIn', wa:'WhatsApp',
    copy: en?'Copy link':'Kopiraj link'
  };
  return `<aside class="ak-share" data-share-buttons style="margin:32px 0 24px;padding:16px 18px;border:1px solid rgba(255,255,255,.14);border-radius:6px;background:rgba(255,255,255,.03)">
<div style="font-family:Arial,sans-serif;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ak-sub,#aaa);margin-bottom:10px">${L.label}</div>
<div style="display:flex;flex-wrap:wrap;gap:10px">
<a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener nofollow" aria-label="Share on Facebook" style="padding:8px 14px;background:#1877f2;color:#fff;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;font-size:.85rem;font-weight:700">${L.fb}</a>
<a href="https://twitter.com/intent/tweet?url=${u}&text=${t}" target="_blank" rel="noopener nofollow" aria-label="Share on X" style="padding:8px 14px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;font-size:.85rem;font-weight:700">${L.x}</a>
<a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener nofollow" aria-label="Share on LinkedIn" style="padding:8px 14px;background:#0a66c2;color:#fff;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;font-size:.85rem;font-weight:700">${L.li}</a>
<a href="https://api.whatsapp.com/send?text=${t}%20${u}" target="_blank" rel="noopener nofollow" aria-label="Share on WhatsApp" style="padding:8px 14px;background:#25d366;color:#fff;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;font-size:.85rem;font-weight:700">${L.wa}</a>
<button type="button" onclick="navigator.clipboard.writeText('${url}').then(()=>{this.textContent='✓';setTimeout(()=>{this.textContent='${L.copy}'},1500)})" style="padding:8px 14px;background:transparent;color:var(--ak-text,#eee);border:1px solid rgba(255,255,255,.3);border-radius:4px;cursor:pointer;font-family:Arial,sans-serif;font-size:.85rem;font-weight:700">${L.copy}</button>
</div>
</aside>`;
}

for(const it of reg.items||[]){
  if(!it?.path||!it?.url) continue;
  const file='apps/portal'+it.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  if(/data-share-buttons|class="ak-share"/.test(html)){skipped++;continue;}
  const bodyM=html.match(/<article[^>]*class="[^"]*article-body[^"]*"[^>]*>[\s\S]*?<\/article>/i);
  if(!bodyM) continue;
  const lang=it.language||(it.path.startsWith('/en/')?'en':'hr');
  const block=shareBlock(it.url, String(it.title||'').replace(/\|.*$/,'').trim(), lang);
  // insert before </article>
  const newBody=bodyM[0].replace(/<\/article>\s*$/,'') + block + '</article>';
  html=html.replace(bodyM[0], newBody);
  writeFileSync(file, html); added++;
}
console.log(JSON.stringify({shareBlocksAdded:added,alreadyPresent:skipped},null,2));
