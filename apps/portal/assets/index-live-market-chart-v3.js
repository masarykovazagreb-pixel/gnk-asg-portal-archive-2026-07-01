(() => {
  'use strict';
  if (window.__GNK_ASG_LIVE_MARKET_CHART_V3__) return;
  window.__GNK_ASG_LIVE_MARKET_CHART_V3__ = true;
  window.__GNK_ASG_LIVE_MARKET_CHART_V2__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const labels = lang === 'en' ? {
    title:'Live market movement',updated:'Market update',checked:'Checked',open:'Open markets',waiting:'Loading market series…',unavailable:'Market data unavailable',refresh:'Data check every 60 seconds · shared market refresh every 5 minutes'
  } : {
    title:'Kretanje tržišta uživo',updated:'Tržišni podatak',checked:'Provjereno',open:'Otvori tržišta',waiting:'Učitavanje tržišnog niza…',unavailable:'Tržišni podaci nisu dostupni',refresh:'Provjera svakih 60 sekundi · zajedničko osvježavanje tržišta svakih 5 minuta'
  };

  const instruments = {
    bitcoin:{label:'Bitcoin / EUR',asset:'bitcoin',valueKeys:['price_eur'],suffix:' EUR'},
    gold:{label:lang==='en'?'Gold / EUR':'Zlato / EUR',asset:'asg_gold_reference',valueKeys:['value_eur'],suffix:' EUR'},
    brent:{label:'Brent / USD',asset:'brent',valueKeys:['price_usd'],suffix:' USD'},
    usd_eur:{label:'USD / EUR',asset:'usd_eur',valueKeys:['rate'],suffix:''}
  };

  let active='bitcoin';
  let payload=null;
  let panel=null;
  let refreshTimer=null;
  let resizeObserver=null;
  let requestRunning=false;

  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
  const first=(object,keys)=>{for(const key of keys){const value=number(object?.[key]);if(value!==null)return value}return null};
  const format=value=>value===null?'—':value.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:value<10?5:2});
  const formatTime=value=>{const date=new Date(value||'');return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat(lang==='en'?'en-GB':'hr-HR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Zagreb'}).format(date)};

  function addStyles(){
    if(document.getElementById('gnk-market-v3-style'))return;
    const style=document.createElement('style');
    style.id='gnk-market-v3-style';
    style.textContent=`
      #gnk-live-market-chart-v3{margin-top:18px;padding-top:16px;border-top:1px solid rgba(215,170,60,.22);min-width:0}
      #gnk-live-market-chart-v3 *{box-sizing:border-box}
      .gnk-mv3-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.gnk-mv3-head h4{margin:0;color:#fff;font-size:14px}.gnk-mv3-status{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid rgba(215,170,60,.32);border-radius:999px;color:#dce6f2;font-size:8px;font-weight:900}.gnk-mv3-status i{width:7px;height:7px;border-radius:50%;background:#d7aa3c}.gnk-mv3-status[data-status="LIVE"] i{background:#31d47c;box-shadow:0 0 10px #31d47c}.gnk-mv3-status[data-status="DELAYED"] i,.gnk-mv3-status[data-status="SNAPSHOT"] i,.gnk-mv3-status[data-status="FALLBACK"] i{background:#f0b84d;box-shadow:0 0 10px #f0b84d}.gnk-mv3-status[data-status="UNAVAILABLE"] i{background:#ef6670}
      .gnk-mv3-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}.gnk-mv3-tabs button{min-width:0;padding:7px 8px;border:1px solid rgba(215,170,60,.22);border-radius:9px;background:rgba(255,255,255,.025);color:#dce6f2;font-size:8px;font-weight:900;cursor:pointer}.gnk-mv3-tabs button.active{border-color:#d7aa3c;color:#ffe08a;background:rgba(215,170,60,.1)}
      .gnk-mv3-meta{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:7px}.gnk-mv3-price{display:block;color:#ffe08a;font-size:22px;font-weight:950}.gnk-mv3-change{display:block;margin-top:3px;font-size:10px;font-weight:900}.gnk-mv3-change.up{color:#31d47c}.gnk-mv3-change.down{color:#ef6670}.gnk-mv3-time{color:#8fa1b8;font-size:8px;text-align:right;line-height:1.45}
      .gnk-mv3-canvas{position:relative;height:205px;border:1px solid rgba(215,170,60,.14);border-radius:12px;background:linear-gradient(180deg,rgba(43,143,230,.08),rgba(2,8,18,.18));overflow:hidden}.gnk-mv3-canvas canvas{display:block;width:100%;height:100%}.gnk-mv3-empty{position:absolute;inset:0;display:grid;place-items:center;padding:14px;color:#a9b7c9;font-size:9px;text-align:center;pointer-events:none}
      .gnk-mv3-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;color:#8fa1b8;font-size:8px}.gnk-mv3-foot a{color:#ffe08a;text-decoration:none;font-weight:900}.gnk-mv3-source{display:block;margin-top:5px;color:#708096;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:620px){.gnk-mv3-canvas{height:180px}.gnk-mv3-meta{align-items:flex-start;flex-direction:column}.gnk-mv3-time{text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function build(){
    const host=document.querySelector('#mreza-grupe .map-card');
    if(!host)return null;
    document.getElementById('gnk-live-market-chart-v2')?.remove();
    document.getElementById('gnk-live-market-chart')?.remove();
    let existing=document.getElementById('gnk-live-market-chart-v3');
    if(existing){panel=existing;return panel}
    panel=document.createElement('section');
    panel.id='gnk-live-market-chart-v3';
    panel.innerHTML=`
      <div class="gnk-mv3-head"><h4>${labels.title}</h4><span class="gnk-mv3-status" data-status="DELAYED"><i></i><span>DELAYED</span></span></div>
      <div class="gnk-mv3-tabs">${Object.entries(instruments).map(([key,item],index)=>`<button type="button" data-key="${key}" class="${index===0?'active':''}">${item.label}</button>`).join('')}</div>
      <div class="gnk-mv3-meta"><div><strong class="gnk-mv3-price">—</strong><span class="gnk-mv3-change">—</span></div><div class="gnk-mv3-time">${labels.waiting}</div></div>
      <div class="gnk-mv3-canvas"><canvas></canvas><div class="gnk-mv3-empty">${labels.waiting}</div></div>
      <span class="gnk-mv3-source"></span>
      <div class="gnk-mv3-foot"><span>${labels.refresh}</span><a href="${lang==='en'?'/markets/':'/trzista/'}">${labels.open} →</a></div>`;
    host.appendChild(panel);
    panel.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>{
      active=button.dataset.key;
      panel.querySelectorAll('[data-key]').forEach(item=>item.classList.toggle('active',item===button));
      render();
    }));
    return panel;
  }

  function points(asset){
    const rows=Array.isArray(asset?.history)?asset.history:[];
    const clean=rows.map(row=>({time:Date.parse(row?.time||row?.timestamp||''),value:number(row?.value)})).filter(row=>Number.isFinite(row.time)&&row.value!==null).sort((a,b)=>a.time-b.time);
    if(clean.length)return clean.slice(-180);
    const cfg=instruments[active];
    const current=first(asset,cfg.valueKeys);
    return current===null?[]:[{time:Date.now(),value:current}];
  }

  function draw(canvas,rows){
    const bounds=canvas.getBoundingClientRect();
    const width=Math.max(260,bounds.width||300),height=Math.max(160,bounds.height||205),ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;
    const context=canvas.getContext('2d');
    context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);
    if(!rows.length)return;
    const padding={left:42,right:10,top:14,bottom:20},chartWidth=width-padding.left-padding.right,chartHeight=height-padding.top-padding.bottom;
    const values=rows.map(row=>row.value);let min=Math.min(...values),max=Math.max(...values);
    if(min===max){const delta=Math.abs(min||1)*.01;min-=delta;max+=delta}
    const spread=max-min;min-=spread*.08;max+=spread*.08;
    context.font='8px Arial';context.fillStyle='rgba(169,183,201,.8)';context.strokeStyle='rgba(215,170,60,.12)';context.lineWidth=1;
    for(let index=0;index<4;index+=1){const y=padding.top+chartHeight*index/3;context.beginPath();context.moveTo(padding.left,y);context.lineTo(width-padding.right,y);context.stroke();const value=max-(max-min)*index/3;context.fillText(value.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:value<10?4:1}),2,y+3)}
    const x=index=>rows.length===1?padding.left+chartWidth/2:padding.left+chartWidth*index/(rows.length-1);
    const y=value=>padding.top+chartHeight-((value-min)/(max-min))*chartHeight;
    if(rows.length>1){
      const gradient=context.createLinearGradient(0,padding.top,0,height-padding.bottom);gradient.addColorStop(0,'rgba(43,143,230,.38)');gradient.addColorStop(1,'rgba(43,143,230,0)');
      context.beginPath();rows.forEach((row,index)=>index?context.lineTo(x(index),y(row.value)):context.moveTo(x(index),y(row.value)));context.lineTo(x(rows.length-1),height-padding.bottom);context.lineTo(x(0),height-padding.bottom);context.closePath();context.fillStyle=gradient;context.fill();
      context.beginPath();rows.forEach((row,index)=>index?context.lineTo(x(index),y(row.value)):context.moveTo(x(index),y(row.value)));context.strokeStyle='#ffe08a';context.lineWidth=2;context.stroke();
    }
    const last=rows.length-1;context.beginPath();context.arc(x(last),y(rows[last].value),3.5,0,Math.PI*2);context.fillStyle='#31d47c';context.fill();
  }

  function render(){
    if(!panel||!payload)return;
    const cfg=instruments[active];
    const asset=payload?.assets?.[cfg.asset]||{};
    const rows=points(asset);
    const current=first(asset,cfg.valueKeys)??rows.at(-1)?.value??null;
    const firstValue=rows[0]?.value,lastValue=rows.at(-1)?.value;
    const change=number(asset?.change_24h)??(Number.isFinite(firstValue)&&Number.isFinite(lastValue)&&firstValue!==0?((lastValue-firstValue)/firstValue)*100:null);
    const status=String(asset?.status||payload?.status||'UNAVAILABLE').toUpperCase();
    panel.querySelector('.gnk-mv3-price').textContent=`${format(current)}${cfg.suffix}`;
    const changeNode=panel.querySelector('.gnk-mv3-change');changeNode.textContent=change===null?'—':`${change>=0?'+':''}${change.toLocaleString(lang==='en'?'en-US':'hr-HR',{maximumFractionDigits:2})}%`;changeNode.className=`gnk-mv3-change ${change>0?'up':change<0?'down':''}`;
    panel.querySelector('.gnk-mv3-time').innerHTML=`${labels.updated}: ${formatTime(asset?.updatedAt||payload?.updatedAt)}<br>${labels.checked}: ${formatTime(payload?.checkedAt||Date.now())}`;
    const badge=panel.querySelector('.gnk-mv3-status');badge.dataset.status=status;badge.querySelector('span').textContent=status;
    panel.querySelector('.gnk-mv3-source').textContent=asset?.source?`${asset.source} · ${payload?.cache||''}`:'';
    const empty=panel.querySelector('.gnk-mv3-empty');empty.hidden=rows.length>1;empty.textContent=rows.length?labels.waiting:labels.unavailable;
    draw(panel.querySelector('canvas'),rows);
  }

  async function refresh(){
    if(requestRunning)return;
    requestRunning=true;
    try{
      const response=await fetch(`/api/market-live?cb=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json','cache-control':'no-cache'}});
      if(!response.ok)throw new Error(String(response.status));
      payload=await response.json();
      render();
    }catch{
      if(panel){const badge=panel.querySelector('.gnk-mv3-status');badge.dataset.status='UNAVAILABLE';badge.querySelector('span').textContent='UNAVAILABLE';panel.querySelector('.gnk-mv3-time').textContent=labels.unavailable}
    }finally{requestRunning=false}
  }

  function ensure(){addStyles();if(!document.getElementById('gnk-live-market-chart-v3'))build();if(panel&&payload)render()}

  ensure();
  [100,350,900,1800,3500].forEach(delay=>setTimeout(ensure,delay));
  const observer=new MutationObserver(()=>{if(!document.getElementById('gnk-live-market-chart-v3'))requestAnimationFrame(ensure)});
  observer.observe(document.body,{childList:true,subtree:true});
  refresh();
  refreshTimer=setInterval(refresh,60000);
  resizeObserver=new ResizeObserver(()=>{if(panel&&payload)render()});
  setTimeout(()=>{const canvas=panel?.querySelector('.gnk-mv3-canvas');if(canvas)resizeObserver.observe(canvas)},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  window.addEventListener('pagehide',()=>{clearInterval(refreshTimer);observer.disconnect();resizeObserver?.disconnect()},{once:true});
})();
