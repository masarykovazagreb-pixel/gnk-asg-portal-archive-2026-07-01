(() => {
  if (window.__GNK_ASG_LIVE_OVERVIEW__) return;
  window.__GNK_ASG_LIVE_OVERVIEW__ = true;
  const path=location.pathname.toLowerCase();
  const isEn=path.startsWith('/en/');
  const isHome=['/','/index.html','/en/','/en/index.html'].includes(path);
  if(!isHome)return;
  const t=isEn?{title:'Live Business Overview',signals:'Connected business signals',publications:'Latest publications',news:'Business news',markets:'Market snapshot',open:'Open',note:'Loaded after the main page to preserve speed.',snapshot:'SNAPSHOT',delayed:'DELAYED',live:'LIVE',fallback:'FALLBACK',disclaimer:'Informational data; may be delayed and is not financial advice.'}:{title:'Live Business Overview',signals:'Povezani poslovni signali',publications:'Zadnje objave',news:'Poslovne vijesti',markets:'Tržišni pregled',open:'Otvori',note:'Učitava se nakon glavne stranice radi očuvanja brzine.',snapshot:'SNAPSHOT',delayed:'DELAYED',live:'LIVE',fallback:'FALLBACK',disclaimer:'Informativni podaci; mogu kasniti i nisu financijski savjet.'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const items=data=>Array.isArray(data)?data:(data?.items||data?.articles||data?.news||data?.data||[]);
  const money=v=>new Intl.NumberFormat(isEn?'en-GB':'hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:Number(v)>=1000?0:2}).format(Number(v));
  const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat(isEn?'en-GB':'hr-HR',{dateStyle:'medium',timeStyle:'short'}).format(d)};
  const status=v=>{const ms=Date.parse(v||'');if(!Number.isFinite(ms))return{label:t.fallback,css:'fallback'};const h=(Date.now()-ms)/36e5;if(h<=1)return{label:t.live,css:'live'};if(h<=12)return{label:t.delayed,css:'delayed'};return{label:t.snapshot,css:'snapshot'}};
  async function json(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),2300);try{const r=await fetch(url+(url.includes('?')?'&':'?')+'cb='+Date.now(),{cache:'no-store',signal:c.signal});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(timer)}}
  async function load(){
    if(document.getElementById('gnk-asg-live-overview'))return;
    const main=document.querySelector('main')||document.body;
    const shell=document.createElement('section');shell.id='gnk-asg-live-overview';shell.className='gnk-asg-live-overview';shell.hidden=true;shell.innerHTML=`<div class="gnk-asg-live-head"><div><p>${esc(t.title)}</p><h2>${esc(t.signals)}</h2></div><small>${esc(t.note)}</small></div><div class="gnk-asg-live-grid"></div>`;main.appendChild(shell);
    const result=await Promise.allSettled([json('/data/publications.json'),json('/data/news.json'),json('/data/market.json')]);
    const blocks=[];
    if(result[0].status==='fulfilled'){
      const list=items(result[0].value).slice(0,3);
      if(list.length)blocks.push(`<article class="gnk-asg-live-block"><header><span>${esc(t.publications)}</span><a href="${isEn?'/publications/':'/objave/'}">${esc(t.open)}</a></header>${list.map(x=>{const href=isEn?(x.enUrl||x.originalUrl||x.canonical):(x.hrUrl||x.originalUrl||x.canonical);return `<a class="gnk-asg-live-item" href="${esc(href||'#')}"><strong>${esc(x.title||x.titleHr||x.titleEn||'')}</strong><small>${esc(x.publishedAt||'')}</small><p>${esc(String(x.summary||x.summaryHr||x.summaryEn||'').slice(0,170))}</p></a>`}).join('')}</article>`);
    }
    if(result[1].status==='fulfilled'){
      const fresh=items(result[1].value).filter(x=>{const ms=Date.parse(x.published_at||x.publishedAt||x.date||'');return Number.isFinite(ms)&&(Date.now()-ms)<7*864e5}).slice(0,3);
      if(fresh.length)blocks.push(`<article class="gnk-asg-live-block"><header><span>${esc(t.news)}</span><a href="${isEn?'/news/':'/vijesti/'}">${esc(t.open)}</a></header><div class="gnk-asg-rotating-news">${fresh.map((x,i)=>`<a class="gnk-asg-live-item${i===0?' active':''}" href="${esc(x.url||x.share_url||'#')}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.title||'')}</strong><small>${esc(x.source||'')} · ${esc(date(x.published_at||x.publishedAt||x.date))}</small><p>${esc(String(x.summary||'').slice(0,180))}</p></a>`).join('')}</div></article>`);
    }
    if(result[2].status==='fulfilled'){
      const data=result[2].value||{},s=status(data.updated_at||data.updatedAt),coins=Array.isArray(data.coins)?data.coins.slice(0,4):[];
      if(coins.length)blocks.push(`<article class="gnk-asg-live-block"><header><span>${esc(t.markets)}</span><a href="${isEn?'/markets/':'/trzista/'}">${esc(t.open)}</a></header><div class="gnk-asg-market-status"><b class="${s.css}">${esc(s.label)}</b><small>${esc(date(data.updated_at||data.updatedAt))}</small></div><div class="gnk-asg-market-mini">${coins.map(c=>{const value=c.prices?.eur,change=c.changes_24h?.eur;return `<div><span>${esc(c.symbol||c.id||'')}</span><strong>${Number.isFinite(Number(value))?esc(money(value)):'—'}</strong><small class="${Number(change)>=0?'up':'down'}">${Number.isFinite(Number(change))?Number(change).toFixed(2)+'%':''}</small></div>`}).join('')}</div><p class="gnk-asg-market-note">${esc(t.disclaimer)}</p></article>`);
    }
    if(!blocks.length){shell.remove();return}
    shell.querySelector('.gnk-asg-live-grid').innerHTML=blocks.join('');shell.hidden=false;
    const rot=[...shell.querySelectorAll('.gnk-asg-rotating-news .gnk-asg-live-item')];
    if(rot.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let i=0;setInterval(()=>{rot[i].classList.remove('active');i=(i+1)%rot.length;rot[i].classList.add('active')},7000)}
  }
  const schedule=window.requestIdleCallback||(cb=>setTimeout(cb,900));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(load),{once:true});else schedule(load);
})();
