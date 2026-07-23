(()=>{
  'use strict';
  const DATA_URL='/data/public-group-network.json';
  let mountSequence=0;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const project=(lat,lng)=>({x:clamp(((lng+180)/360)*1000,20,980),y:clamp(((90-lat)/180)*500,24,476)});
  const curve=(a,b)=>{const dx=b.x-a.x,mx=(a.x+b.x)/2,my=(a.y+b.y)/2-60-Math.min(90,Math.abs(dx)*.08);return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const langOf=target=>target.closest('[lang]')?.getAttribute('lang')?.toLowerCase().startsWith('en')?'en':'hr';
  const copy={
    hr:{eyebrow:'Global Group Network',title:'Gradovi, društva i tržišta povezani zlatnom mrežom.',entities:'Društva i entiteti',operating:'Operativne lokacije',dormant:'Dormant lokacije',map:'Interaktivna karta javno objavljenih lokacija Grupe',close:'Zatvori',entity:'Društvo / kod',workers:'Workers',market:'Tržište',function:'Funkcija',location:'Javno objavljena lokacija',link:'Aktivna veza Grupe',open:'Otvori cijelu mrežu →',unavailable:'Mreža trenutačno nije dostupna.'},
    en:{eyebrow:'Global Group Network',title:'Cities, entities and markets connected through a golden network.',entities:'Companies and entities',operating:'Operating locations',dormant:'Dormant locations',map:'Interactive map of publicly disclosed Group locations',close:'Close',entity:'Entity / code',workers:'Workers',market:'Market',function:'Function',location:'Publicly disclosed location',link:'Active Group connection',open:'Open full network →',unavailable:'The network is currently unavailable.'}
  };
  const labelWorkers=(value,lang)=>value===null||value===undefined?'—':new Intl.NumberFormat(lang==='en'?'en-US':'hr-HR').format(value);
  const normalizeData=data=>{
    const nodes=Array.isArray(data?.nodes)?data.nodes.filter(n=>n&&n.id&&Number.isFinite(n.latitude)&&Number.isFinite(n.longitude)):[];
    const ids=new Set(nodes.map(n=>n.id));
    const links=Array.isArray(data?.links)?data.links.filter(l=>l&&ids.has(l.from)&&ids.has(l.to)&&l.from!==l.to):[];
    return {...data,nodes,links,summary:data?.summary||{}};
  };
  const createMarkup=(raw,compact,lang,instanceId)=>{
    const data=normalizeData(raw);
    const t=copy[lang];
    const nodes=data.nodes;
    const byId=new Map(nodes.map(n=>[n.id,n]));
    const projected=new Map(nodes.map(n=>[n.id,project(n.latitude,n.longitude)]));
    const gradientId=`gnkNetworkGold-${instanceId}`;
    const lines=data.links.map((l,i)=>{const a=projected.get(l.from),b=projected.get(l.to);const d=curve(a,b);return `<path class="gnk-network__link-halo" d="${d}" aria-hidden="true"/><path class="gnk-network__link" d="${d}" style="animation-delay:-${i*.7}s" aria-hidden="true"/>`;}).join('');
    const points=nodes.map((n,i)=>{const p=projected.get(n.id);const anchor=p.x>760?'end':'start';const tx=p.x+(anchor==='end'?-14:14);const label=[n.city,n.country,n.code].filter(Boolean).join(', ');return `<g class="gnk-network__node" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(label)}" data-network-node="${esc(n.id)}"><circle class="gnk-network__pulse" cx="${p.x}" cy="${p.y}" r="7" style="animation-delay:-${i*.45}s" aria-hidden="true"/><circle class="gnk-network__dot" cx="${p.x}" cy="${p.y}" r="6" aria-hidden="true"/><text class="gnk-network__label" x="${tx}" y="${p.y-10}" text-anchor="${anchor}" aria-hidden="true">${esc(n.city)}</text></g>`;}).join('');
    const s=data.summary;
    return `<section class="gnk-network ${compact?'gnk-network--compact':''}" data-gnk-network-root data-network-instance="${instanceId}">
      <div class="gnk-network__head"><div><div class="gnk-network__eyebrow">${t.eyebrow}</div></div><div class="gnk-network__meta"><div class="gnk-network__metric"><span>${t.entities}</span><b>${esc(s.entities??45)}</b></div><div class="gnk-network__metric"><span>${t.operating}</span><b>${esc(s.operatingLocations??33)}</b></div><div class="gnk-network__metric"><span>${t.dormant}</span><b>${esc(s.dormantLocations??12)}</b></div></div></div>
      <div class="gnk-network__stage"><div class="gnk-network__globe"><svg viewBox="0 0 1000 500" role="img" aria-label="${t.map}"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c6b18"/><stop offset=".5" stop-color="#ffe89b"/><stop offset="1" stop-color="#d6ad4f"/></linearGradient></defs><style>.gnk-network[data-network-instance="${instanceId}"] .gnk-network__link{stroke:url(#${gradientId})}</style><ellipse class="gnk-network__gridline" cx="500" cy="250" rx="470" ry="205"/><ellipse class="gnk-network__gridline" cx="500" cy="250" rx="470" ry="130"/><path class="gnk-network__gridline" d="M30 250H970M500 45V455M265 70Q500 250 265 430M735 70Q500 250 735 430"/><path class="gnk-network__coast" d="M70 145l80-55 92 18 55 57-37 45 26 60-53 47-85-13-38-67-53-31zM410 104l105-38 130 28 44 55-24 44-91 12-36 58-65-14-34-49-62-20zM655 248l97-22 73 38 44 61-39 52-105 16-61-58-36-46z"/>${lines}${points}</svg></div><aside class="gnk-network__panel" data-network-panel aria-live="polite" aria-hidden="true"><div class="gnk-network__panel-top"><div><div class="gnk-network__panel-code" data-network-code></div><h3 data-network-city></h3><p data-network-country></p></div><button class="gnk-network__close" type="button" aria-label="${t.close}" data-network-close>×</button></div><div class="gnk-network__panel-grid"><div><span>${t.entity}</span><b data-network-name></b></div><div><span>${t.workers}</span><b data-network-workers></b></div><div><span>${t.market}</span><b data-network-market></b></div><div><span>${t.function}</span><b data-network-function></b></div></div></aside></div>
      <div class="gnk-network__footer"><div class="gnk-network__legend"><span>${t.location}</span><span>${t.link}</span></div><a href="/group-network/">${t.open}</a></div>
    </section>`;
  };
  const bind=(root,raw,lang)=>{
    const data=normalizeData(raw);
    const nodes=new Map(data.nodes.map(n=>[n.id,n]));
    const panel=root.querySelector('[data-network-panel]');
    const closeButton=root.querySelector('[data-network-close]');
    let activeNode=null;
    const close=()=>{
      panel?.classList.remove('is-open');
      panel?.setAttribute('aria-hidden','true');
      if(activeNode){activeNode.setAttribute('aria-pressed','false');activeNode.focus();activeNode=null;}
    };
    const open=el=>{
      const n=nodes.get(el?.dataset.networkNode);if(!n||!panel)return;
      if(activeNode&&activeNode!==el)activeNode.setAttribute('aria-pressed','false');
      activeNode=el;activeNode.setAttribute('aria-pressed','true');
      panel.querySelector('[data-network-code]').textContent=n.code||'';
      panel.querySelector('[data-network-city]').textContent=n.city||'';
      panel.querySelector('[data-network-country]').textContent=n.country||'';
      panel.querySelector('[data-network-name]').textContent=n.publicName||n.code||'—';
      panel.querySelector('[data-network-workers]').textContent=labelWorkers(n.workers,lang);
      panel.querySelector('[data-network-market]').textContent=n.market||'—';
      panel.querySelector('[data-network-function]').textContent=n.function||'—';
      panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');
    };
    root.querySelectorAll('[data-network-node]').forEach(el=>{el.addEventListener('click',()=>open(el));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(el);}else if(e.key==='Escape'){e.preventDefault();close();}});});
    closeButton?.addEventListener('click',close);
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel?.classList.contains('is-open')){e.preventDefault();close();}});
  };
  const mount=async(target,compact=false)=>{
    const lang=langOf(target),instanceId=++mountSequence;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(DATA_URL,{cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
      if(!response.ok)throw new Error(`network data unavailable: ${response.status}`);
      const data=await response.json();
      target.innerHTML=createMarkup(data,compact,lang,instanceId);
      bind(target.firstElementChild,data,lang);
    }catch(error){target.innerHTML=`<div class="gnk-network__empty" role="status">${copy[lang].unavailable}</div>`;}
    finally{clearTimeout(timeout);}
  };
  window.GNKGroupNetwork={mount};
  document.querySelectorAll('[data-gnk-network-mount]').forEach(el=>mount(el,el.hasAttribute('data-compact')));
})();
