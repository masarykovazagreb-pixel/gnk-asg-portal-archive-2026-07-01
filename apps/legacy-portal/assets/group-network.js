(() => {
  'use strict';
  const en = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  let data = null;
  let filter = 'all';
  let selected = 'boulder';
  let scale = 1;
  const ns = 'http://www.w3.org/2000/svg';
  const copy = {
    hr: {eyebrow:'GNK DINAMO Ltd. Group', title:'Interaktivna globalna mreža grupe', text:'Prikaz 33 postojećih društava i 12 planiranih pozicija međunarodnog širenja tijekom 2026.', all:'Sve pozicije', active:'Postojeća društva', planned:'Planirano 2026.', outside:'Izvan Europe', current:'Postojeća društva', expansion:'Planirano 2026.', after:'Nakon širenja', legend:'Oznake mreže', hq:'Središnje sjedište', hqText:'Matična kompanija i centralno upravljanje', live:'Postojeća društva', liveText:'Pozicije u aktualnom prikazu grupe', plan:'Planirano 2026.', planText:'Planirano međunarodno širenje', direct:'Izravna veza sa središtem', peer:'Međudruštvena povezanost', planLink:'Planirana poveznica 2026.', select:'Odabrana lokacija', status:'Status', region:'Regija', activeState:'Postojeće društvo', plannedState:'Planirano širenje 2026.', hqState:'Središnje sjedište', existing:'postojećih', plannedShort:'planirano'},
    en: {eyebrow:'GNK DINAMO Ltd. Group', title:'Interactive Global Group Network', text:'Display of 33 existing companies and 12 planned international expansion positions during 2026.', all:'All positions', active:'Existing companies', planned:'Planned 2026', outside:'Outside Europe', current:'Existing companies', expansion:'Planned 2026', after:'After expansion', legend:'Network key', hq:'Central Headquarters', hqText:'Parent company and central management', live:'Existing companies', liveText:'Positions in the current group display', plan:'Planned 2026', planText:'Planned international expansion', direct:'Direct headquarters link', peer:'Intercompany connection', planLink:'Planned 2026 link', select:'Selected location', status:'Status', region:'Region', activeState:'Existing company', plannedState:'Planned expansion 2026', hqState:'Central headquarters', existing:'existing', plannedShort:'planned'}
  };
  const t = () => copy[en() ? 'en' : 'hr'];
  const text = (node, key) => en() ? node[key + '_en'] : node[key + '_hr'];
  function svgEl(tag, attrs = {}) { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v)); return el; }
  function visible(node) {
    if (filter === 'active') return node.status === 'active';
    if (filter === 'planned') return node.status === 'planned';
    if (filter === 'outside') return node.region !== 'Europa';
    return true;
  }
  function curve(a, b) {
    const mx = (a.x + b.x) / 2;
    const rise = Math.min(88, Math.abs(a.x - b.x) * .15 + 24);
    return `M ${a.x} ${a.y} Q ${mx} ${Math.min(a.y,b.y)-rise} ${b.x} ${b.y}`;
  }
  function renderSection() {
    const group = document.getElementById('grupa');
    if (!group || document.getElementById('global-network')) return;
    const section = document.createElement('section');
    section.className = 'network-section'; section.id = 'global-network';
    group.insertAdjacentElement('afterend', section);
    buildShell();
  }
  function buildShell() {
    const section = document.getElementById('global-network'); if (!section || !data) return;
    const c = t();
    section.innerHTML = `<div class="container"><div class="section-head"><div><p class="eyebrow">${c.eyebrow}</p><h2>${c.title}</h2></div><p>${c.text}</p></div><div class="network-shell"><div class="network-topbar"><div class="network-stats"><div class="network-stat"><strong>33</strong><span>${c.current}</span></div><div class="network-stat"><strong>+12</strong><span>${c.expansion}</span></div><div class="network-stat"><strong>45</strong><span>${c.after}</span></div></div><div class="network-filters"><button data-filter="all" class="active">${c.all}</button><button data-filter="active">${c.active}</button><button data-filter="planned">${c.planned}</button><button data-filter="outside">${c.outside}</button></div></div><div class="network-layout"><div class="network-canvas"><svg id="networkSvg" viewBox="0 0 1040 545" aria-label="${c.title}"></svg><div class="network-controls"><button type="button" data-zoom="in">+</button><button type="button" data-zoom="out">−</button><button type="button" data-zoom="reset">↺</button></div></div></div><aside class="network-sidebar network-information-panel"><div class="network-detail" id="networkDetail"></div><div class="network-key"><h3>${c.legend}</h3><div class="network-key-items"><div class="legend-row"><i class="legend-symbol hq"></i><div><strong>${c.hq}</strong><span>${c.hqText}</span></div></div><div class="legend-row"><i class="legend-symbol active"></i><div><strong>${c.live}</strong><span>${c.liveText}</span></div></div><div class="legend-row"><i class="legend-symbol planned"></i><div><strong>${c.plan}</strong><span>${c.planText}</span></div></div></div><div class="line-legend"><div><i class="line-swatch direct"></i>${c.direct}</div><div><i class="line-swatch peer"></i>${c.peer}</div><div><i class="line-swatch planned"></i>${c.planLink}</div></div></div><p class="network-note">${en() ? data.disclaimer_en : data.disclaimer_hr}</p></aside><div class="network-regions" id="networkRegions"></div></div></div>`;
    section.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; section.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); draw(); });
    section.querySelector('[data-zoom="in"]').onclick = () => zoom(Math.min(scale + .15, 1.55));
    section.querySelector('[data-zoom="out"]').onclick = () => zoom(Math.max(scale - .15, .75));
    section.querySelector('[data-zoom="reset"]').onclick = () => zoom(1);
    draw(); renderRegions(); detail(selected);
  }
  function zoom(next) {
    scale = next;
    const svg = document.getElementById('networkSvg');
    if (svg) svg.style.transform = `scale(${scale})`;
  }
  function draw() {
    const svg = document.getElementById('networkSvg'); if (!svg || !data) return;
    svg.innerHTML = '';
    const nodes = Object.fromEntries([data.center, ...data.nodes].map(n => [n.id,n]));
    const bg = svgEl('g');
    [[90,60,176,85],[250,64,112,62],[433,68,150,62],[560,61,183,73],[758,80,210,93],[126,321,144,142],[427,279,170,178],[785,334,206,146]].forEach(r => bg.appendChild(svgEl('path',{class:'network-world',d:`M ${r[0]} ${r[1]} q ${r[2]/2} -22 ${r[2]} 8 q -24 ${r[3]/2} -5 ${r[3]} q -${r[2]/2} 18 -${r[2]} -5 z`})));
    for (let x=45;x<1010;x+=35) bg.appendChild(svgEl('line',{class:'network-grid',x1:x,y1:50,x2:x,y2:510}));
    for (let y=72;y<510;y+=34) bg.appendChild(svgEl('line',{class:'network-grid',x1:42,y1:y,x2:1005,y2:y}));
    svg.appendChild(bg);
    const links = svgEl('g');
    data.nodes.forEach(node => {
      const cls = node.status === 'planned' ? 'network-link-plan' : 'network-link-direct';
      const path = svgEl('path',{class:`${cls}${visible(node) ? '' : ' network-link-hidden'}`,d:curve(data.center,node)});
      links.appendChild(path);
    });
    data.peer_links.forEach(pair => {
      const a = nodes[pair[0]], b = nodes[pair[1]]; if (!a || !b) return;
      const planned = a.status === 'planned' || b.status === 'planned';
      const dim = !visible(a) || !visible(b);
      links.appendChild(svgEl('path',{class:`${planned ? 'network-link-plan':'network-link-peer'}${dim ? ' network-link-hidden':''}`,d:curve(a,b)}));
    });
    svg.appendChild(links);
    const centerGlow = svgEl('circle',{class:'network-center-glow',cx:data.center.x,cy:data.center.y,r:62}); svg.appendChild(centerGlow);
    const cg = svgEl('g',{class:'network-node selected'}); cg.onclick = () => {selected='boulder'; detail(selected); draw();};
    cg.appendChild(svgEl('rect',{class:'network-center',x:data.center.x-91,y:data.center.y-29,width:182,height:58,rx:8}));
    const title = svgEl('text',{class:'network-center-label',x:data.center.x,y:data.center.y-4,'text-anchor':'middle'}); title.textContent='GNK DINAMO Ltd.'; cg.appendChild(title);
    const sub = svgEl('text',{class:'network-center-sub',x:data.center.x,y:data.center.y+15,'text-anchor':'middle'}); sub.textContent='BOULDER, COLORADO, USA'; cg.appendChild(sub); svg.appendChild(cg);
    const ng = svgEl('g');
    data.nodes.forEach(node => {
      const g = svgEl('g',{class:`network-node ${node.status}${selected===node.id?' selected':''}${visible(node)?'':' dim'}`});
      g.onclick = () => { selected=node.id; detail(selected); draw(); };
      g.appendChild(svgEl('circle',{cx:node.x,cy:node.y,r:node.compact?6:7}));
      if (!node.compact) {
        const name = svgEl('text',{class:'network-node-label',x:node.x+10,y:node.y-2}); name.textContent=text(node,'name'); g.appendChild(name);
        const place = svgEl('text',{class:'network-node-sub',x:node.x+10,y:node.y+10}); place.textContent=text(node,'place'); g.appendChild(place);
      }
      ng.appendChild(g);
    });
    const box = svgEl('rect',{class:'network-serbia-box',x:486,y:174,width:75,height:64,rx:9}); ng.insertBefore(box,ng.firstChild);
    const serbia = svgEl('text',{class:'network-serbia-title',x:523,y:186,'text-anchor':'middle'}); serbia.textContent=en()?'SERBIA':'SRBIJA'; ng.appendChild(serbia);
    svg.appendChild(ng);
  }
  function detail(id) {
    const box = document.getElementById('networkDetail'); if (!box || !data) return;
    const c=t(), node=id==='boulder'?data.center:data.nodes.find(n=>n.id===id);
    if (!node) return;
    const name=node.id==='boulder'?node.name:text(node,'name');
    const place=node.id==='boulder'?node.place:text(node,'place');
    const state=node.id==='boulder'?'hq':node.status;
    const stateLabel=state==='hq'?c.hqState:state==='active'?c.activeState:c.plannedState;
    box.innerHTML=`<small>${c.select}</small><h4>${name}</h4><p>${place}</p><p><strong>${c.region}:</strong> ${node.region}</p><span class="state ${state}">${stateLabel}</span>`;
  }
  function renderRegions() {
    const out=document.getElementById('networkRegions'); if (!out || !data) return;
    const regions=['Europa','Sjeverna Amerika','Južna Amerika','Azija','Afrika','Oceanija'];
    out.innerHTML=regions.map(region => { const existing=data.nodes.filter(n=>n.region===region && n.status==='active').length + (region==='Sjeverna Amerika'?1:0); const planned=data.nodes.filter(n=>n.region===region && n.status==='planned').length; return `<div class="network-region"><strong>${existing}</strong><span>${region} · ${t().existing}</span><em>+${planned} ${t().plannedShort}</em></div>`; }).join('');
  }
  async function init() {
    try { const res=await fetch('data/group_network.json?v='+Date.now(),{cache:'no-store'}); if (!res.ok) return; data=await res.json(); renderSection(); } catch(e) {}
    window.addEventListener('gnk-language-change', () => data && buildShell());
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
