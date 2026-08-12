(()=>{
'use strict';
const cleanPath=(location.pathname||'/').replace(/\/+$/,'')||'/';
if(cleanPath!=='/gnk-aktual'&&cleanPath!=='/en/gnk-aktual')return;
const english=cleanPath.startsWith('/en/');
const archiveUrl=english?'/en/gnk-aktual/columns/':'/gnk-aktual/kolumne/';
const title=english?'Nermin Sefić — Columns':'Nermin Sefić — Kolumne';
const eyebrow=english?'Columns · complete archive':'Kolumne · cjelovita arhiva';
const cta=english?'Open all columns →':'Otvori sve kolumne →';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderHub(image,count){
  const card=document.getElementById('akKolumna');
  const author=card&&card.querySelector('.ak-kolumna-autor');
  const body=document.getElementById('akKolumnaTijelo');
  if(!card||!author||!body)return;
  const safeImage=image||'/assets/editorial/aktual-media-800.webp';
  const countText=count?`<span style="display:inline-block;margin-left:7px;opacity:.72;font-size:.78em">${count} ${english?'columns':'kolumni'}</span>`:'';
  author.innerHTML='<img src="'+esc(safeImage)+'" alt="Nermin Sefić" width="92" height="92" loading="lazy" style="width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid var(--ak-zlato);margin-bottom:10px" onerror="this.src=\'/assets/editorial/aktual-media-800.webp\'"><b>Nermin Sefić</b><span>'+(english?'Columnist, GNK ASG':'Kolumnist, GNK ASG')+'</span>';
  body.innerHTML='<span class="oznaka">'+eyebrow+countText+'</span><h2>'+title+'</h2><p>'+(english?'All columns are collected in one place. Open the archive to browse every column.':'Sve kolumne nalaze se na jednom mjestu. Otvorite arhivu za pregled svih kolumni.')+'</p><a href="'+archiveUrl+'">'+cta+'</a>';
  card.classList.add('vidljivo');
  card.style.display='';
}

function collapseColumns(root){
  const scope=root||document;
  const selectors='a[href^="/gnk-aktual/kolumne/"],a[href^="/en/gnk-aktual/columns/"]';
  scope.querySelectorAll(selectors).forEach(link=>{
    if(link.closest('#akKolumna'))return;
    if(link.getAttribute('href')===archiveUrl)return;
    const row=link.closest('.ak-card,.ak-komentar-kartica,.ak-komentar-istaknuti,li,article,.card,[class*="column"],[class*="kolumn"]');
    if(row&&row.id!=='akKolumna')row.remove();
    else link.style.display='none';
  });
  document.querySelectorAll('[data-columns-grid],.ak-kolumne-grid,.ak-columns-grid').forEach(el=>{if(!el.closest('#akKolumna'))el.remove();});
}

function classify(item){
  const t=((item.title||'')+' '+(item.summary||'')+' '+(item.category||'')+' '+(item.group||'')).toLowerCase();
  if(/war|military|defen|security|nato|ukrain|russia|iran|israel|conflict|rat|vojn|sigurn/.test(t))return 'security';
  if(/market|stock|bank|finance|econom|inflation|rate|fed|ecb|bitcoin|crypto|gold|oil|trži|burz|banka/.test(t))return 'markets';
  if(/energy|oil|gas|pipeline|trade|shipping|port|cargo|supply|energ|nafta|plin|trgov/.test(t))return 'energy';
  if(/weather|storm|flood|fire|earthquake|climate|hurricane|vrijeme|potres|požar|poplav/.test(t))return 'natural';
  if(/outage|sanction|blackout|disruption|cyber|prekid|sankc/.test(t))return 'disruption';
  return 'technology';
}

function injectIntelStyles(){
  if(document.getElementById('akIntelStyles'))return;
  const s=document.createElement('style');s.id='akIntelStyles';s.textContent=`
  .ak-intel{margin:34px 0 48px;border:2px solid var(--ak-line);background:var(--ak-panel);padding:22px;border-radius:6px}
  .ak-intel-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.ak-intel-head h2{margin:0;font-family:Arial Black,Impact,sans-serif;font-size:1.35rem}.ak-intel-head p{margin:4px 0 0;color:var(--ak-sub);font-family:Arial,sans-serif;font-size:.82rem}.ak-intel-ext{color:var(--ak-red);font:800 .78rem Arial,sans-serif;text-decoration:none;white-space:nowrap}
  .ak-intel-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 16px}.ak-intel-tabs button{border:1px solid var(--ak-line);background:transparent;color:var(--ak-text);padding:7px 10px;border-radius:999px;font:800 .7rem Arial,sans-serif;cursor:pointer}.ak-intel-tabs button.on{background:var(--ak-red);color:#fff;border-color:var(--ak-red)}
  .ak-intel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ak-intel-card{display:block;border:1px solid var(--ak-line);padding:13px;background:rgba(255,255,255,.12);color:var(--ak-text);text-decoration:none}.ak-intel-card b{display:block;font-size:.92rem;line-height:1.35;margin-bottom:7px}.ak-intel-card span{font:normal .7rem Arial,sans-serif;color:var(--ak-sub)}
  @media(max-width:820px){.ak-intel-grid{grid-template-columns:1fr 1fr}}@media(max-width:580px){.ak-intel{padding:15px}.ak-intel-head{display:block}.ak-intel-ext{display:inline-block;margin-top:9px}.ak-intel-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function renderIntel(items,filter,grid){
  const list=(filter==='all'?items:items.filter(i=>classify(i)===filter)).slice(0,9);
  grid.innerHTML=list.map(i=>`<a class="ak-intel-card" href="${esc(i.url||i.share_url||'#')}" target="_blank" rel="noopener noreferrer"><b>${esc(i.title)}</b><span>${esc(i.source||'GNK ASG')} · ${esc(i.category||classify(i))}</span></a>`).join('') || `<div>${english?'No current items in this category.':'Trenutno nema stavki u ovoj kategoriji.'}</div>`;
}

function buildIntel(items){
  if(document.getElementById('akGlobalIntel'))return;
  const anchor=document.getElementById('akDataHub')||document.querySelector('.ak-datahub-section')||document.querySelector('.ak-section');
  if(!anchor)return;
  injectIntelStyles();
  const box=document.createElement('section');box.className='ak-intel';box.id='akGlobalIntel';
  const wm='https://www.worldmonitor.app/dashboard?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=bases%2Ccables%2Cpipelines%2Cais%2Csanctions%2Cweather%2Ceconomic%2Coutages%2Cnatural%2Cminerals%2CtradeRoutes';
  const labels=english?{all:'All',security:'Security',markets:'Markets',energy:'Energy & trade',natural:'Weather & natural',disruption:'Outages & sanctions',technology:'Technology'}:{all:'Sve',security:'Sigurnost',markets:'Tržišta',energy:'Energija i trgovina',natural:'Vrijeme i priroda',disruption:'Prekidi i sankcije',technology:'Tehnologija'};
  box.innerHTML=`<div class="ak-intel-head"><div><h2>${english?'Global Intelligence':'Global Intelligence'}</h2><p>${english?'Live modular overview inside AKTUAL MEDIA.':'Modularni aktualni pregled izravno unutar AKTUAL MEDIA.'}</p></div><a class="ak-intel-ext" href="${wm}" target="_blank" rel="noopener noreferrer external">${english?'Interactive World Monitor ↗':'Interaktivni World Monitor ↗'}</a></div><div class="ak-intel-tabs"></div><div class="ak-intel-grid"></div>`;
  anchor.insertAdjacentElement('afterend',box);
  const tabs=box.querySelector('.ak-intel-tabs'),grid=box.querySelector('.ak-intel-grid');
  Object.entries(labels).forEach(([k,v],idx)=>{const b=document.createElement('button');b.type='button';b.textContent=v;if(idx===0)b.classList.add('on');b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderIntel(items,k,grid)};tabs.appendChild(b)});
  renderIntel(items,'all',grid);
}

function boot(){
  fetch('/data/kolumne.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(data=>{const items=Array.isArray(data)?data:(data.items||[]);const first=items.find(i=>i&&i.naslov);renderHub(first&&first.slika,items.length);collapseColumns(document)}).catch(()=>renderHub(null,0));
  fetch('/data/news.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(data=>buildIntel(Array.isArray(data)?data:(data.items||[]))).catch(()=>{});
  collapseColumns(document);
  new MutationObserver(()=>collapseColumns(document)).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
