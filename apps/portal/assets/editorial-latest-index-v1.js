(()=>{
'use strict';
const VERSION='GNK_EDITORIAL_LATEST_INDEX_V1_20260805_DINAMO_COMMENT';
if(window.__GNK_EDITORIAL_LATEST_INDEX_V1__)return;
window.__GNK_EDITORIAL_LATEST_INDEX_V1__=true;
const route=location.pathname.replace(/\/+$/,'')||'/';
const type=route==='/objave'?'objava':route==='/komentari'?'komentar':'';
if(!type)return;
const FEATURED_COMMENT={slug:'nermin-sefic-dinamo-cinjenice-pravo-dogovor',type:'komentar',section:'Pravo, poduzetništvo i sport',title:'Nermin Sefić: Dinamo nije protivnik — činjenice, pravo i otvorena ponuda za dogovor',summary:'Privremena mjera nije pravomoćna presuda. Registracija podružnice nije sama po sebi tržišna uporaba žiga, a ponuda od milijun eura pokazuje spremnost na ulaganje, razgraničenje i miran dogovor.',publishedAt:'2026-08-05T14:10:00+02:00',image:'/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=async url=>{const r=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw new Error(`${url}:${r.status}`);return r.json()};
const date=value=>{try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value))}catch{return''}};
async function run(){
 const main=document.querySelector('main')||document.body;if(!main||document.getElementById('gnk-latest-editorial'))return;
 const manifest=await read('/data/editorial-plan/manifest.json');
 const packages=(manifest.packages||[]).filter(p=>p.status==='published').sort((a,b)=>Date.parse(b.publishedAt||b.publishAt||0)-Date.parse(a.publishedAt||a.publishAt||0));
 const rows=[];for(const pkg of packages){for(const file of(pkg.files||[])){const items=await read(`/data/editorial-plan/${file}`);for(const item of(Array.isArray(items)?items:[]))if(item.type===type)rows.push({...item,publishedAt:pkg.publishedAt||pkg.publishAt});}}
 const source=type==='komentar'?[FEATURED_COMMENT,...rows]:rows;const seen=new Set();const items=source.filter(item=>{if(!item.slug||seen.has(item.slug))return false;seen.add(item.slug);return true}).slice(0,24);if(!items.length)return;
 const section=document.createElement('section');section.id='gnk-latest-editorial';section.setAttribute('data-version',VERSION);section.style.cssText='margin:24px auto 34px;padding:22px;border:1px solid rgba(184,138,47,.35);border-radius:18px;background:#fff;max-width:1180px';
 const cards=items.map((item,index)=>`<a href="/${type==='objava'?'objave':'komentari'}/${encodeURIComponent(item.slug)}/" style="display:${index===0&&type==='komentar'?'grid':'block'};grid-template-columns:${index===0&&type==='komentar'?'repeat(auto-fit,minmax(190px,1fr))':'none'};grid-column:${index===0&&type==='komentar'?'1 / -1':'auto'};gap:${index===0&&type==='komentar'?'18px':'0'};padding:${index===0&&type==='komentar'?'0':'16px'};border:${index===0&&type==='komentar'?'2px solid #8c641f':'1px solid #e5e7eb'};border-radius:14px;color:#111827;text-decoration:none;background:#fff;overflow:hidden">${index===0&&type==='komentar'?`<img src="${esc(item.image)}" alt="${esc(item.title)}" style="width:100%;height:100%;min-height:210px;max-height:340px;object-fit:cover">`:''}<span style="display:block;padding:${index===0&&type==='komentar'?'22px':'0'}"><small style="font-weight:800;color:#8c641f">${index===0&&type==='komentar'?'ISTAKNUTI KOMENTAR · AKTUAL MEDIA · ':''}${esc(item.section||type)} · ${esc(date(item.publishedAt))}</small><h3 style="margin:8px 0;font-size:${index===0&&type==='komentar'?'24px':'18px'};line-height:1.3">${esc(item.title)}</h3><p style="margin:0;color:#526071;line-height:1.55">${esc(item.summary||item.description||'')}</p></span></a>`).join('');
 section.innerHTML=`<p style="margin:0 0 7px;font-weight:800;color:#8c641f;letter-spacing:.08em;text-transform:uppercase">Najnovije</p><h2 style="margin:0 0 18px;color:#071a38">${type==='objava'?'Najnovije objave':'Najnoviji komentari'}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${cards}</div>`;
 const anchor=main.querySelector('h1')?.closest('section,header,div');if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',section);else main.prepend(section);
}
run().catch(error=>{document.documentElement.dataset.gnkEditorialLatestError=String(error?.message||error).slice(0,120)});
})();
