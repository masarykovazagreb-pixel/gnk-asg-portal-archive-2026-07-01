(()=>{
  'use strict';
  const DATA_URL='/data/public-group-network.json';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const project=(lat,lng)=>({x:clamp(((lng+180)/360)*1000,20,980),y:clamp(((90-lat)/180)*500,24,476)});
  const curve=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2-60-Math.min(90,Math.abs(dx)*.08);return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const labelWorkers=value=>value===null||value===undefined?'—':new Intl.NumberFormat().format(value);
  const createMarkup=(data,compact)=>{
    const nodes=data.nodes||[];
    const byId=new Map(nodes.map(n=>[n.id,n]));
    const links=(data.links||[]).filter(l=>byId.has(l.from)&&byId.has(l.to));
    const projected=new Map(nodes.map(n=>[n.id,project(n.latitude,n.longitude)]));
    const lines=links.map((l,i)=>{const a=projected.get(l.from),b=projected.get(l.to);const d=curve(a,b);return `<path class="gnk-network__link-halo" d="${d}"/><path class="gnk-network__link" d="${d}" style="animation-delay:-${i*.7}s"/>`;}).join('');
    const points=nodes.map((n,i)=>{const p=projected.get(n.id);const anchor=p.x>760?'end':'start';const tx=p.x+(anchor==='end'?-14:14);return `<g class="gnk-network__node" tabindex="0" role="button" aria-label="${esc(n.city)}, ${esc(n.country)}" data-network-node="${esc(n.id)}"><circle class="gnk-network__pulse" cx="${p.x}" cy="${p.y}" r="7" style="animation-delay:-${i*.45}s"/><circle class="gnk-network__dot" cx="${p.x}" cy="${p.y}" r="6"/><text class="gnk-network__label" x="${tx}" y="${p.y-10}" text-anchor="${anchor}">${esc(n.city)}</text></g>`;}).join('');
    const s=data.summary||{};
    return `<section class="gnk-network ${compact?'gnk-network--compact':''}" data-gnk-network-root>
      <div class="gnk-network__head"><div><div class="gnk-network__eyebrow">Global Group Network</div><h2 class="gnk-network__title">Gradovi, društva i tržišta povezani zlatnom mrežom.</h2></div><div class="gnk-network__meta"><div class="gnk-network__metric"><span>Društva i entiteti</span><b>${esc(s.entities??45)}</b></div><div class="gnk-network__metric"><span>Operativne lokacije</span><b>${esc(s.operatingLocations??33)}</b></div><div class="gnk-network__metric"><span>Dormant lokacije</span><b>${esc(s.dormantLocations??12)}</b></div></div></div>
      <div class="gnk-network__stage"><div class="gnk-network__globe"><svg viewBox="0 0 1000 500" role="img" aria-label="Interaktivna karta javno objavljenih lokacija Grupe"><defs><linearGradient id="gnkNetworkGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c6b18"/><stop offset=".5" stop-color="#ffe89b"/><stop offset="1" stop-color="#d6ad4f"/></linearGradient></defs><ellipse class="gnk-network__gridline" cx="500" cy="250" rx="470" ry="205"/><ellipse class="gnk-network__gridline" cx="500" cy="250" rx="470" ry="130"/><path class="gnk-network__gridline" d="M30 250H970M500 45V455M265 70Q500 250 265 430M735 70Q500 250 735 430"/><path class="gnk-network__coast" d="M70 145l80-55 92 18 55 57-37 45 26 60-53 47-85-13-38-67-53-31zM410 104l105-38 130 28 44 55-24 44-91 12-36 58-65-14-34-49-62-20zM655 248l97-22 73 38 44 61-39 52-105 16-61-58-36-46z"/>${lines}${points}</svg></div><aside class="gnk-network__panel" data-network-panel aria-live="polite"><div class="gnk-network__panel-top"><div><div class="gnk-network__panel-code" data-network-code></div><h3 data-network-city></h3><p data-network-country></p></div><button class="gnk-network__close" type="button" aria-label="Zatvori" data-network-close>×</button></div><div class="gnk-network__panel-grid"><div><span>Društvo / kod</span><b data-network-name></b></div><div><span>Workers</span><b data-network-workers></b></div><div><span>Tržište</span><b data-network-market></b></div><div><span>Funkcija</span><b data-network-function></b></div></div></aside></div>
      <div class="gnk-network__footer"><div class="gnk-network__legend"><span>Javno objavljena lokacija</span><span>Aktivna veza Grupe</span></div><a href="/group-network/">Otvori cijelu mrežu →</a></div>
    </section>`;
  };
  const bind=(root,data)=>{
    const nodes=new Map((data.nodes||[]).map(n=>[n.id,n]));
    const panel=root.querySelector('[data-network-panel]');
    const open=id=>{const n=nodes.get(id);if(!n||!panel)return;panel.querySelector('[data-network-code]').textContent=n.code||'';panel.querySelector('[data-network-city]').textContent=n.city||'';panel.querySelector('[data-network-country]').textContent=n.country||'';panel.querySelector('[data-network-name]').textContent=n.publicName||n.code||'—';panel.querySelector('[data-network-workers]').textContent=labelWorkers(n.workers);panel.querySelector('[data-network-market]').textContent=n.market||'—';panel.querySelector('[data-network-function]').textContent=n.function||'—';panel.classList.add('is-open');};
    root.querySelectorAll('[data-network-node]').forEach(el=>{el.addEventListener('click',()=>open(el.dataset.networkNode));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(el.dataset.networkNode);}});});
    root.querySelector('[data-network-close]')?.addEventListener('click',()=>panel.classList.remove('is-open'));
  };
  const mount=async(target,compact=false)=>{try{const response=await fetch(DATA_URL,{cache:'no-store'});if(!response.ok)throw new Error('network data unavailable');const data=await response.json();target.innerHTML=createMarkup(data,compact);bind(target.firstElementChild,data);}catch(error){target.innerHTML='<div class="gnk-network__empty">Mreža trenutačno nije dostupna.</div>';}};
  window.GNKGroupNetwork={mount};
  document.querySelectorAll('[data-gnk-network-mount]').forEach(el=>mount(el,el.hasAttribute('data-compact')));
})();
