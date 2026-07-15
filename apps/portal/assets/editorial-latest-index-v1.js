(()=>{
'use strict';
const VERSION='GNK_EDITORIAL_LATEST_INDEX_V1_20260715';
if(window.__GNK_EDITORIAL_LATEST_INDEX_V1__)return;
window.__GNK_EDITORIAL_LATEST_INDEX_V1__=true;
const route=location.pathname.replace(/\/+$/,'')||'/';
const type=route==='/objave'?'objava':route==='/komentari'?'komentar':'';
if(!type)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=async url=>{const r=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw new Error(`${url}:${r.status}`);return r.json()};
const date=value=>{try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value))}catch{return''}};
async function run(){
  const main=document.querySelector('main')||document.body;
  if(!main||document.getElementById('gnk-latest-editorial'))return;
  const manifest=await read('/data/editorial-plan/manifest.json');
  const packages=(manifest.packages||[]).filter(p=>p.status==='published').sort((a,b)=>Date.parse(b.publishedAt||b.publishAt||0)-Date.parse(a.publishedAt||a.publishAt||0));
  const rows=[];
  for(const pkg of packages){
    for(const file of (pkg.files||[])){
      const items=await read(`/data/editorial-plan/${file}`);
      for(const item of (Array.isArray(items)?items:[]))if(item.type===type)rows.push({...item,publishedAt:pkg.publishedAt||pkg.publishAt});
    }
  }
  const seen=new Set();
  const items=rows.filter(item=>{if(!item.slug||seen.has(item.slug))return false;seen.add(item.slug);return true}).slice(0,24);
  if(!items.length)return;
  const section=document.createElement('section');
  section.id='gnk-latest-editorial';
  section.setAttribute('data-version',VERSION);
  section.style.cssText='margin:24px auto 34px;padding:22px;border:1px solid rgba(184,138,47,.35);border-radius:18px;background:#fff;max-width:1180px';
  section.innerHTML=`<p style="margin:0 0 7px;font-weight:800;color:#8c641f;letter-spacing:.08em;text-transform:uppercase">Najnovije</p><h2 style="margin:0 0 18px;color:#071a38">${type==='objava'?'Najnovije objave':'Najnoviji komentari'}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${items.map(item=>`<a href="/${type==='objava'?'objave':'komentari'}/${encodeURIComponent(item.slug)}/" style="display:block;padding:16px;border:1px solid #e5e7eb;border-radius:14px;color:#111827;text-decoration:none;background:#fff"><small style="font-weight:800;color:#8c641f">${esc(item.section||type)} · ${esc(date(item.publishedAt))}</small><h3 style="margin:8px 0;font-size:18px;line-height:1.3">${esc(item.title)}</h3><p style="margin:0;color:#526071;line-height:1.55">${esc(item.summary||item.description||'')}</p></a>`).join('')}</div>`;
  const anchor=main.querySelector('h1')?.closest('section,header,div');
  if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',section);else main.prepend(section);
}
run().catch(error=>{document.documentElement.dataset.gnkEditorialLatestError=String(error?.message||error).slice(0,120)});
})();
