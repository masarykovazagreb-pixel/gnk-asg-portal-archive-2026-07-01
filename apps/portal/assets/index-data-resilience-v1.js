(()=>{
'use strict';
if(window.__GNK_INDEX_DATA_RESILIENCE_V2__)return;window.__GNK_INDEX_DATA_RESILIENCE_V2__=true;
const path=location.pathname.replace(/\/+$/,'')||'/';
if(path!=='/'&&path!=='/en')return;
const en=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>Number.isFinite(Number(v));
const fmt=(v,d=2)=>finite(v)?new Intl.NumberFormat(en?'en-GB':'hr-HR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v)):'—';
async function json(url,timeout=7000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});if(!r.ok)throw new Error(`${url}:${r.status}`);return await r.json();}finally{clearTimeout(timer)}}
async function marketFallback(){
  const host=document.getElementById('gnk-market-summary');if(!host)return;
  const hasValues=[...host.querySelectorAll('strong')].some(el=>/\d/.test(el.textContent||''));if(hasValues)return;
  try{
    const data=await json('/data/market.json'),coins=(Array.isArray(data?.coins)?data.coins:[]).filter(x=>['bitcoin','ethereum','solana'].includes(x?.id)&&finite(x?.prices?.usd));
    if(!coins.length)throw new Error('market_fallback_empty');
    host.innerHTML=coins.map(x=>{const change=finite(x?.changes_24h?.usd)?Number(x.changes_24h.usd):null;return `<article class="gnk-market-card"><small>${esc(x.symbol||x.id)}</small><strong>$${fmt(x.prices.usd,x.prices.usd<1?5:2)}</strong><p>${change===null?'—':`${change>=0?'+':''}${fmt(change,2)}% / 24 h`}</p></article>`}).join('');
    host.dataset.marketState='fallback';
  }catch(error){
    host.dataset.marketState='offline';
    if(!host.children.length)host.innerHTML=`<p class="gnk-index-empty" role="status">${en?'Market data is temporarily unavailable.':'Tržišni podaci trenutačno nisu dostupni.'}</p>`;
    console.warn('GNK index market fallback failed',error);
  }
}
async function run(){await new Promise(resolve=>setTimeout(resolve,900));await marketFallback();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
