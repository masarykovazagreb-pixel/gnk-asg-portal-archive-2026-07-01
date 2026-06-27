(() => {
  'use strict';

  const app = document.getElementById('app');
  const state = {config:null,lang:'hr'};
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const t = value => value && typeof value === 'object' && !Array.isArray(value) ? (value[state.lang] ?? value.hr ?? value.en ?? '') : (value ?? '');

  const locations = [
    ['Boulder','Boulder','SAD','United States','Sjeverna Amerika','North America',40.015,-105.2705,'existing','parent'],['Zagreb','Zagreb','Hrvatska','Croatia','Europa','Europe',45.815,15.982,'existing','hub'],['Ljubljana','Ljubljana','Slovenija','Slovenia','Europa','Europe',46.0569,14.5058,'existing',''],['Budimpešta','Budapest','Mađarska','Hungary','Europa','Europe',47.4979,19.0402,'existing',''],['Beograd','Belgrade','Srbija','Serbia','Europa','Europe',44.7866,20.4489,'existing',''],['Novi Sad','Novi Sad','Srbija','Serbia','Europa','Europe',45.2671,19.8335,'existing',''],['Niš','Niš','Srbija','Serbia','Europa','Europe',43.3209,21.8958,'existing',''],['Kragujevac','Kragujevac','Srbija','Serbia','Europa','Europe',44.0128,20.9114,'existing',''],['Vancouver','Vancouver','Kanada','Canada','Sjeverna Amerika','North America',49.2827,-123.1207,'existing',''],['Toronto','Toronto','Kanada','Canada','Sjeverna Amerika','North America',43.6532,-79.3832,'existing',''],['Mexico City','Mexico City','Meksiko','Mexico','Sjeverna Amerika','North America',19.4326,-99.1332,'existing',''],['Panama City','Panama City','Panama','Panama','Sjeverna Amerika','North America',8.9824,-79.5199,'existing',''],['Bogotá','Bogotá','Kolumbija','Colombia','Južna Amerika','South America',4.711,-74.0721,'existing',''],['Lima','Lima','Peru','Peru','Južna Amerika','South America',-12.0464,-77.0428,'existing',''],['Santiago','Santiago','Čile','Chile','Južna Amerika','South America',-33.4489,-70.6693,'existing',''],['São Paulo','São Paulo','Brazil','Brazil','Južna Amerika','South America',-23.5505,-46.6333,'existing',''],['Buenos Aires','Buenos Aires','Argentina','Argentina','Južna Amerika','South America',-34.6037,-58.3816,'existing',''],['Dubai','Dubai','UAE','UAE','Azija','Asia',25.2048,55.2708,'existing',''],['Mumbai','Mumbai','Indija','India','Azija','Asia',19.076,72.8777,'existing',''],['Singapur','Singapore','Singapur','Singapore','Azija','Asia',1.3521,103.8198,'existing',''],['Jakarta','Jakarta','Indonezija','Indonesia','Azija','Asia',-6.2088,106.8456,'existing',''],['Peking','Beijing','Kina','China','Azija','Asia',39.9042,116.4074,'existing',''],['Seul','Seoul','Južna Koreja','South Korea','Azija','Asia',37.5665,126.978,'existing',''],['Tokio','Tokyo','Japan','Japan','Azija','Asia',35.6762,139.6503,'existing',''],['Kuala Lumpur','Kuala Lumpur','Malezija','Malaysia','Azija','Asia',3.139,101.6869,'existing',''],['Hong Kong','Hong Kong','Hong Kong','Hong Kong','Azija','Asia',22.3193,114.1694,'existing',''],['Casablanca','Casablanca','Maroko','Morocco','Afrika','Africa',33.5731,-7.5898,'existing',''],['Lagos','Lagos','Nigerija','Nigeria','Afrika','Africa',6.5244,3.3792,'existing',''],['Nairobi','Nairobi','Kenija','Kenya','Afrika','Africa',-1.2921,36.8219,'existing',''],['Johannesburg','Johannesburg','Južna Afrika','South Africa','Afrika','Africa',-26.2041,28.0473,'existing',''],['Cape Town','Cape Town','Južna Afrika','South Africa','Afrika','Africa',-33.9249,18.4241,'existing',''],['Sydney','Sydney','Australija','Australia','Oceanija','Oceania',-33.8688,151.2093,'existing',''],['Auckland','Auckland','Novi Zeland','New Zealand','Oceanija','Oceania',-36.8509,174.7645,'existing',''],['San José','San José','Kostarika','Costa Rica','Sjeverna Amerika','North America',9.9281,-84.0907,'planned',''],['Quito','Quito','Ekvador','Ecuador','Južna Amerika','South America',-0.1807,-78.4678,'planned',''],['Montevideo','Montevideo','Urugvaj','Uruguay','Južna Amerika','South America',-34.9011,-56.1645,'planned',''],['Doha','Doha','Katar','Qatar','Azija','Asia',25.2854,51.531,'planned',''],['Bangkok','Bangkok','Tajland','Thailand','Azija','Asia',13.7563,100.5018,'planned',''],['Manila','Manila','Filipini','Philippines','Azija','Asia',14.5995,120.9842,'planned',''],['Ho Chi Minh','Ho Chi Minh','Vijetnam','Vietnam','Azija','Asia',10.8231,106.6297,'planned',''],['Accra','Accra','Gana','Ghana','Afrika','Africa',5.6037,-0.187,'planned',''],['Kigali','Kigali','Ruanda','Rwanda','Afrika','Africa',-1.9441,30.0619,'planned',''],['Port Louis','Port Louis','Mauricijus','Mauritius','Afrika','Africa',-20.1609,57.5012,'planned',''],['Dar es Salaam','Dar es Salaam','Tanzanija','Tanzania','Afrika','Africa',-6.7924,39.2083,'planned',''],['Perth','Perth','Australija','Australia','Oceanija','Oceania',-31.9523,115.8613,'planned','']
  ];

  function applyTheme(c){
    const r=document.documentElement;
    Object.entries(c.theme||{}).forEach(([key,value])=>r.style.setProperty(`--${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}`,value));
  }

  function identity(data,side){
    return `<a class="identity identity-${side}" href="#${side==='left'?'asg':'dinamo'}"><img src="${esc(data.logo)}" alt="${esc(data.name)}"><span><strong>${esc(data.name)}</strong><small>${esc(t(data.meta))}</small></span></a>`;
  }

  function facts(items){
    return `<dl class="facts">${items.map(item=>`<div><dt>${esc(t(item.label))}</dt><dd>${esc(t(item.value))}</dd></div>`).join('')}</dl>`;
  }

  function metrics(items){
    return `<div class="metrics">${items.map(item=>`<article class="metric"><small>${esc(t(item.label))}</small><strong>${esc(item.value)}</strong></article>`).join('')}</div>`;
  }

  function sectionHead(data){
    return `<div class="section-head"><div><p class="eyebrow">${esc(t(data.eyebrow))}</p><h2>${esc(t(data.heading))}</h2></div><p>${esc(t(data.description))}</p></div>`;
  }

  function render(){
    const c=state.config;
    document.documentElement.lang=state.lang;
    document.title=`${c.brand.asg.name} · ${c.brand.dinamo.name}`;
    app.innerHTML=`
      <header class="site-header" data-header>
        ${identity(c.brand.asg,'left')}
        <nav class="nav" aria-label="${state.lang==='en'?'Main navigation':'Glavna navigacija'}">${c.navigation.map(item=>`<a href="#${esc(item.id)}">${esc(t(item))}</a>`).join('')}</nav>
        <div class="right-cluster">${identity(c.brand.dinamo,'right')}<button class="lang-toggle" type="button" data-language>${state.lang==='hr'?'EN':'HR'}</button><button class="menu-toggle" type="button" data-menu aria-label="${state.lang==='en'?'Open menu':'Otvori izbornik'}">☰</button></div>
      </header>
      <main id="content">
        <section class="code-section" id="code">
          <div class="inner code-head"><div><p class="eyebrow">${esc(t(c.code.label))}</p><h1>${esc(c.code.title)}</h1><p>${esc(t(c.code.note))}</p></div><button class="button" type="button" data-fullscreen>${esc(t(c.code.fullscreen))}</button></div>
          <div class="code-stage" data-code-stage style="--code-ratio:${esc(c.settings.codeAspectRatio)}"><iframe src="${esc(c.settings.codeUrl)}" title="THE CODE" scrolling="no" tabindex="-1" aria-label="THE CODE fixed presentation" loading="eager"></iframe><div class="code-lock" aria-hidden="true"></div></div>
        </section>
        <section class="company-section company-asg" id="asg">
          <div class="inner">${sectionHead(c.asg)}<div class="company-layout"><article class="company-facts"><div class="company-mark"><img src="${esc(c.brand.asg.logo)}" alt=""><h3>${esc(c.asg.heading)}</h3></div>${facts(c.asg.facts)}<a class="button primary pdf-button" href="${esc(c.settings.financialPdf)}" download>${esc(t(c.asg.pdfLabel))}</a></article><article class="company-finance">${metrics(c.asg.metrics)}</article></div></div>
        </section>
        <section class="company-section company-dinamo" id="dinamo">
          <div class="inner">${sectionHead(c.dinamo)}<div class="company-layout"><article class="company-facts"><div class="company-mark"><img src="${esc(c.brand.dinamo.logo)}" alt=""><h3>${esc(c.dinamo.heading)}</h3></div>${facts(c.dinamo.facts)}</article><article class="company-finance">${metrics(c.dinamo.metrics)}</article></div></div>
        </section>
        <section class="network-section" id="network">
          <div class="inner network-head"><div><p class="eyebrow">${esc(c.network.eyebrow)}</p><h2>${esc(t(c.network.heading))}</h2><p>${esc(t(c.network.description))}</p></div><div class="network-stats">${c.network.stats.map(item=>`<div><strong>${esc(item.value)}</strong><small>${esc(t(item))}</small></div>`).join('')}</div></div>
          <div class="map-wrap"><svg id="worldMap" viewBox="0 0 1600 760" role="img" aria-label="${state.lang==='en'?'GNK DINAMO Ltd. global network':'Globalna mreža GNK DINAMO Ltd.'}"></svg><div class="map-tooltip" data-tooltip></div><div class="legend"><span><i></i>${state.lang==='en'?'Existing':'Postojeće'}</span><span class="planned"><i></i>${state.lang==='en'?'Planned':'Planirano'}</span></div></div>
        </section>
      </main>
      <footer class="footer"><span>${esc(c.footer.copyright)}</span><span>${esc(t(c.footer.note))}</span></footer>`;
    bind();
    renderMap();
  }

  function bind(){
    const header=app.querySelector('[data-header]');
    app.querySelector('[data-language]')?.addEventListener('click',()=>{state.lang=state.lang==='hr'?'en':'hr';localStorage.setItem('gnk-onepage-language',state.lang);render();});
    app.querySelector('[data-menu]')?.addEventListener('click',()=>header?.classList.toggle('menu-open'));
    app.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>header?.classList.remove('menu-open')));
    app.querySelector('[data-fullscreen]')?.addEventListener('click',()=>app.querySelector('[data-code-stage]')?.requestFullscreen?.());
  }

  function project(lon,lat){return [(lon+180)/360*1600,(90-lat)/180*760];}
  function geoPath(feature){
    const polygons=feature.geometry?.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates:[];
    return polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>{const [x,y]=project(p[0],p[1]);return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ')+' Z').join(' ')).join(' ');
  }
  function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;}
  function addGraticule(svg){
    for(let lon=-150;lon<=150;lon+=30){const [x]=project(lon,0);svg.append(svgEl('line',{x1:x,y1:36,x2:x,y2:724,class:'graticule'}));}
    for(let lat=-60;lat<=60;lat+=30){const [,y]=project(0,lat);svg.append(svgEl('line',{x1:35,y1:y,x2:1565,y2:y,class:'graticule'}));}
  }
  function fallbackContinents(svg){
    const paths=['M105 190 C190 90 370 80 505 150 C555 215 520 300 425 326 C330 355 220 315 142 278 Z','M405 330 C500 350 555 430 535 535 C505 650 430 690 385 600 C350 520 360 410 405 330 Z','M705 155 C820 75 1090 75 1270 175 C1355 255 1290 365 1140 360 C1010 350 915 285 825 310 C750 300 690 235 705 155 Z','M760 330 C875 305 980 360 1000 480 C965 625 860 660 785 565 C735 490 720 400 760 330 Z','M1270 475 C1355 430 1470 450 1510 535 C1485 625 1375 650 1295 600 C1255 565 1245 515 1270 475 Z'];
    paths.forEach(d=>svg.append(svgEl('path',{d,class:'country fallback'})));
  }
  async function renderMap(){
    const svg=document.getElementById('worldMap');if(!svg)return;svg.innerHTML='';addGraticule(svg);
    try{
      const response=await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',{cache:'force-cache'});
      if(!response.ok)throw new Error(`MAP_${response.status}`);
      const geo=await response.json();
      geo.features.forEach(feature=>svg.append(svgEl('path',{d:geoPath(feature),class:'country'})));
    }catch(_){fallbackContinents(svg);}
    const hub=project(15.982,45.815);
    const routes=svgEl('g',{class:'routes'});svg.append(routes);
    locations.forEach((item,index)=>{if(index===1)return;const p=project(item[7],item[6]);const mx=(hub[0]+p[0])/2;const my=(hub[1]+p[1])/2-Math.min(120,20+Math.abs(p[0]-hub[0])*.07);routes.append(svgEl('path',{d:`M${hub[0]},${hub[1]} Q${mx},${my} ${p[0]},${p[1]}`,class:'route'}));});
    const nodes=svgEl('g',{class:'nodes'});svg.append(nodes);
    const tooltip=document.querySelector('[data-tooltip]');
    locations.forEach(item=>{const p=project(item[7],item[6]);const circle=svgEl('circle',{cx:p[0],cy:p[1],r:item[9]==='hub'?7:item[8]==='planned'?4.5:5,class:`location-dot ${item[8]} ${item[9]||''}`});nodes.append(circle);const city=state.lang==='en'?item[1]:item[0],country=state.lang==='en'?item[3]:item[2];circle.addEventListener('pointerenter',()=>{if(tooltip){tooltip.style.display='block';tooltip.innerHTML=`<strong>${esc(city)}</strong><span>${esc(country)} · ${item[8]==='planned'?(state.lang==='en'?'planned':'planirano'):(state.lang==='en'?'existing':'postojeće')}</span>`;}});circle.addEventListener('pointermove',event=>{if(!tooltip)return;const rect=document.querySelector('.map-wrap').getBoundingClientRect();tooltip.style.left=`${event.clientX-rect.left+14}px`;tooltip.style.top=`${event.clientY-rect.top+14}px`;});circle.addEventListener('pointerleave',()=>{if(tooltip)tooltip.style.display='none';});});
  }

  async function start(){
    try{
      const response=await fetch('./site.config.json',{cache:'no-store'});if(!response.ok)throw new Error(`CONFIG_${response.status}`);
      state.config=await response.json();state.lang=localStorage.getItem('gnk-onepage-language')||state.config.settings.defaultLanguage||'hr';if(!['hr','en'].includes(state.lang))state.lang='hr';applyTheme(state.config);render();
    }catch(error){app.innerHTML=`<div class="error-box"><h1>Portal configuration error</h1><p>Konfiguracija se nije mogla učitati.</p><code>${esc(error?.message||error)}</code></div>`;}
  }
  start();
})();
