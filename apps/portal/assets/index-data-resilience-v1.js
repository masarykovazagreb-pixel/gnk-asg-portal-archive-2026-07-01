(()=>{
'use strict';
if(window.__GNK_INDEX_DATA_RESILIENCE__)return;window.__GNK_INDEX_DATA_RESILIENCE__=true;
const path=location.pathname.replace(/\/+$/,'')||'/';
if(path!=='/'&&path!=='/en')return;
const en=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>new Intl.NumberFormat(en?'en-GB':'hr-HR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));
async function json(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw new Error(`${url}:${r.status}`);return r.json();}
async function newsFallback(){
  const grid=document.getElementById('gnk-editorial-grid');if(!grid)return;
  const live=[...grid.querySelectorAll('.gnk-card')].filter(card=>!/objave\/|komentari\//.test(card.getAttribute('href')||''));
  if(live.length)return;
  try{const raw=await json('/data/news.json'),items=Array.isArray(raw)?raw:(raw.items||[]);items.slice(0,6).forEach(item=>{const a=document.createElement('a');a.className='gnk-card';a.href=item.share_url||item.url||'/newsroom/';if(/^https?:/i.test(a.href)){a.target='_blank';a.rel='noopener nofollow';}a.innerHTML=`<span class="gnk-meta">${esc(item.source||item.category||'News')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p>`;grid.appendChild(a);});}catch(error){console.warn('GNK index news fallback failed',error);}
}
async function marketFallback(){
  const host=document.getElementById('gnk-market-summary');if(!host)return;
  const hasValues=[...host.querySelectorAll('strong')].some(el=>/\d/.test(el.textContent||''));if(hasValues)return;
  try{const data=await json('/data/market.json'),coins=(data.coins||[]).filter(x=>['bitcoin','ethereum','solana'].includes(x.id));if(!coins.length)return;host.innerHTML=coins.map(x=>`<article class="gnk-market-card"><small>${esc(x.symbol||x.id)}</small><strong>$${fmt(x.prices?.usd,x.prices?.usd<1?5:2)}</strong><p>${Number(x.changes_24h?.usd)>=0?'+':''}${fmt(x.changes_24h?.usd,2)}% / 24 h</p></article>`).join('');}catch(error){console.warn('GNK index market fallback failed',error);}
}
async function run(){await new Promise(r=>setTimeout(r,900));await Promise.allSettled([newsFallback(),marketFallback()]);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();