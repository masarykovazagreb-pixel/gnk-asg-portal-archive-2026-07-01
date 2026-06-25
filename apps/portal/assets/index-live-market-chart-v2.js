(() => {
  'use strict';
  if (window.__GNK_ASG_LIVE_MARKET_CHART_V2__) return;
  window.__GNK_ASG_LIVE_MARKET_CHART_V2__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const t = lang === 'en' ? {
    title:'Live market movement', updated:'Updated', open:'Open markets', unavailable:'Market data unavailable',
    auto:'Refresh every 60 seconds', waiting:'Collecting real market samples…'
  } : {
    title:'Kretanje tržišta uživo', updated:'Ažurirano', open:'Otvori tržišta', unavailable:'Tržišni podaci nisu dostupni',
    auto:'Osvježavanje svakih 60 sekundi', waiting:'Prikupljanje stvarnih tržišnih uzoraka…'
  };

  const instruments = {
    bitcoin:{label:'Bitcoin / EUR',asset:'bitcoin',keys:['price_eur','value_eur','price','value'],suffix:' EUR'},
    gold:{label:lang==='en'?'Gold / EUR':'Zlato / EUR',asset:'asg_gold_reference',keys:['value_eur','price_eur','price','value'],suffix:' EUR'},
    brent:{label:'Brent / USD',asset:'brent',keys:['price_usd','price','value_usd','value'],suffix:' USD'},
    usd_eur:{label:'USD / EUR',asset:'usd_eur',keys:['rate','price','value'],suffix:''}
  };

  let panel=null;
  let payload=null;
  let active='bitcoin';
  let refreshTimer=null;
  let resizeObserver=null;
  let restoring=false;

  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const first=(obj,keys)=>{for(const key of keys){const n=num(obj?.[key]);if(n!==null)return n}return null};
  const fmt=v=>v==null?'—':v.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:v<10?5:2});
  const time=v=>{const d=new Date(v||Date.now());return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat(lang==='en'?'en-GB':'hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Zagreb'}).format(d)};
  const keyName=k=>`gnk_asg_market_v2_${k}`;
  const load=k=>{try{const v=JSON.parse(localStorage.getItem(keyName(k))||'[]');return Array.isArray(v)?v.filter(p=>Number.isFinite(p?.t)&&Number.isFinite(p?.v)).slice(-90):[]}catch{return[]}};
  const save=(k,v)=>{try{localStorage.setItem(keyName(k),JSON.stringify(v.slice(-90)))}catch{}};

  function addStyles(){
    if(document.getElementById('gnk-market-v2-style'))return;
    const s=document.createElement('style');
    s.id='gnk-market-v2-style';
    s.textContent=`
      #gnk-live-market-chart-v2{margin-top:18px;padding-top:16px;border-top:1px solid rgba(215,170,60,.22);min-width:0}
      #gnk-live-market-chart-v2 *{box-sizing:border-box}
      .gnk-mv2-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.gnk-mv2-head h4{margin:0;color:#fff;font-size:14px}.gnk-mv2-status{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid rgba(215,170,60,.32);border-radius:999px;color:#dce6f2;font-size:8px;font-weight:900}.gnk-mv2-status i{width:7px;height:7px;border-radius:50%;background:#d7aa3c;box-shadow:0 0 10px #d7aa3c}.gnk-mv2-status[data-status="LIVE"] i{background:#31d47c;box-shadow:0 0 10px #31d47c}.gnk-mv2-status[data-status="DELAYED"] i,.gnk-mv2-status[data-status="FALLBACK"] i{background:#f0b84d}.gnk-mv2-status[data-status="UNAVAILABLE"] i{background:#ef6670}
      .gnk-mv2-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}.gnk-mv2-tabs button{min-width:0;padding:7px 8px;border:1px solid rgba(215,170,60,.22);border-radius:9px;background:rgba(255,255,255,.025);color:#dce6f2;font-size:8px;font-weight:900;cursor:pointer}.gnk-mv2-tabs button.active{border-color:#d7aa3c;color:#ffe08a;background:rgba(215,170,60,.1)}
      .gnk-mv2-meta{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:7px}.gnk-mv2-price{display:block;color:#ffe08a;font-size:22px;font-weight:950}.gnk-mv2-change{display:block;margin-top:3px;font-size:10px;font-weight:900}.gnk-mv2-change.up{color:#31d47c}.gnk-mv2-change.down{color:#ef6670}.gnk-mv2-time{color:#8fa1b8;font-size:8px;text-align:right}
      .gnk-mv2-canvas{position:relative;height:205px;border:1px solid rgba(215,170,60,.14);border-radius:12px;background:linear-gradient(180deg,rgba(43,143,230,.08),rgba(2,8,18,.18));overflow:hidden}.gnk-mv2-canvas canvas{display:block;width:100%;height:100%}.gnk-mv2-empty{position:absolute;inset:0;display:grid;place-items:center;padding:14px;color:#a9b7c9;font-size:9px;text-align:center;pointer-events:none}
      .gnk-mv2-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;color:#8fa1b8;font-size:8px}.gnk-mv2-foot a{color:#ffe08a;text-decoration:none;font-weight:900}
      @media(max-width:620px){.gnk-mv2-canvas{height:180px}.gnk-mv2-meta{align-items:flex-start;flex-direction:column}.gnk-mv2-time{text-align:left}}
    `;
    document.head.appendChild(s);
  }

  function buildPanel(){
    const card=document.querySelector('#mreza-grupe .map-card');
    if(!card)return null;
    const existing=document.getElementById('gnk-live-market-chart-v2');
    if(existing){panel=existing;return existing}
    const old=document.getElementById('gnk-live-market-chart');
    old?.remove();
    const box=document.createElement('section');
    box.id='gnk-live-market-chart-v2';
    box.innerHTML=`
      <div class="gnk-mv2-head"><h4>${t.title}</h4><span class="gnk-mv2-status" data-status="SNAPSHOT"><i></i><span>SNAPSHOT</span></span></div>
      <div class="gnk-mv2-tabs">${Object.entries(instruments).map(([k,v],i)=>`<button type="button" data-key="${k}" class="${i===0?'active':''}">${v.label}</button>`).join('')}</div>
      <div class="gnk-mv2-meta"><div><strong class="gnk-mv2-price">—</strong><span class="gnk-mv2-change">—</span></div><div class="gnk-mv2-time">${t.waiting}</div></div>
      <div class="gnk-mv2-canvas"><canvas></canvas><div class="gnk-mv2-empty">${t.waiting}</div></div>
      <div class="gnk-mv2-foot"><span>${t.auto}</span><a href="${lang==='en'?'/markets/':'/trzista/'}">${t.open} →</a></div>`;
    card.appendChild(box);
    panel=box;
    panel.querySelectorAll('[data-key]').forEach(btn=>btn.addEventListener('click',()=>{
      active=btn.dataset.key;
      panel.querySelectorAll('[data-key]').forEach(x=>x.classList.toggle('active',x===btn));
      render();
    }));
    return box;
  }

  function seriesFor(k){
    const cfg=instruments[k];
    const asset=payload?.assets?.[cfg.asset]||{};
    const candidates=[asset.history,asset.series,asset.sparkline,asset.prices,payload?.history?.[k],payload?.series?.[k]];
    for(const c of candidates){
      if(!Array.isArray(c))continue;
      const pts=c.map((item,i)=>{
        if(typeof item==='number')return Number.isFinite(item)?{t:i,v:item}:null;
        const v=first(item,['value','price','price_eur','price_usd','rate','close','y']);
        if(v===null)return null;
        const raw=item.timestamp??item.time??item.date??item.updatedAt??item.x;
        const parsed=typeof raw==='number'?raw:Date.parse(raw||'');
        return{t:Number.isFinite(parsed)?parsed:i,v};
      }).filter(Boolean);
      if(pts.length>1)return pts.slice(-90);
    }
    const current=first(asset,cfg.keys);
    const pts=load(k);
    if(current!==null){
      const now=Date.now();
      const last=pts[pts.length-1];
      if(!last||now-last.t>=45000)pts.push({t:now,v:current});
    }
    const clean=pts.filter(p=>Date.now()-p.t<7*86400000).slice(-90);
    save(k,clean);
    return clean;
  }

  function statusFor(asset){
    const s=String(asset?.status||payload?.status||payload?.marketStatus||'SNAPSHOT').toUpperCase();
    return['LIVE','SNAPSHOT','DELAYED','FALLBACK','UNAVAILABLE'].includes(s)?s:'SNAPSHOT';
  }

  function draw(canvas,pts){
    const r=canvas.getBoundingClientRect();
    const w=Math.max(260,r.width||300),h=Math.max(160,r.height||205),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=w*dpr;canvas.height=h*dpr;
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    if(!pts.length)return;
    const p={l:42,r:10,t:14,b:20},cw=w-p.l-p.r,ch=h-p.t-p.b,vals=pts.map(x=>x.v);
    let min=Math.min(...vals),max=Math.max(...vals);if(min===max){const d=Math.abs(min||1)*.01;min-=d;max+=d}const span=max-min;min-=span*.08;max+=span*.08;
    c.font='8px Arial';c.fillStyle='rgba(169,183,201,.8)';c.strokeStyle='rgba(215,170,60,.12)';c.lineWidth=1;
    for(let i=0;i<4;i++){const y=p.t+ch*i/3;c.beginPath();c.moveTo(p.l,y);c.lineTo(w-p.r,y);c.stroke();const v=max-(max-min)*i/3;c.fillText(v.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:v<10?4:1}),2,y+3)}
    const x=i=>pts.length===1?p.l+cw/2:p.l+cw*i/(pts.length-1),y=v=>p.t+ch-((v-min)/(max-min))*ch;
    if(pts.length>1){const g=c.createLinearGradient(0,p.t,0,h-p.b);g.addColorStop(0,'rgba(43,143,230,.38)');g.addColorStop(1,'rgba(43,143,230,0)');c.beginPath();pts.forEach((q,i)=>i?c.lineTo(x(i),y(q.v)):c.moveTo(x(i),y(q.v)));c.lineTo(x(pts.length-1),h-p.b);c.lineTo(x(0),h-p.b);c.closePath();c.fillStyle=g;c.fill();c.beginPath();pts.forEach((q,i)=>i?c.lineTo(x(i),y(q.v)):c.moveTo(x(i),y(q.v)));c.strokeStyle='#ffe08a';c.lineWidth=2;c.stroke()}
    const li=pts.length-1;c.beginPath();c.arc(x(li),y(pts[li].v),3.5,0,Math.PI*2);c.fillStyle='#31d47c';c.fill();
  }

  function render(){
    if(!panel||!payload)return;
    const cfg=instruments[active],asset=payload?.assets?.[cfg.asset]||{},pts=seriesFor(active),current=first(asset,cfg.keys)??pts.at(-1)?.v??null;
    const firstV=pts[0]?.v,lastV=pts.at(-1)?.v,chg=Number.isFinite(firstV)&&Number.isFinite(lastV)&&firstV!==0?((lastV-firstV)/firstV)*100:null;
    const status=statusFor(asset);
    panel.querySelector('.gnk-mv2-price').textContent=`${fmt(current)}${cfg.suffix}`;
    const ch=panel.querySelector('.gnk-mv2-change');ch.textContent=chg==null?'—':`${chg>=0?'+':''}${chg.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:2})}%`;ch.className=`gnk-mv2-change ${chg>0?'up':chg<0?'down':''}`;
    panel.querySelector('.gnk-mv2-time').textContent=`${t.updated}: ${time(asset.updatedAt||payload.updatedAt||Date.now())}`;
    const st=panel.querySelector('.gnk-mv2-status');st.dataset.status=status;st.querySelector('span').textContent=status;
    const empty=panel.querySelector('.gnk-mv2-empty');empty.hidden=pts.length>1;empty.textContent=pts.length?t.waiting:t.unavailable;
    draw(panel.querySelector('canvas'),pts);
  }

  async function refresh(){
    try{
      const r=await fetch(`/api/market?cb=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
      if(!r.ok)throw new Error(String(r.status));
      payload=await r.json();render();
    }catch{
      if(!panel)return;
      const st=panel.querySelector('.gnk-mv2-status');st.dataset.status='UNAVAILABLE';st.querySelector('span').textContent='UNAVAILABLE';
      panel.querySelector('.gnk-mv2-time').textContent=t.unavailable;
    }
  }

  function ensure(){
    if(restoring)return;
    restoring=true;
    try{
      addStyles();
      if(!document.getElementById('gnk-live-market-chart-v2'))buildPanel();
      if(panel&&payload)render();
    }finally{restoring=false}
  }

  ensure();
  [100,350,900,1800,3500].forEach(ms=>setTimeout(ensure,ms));
  const observer=new MutationObserver(()=>{if(!document.getElementById('gnk-live-market-chart-v2'))requestAnimationFrame(ensure)});
  observer.observe(document.body,{childList:true,subtree:true});
  refresh();
  refreshTimer=setInterval(refresh,60000);
  resizeObserver=new ResizeObserver(()=>{if(panel&&payload)render()});
  const watch=()=>{const wrap=panel?.querySelector('.gnk-mv2-canvas');if(wrap)resizeObserver.observe(wrap)};setTimeout(watch,150);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);observer.disconnect();resizeObserver?.disconnect()},{once:true});
})();
