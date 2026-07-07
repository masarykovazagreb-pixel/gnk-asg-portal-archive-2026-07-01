(() => {
  'use strict';
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && path !== '/en') return;
  if (window.__GNK_ASG_INDEX_FINAL_RUNTIME_V1__) return;
  window.__GNK_ASG_INDEX_FINAL_RUNTIME_V1__ = true;

  const en = path === '/en';
  const T = (hr, ent) => en ? ent : hr;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => Number(v || 0).toLocaleString(en ? 'en-US' : 'hr-HR');
  const allowed = new Set(['/data/public-operational-feed.json','/data/public-conclusions.json','/data/group-entities-project-business.json','/data/worker-results-3h.json']);
  const getJson = async (url, fallback) => {
    if (!allowed.has(url)) return fallback;
    try { const r = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' } }); return r.ok ? await r.json() : fallback; }
    catch (_) { return fallback; }
  };
  const loadScript = src => new Promise(resolve => {
    if ([...document.scripts].some(s => s.src && s.src.includes(src))) return resolve(false);
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => resolve(true); s.onerror = () => resolve(false); document.head.appendChild(s);
  });
  const setText = (id, value) => { const n = document.getElementById(id); if (n) n.textContent = value; };

  const ensureCss = () => {
    if ([...document.styleSheets].some(s => s.href && s.href.includes('/assets/index-final-v1.css'))) return;
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/index-final-v1.css?v=20260708-final'; document.head.appendChild(link);
  };

  const ensureCorporateMapHost = () => {
    if (document.getElementById('corporate-map-cards')) return;
    const before = document.getElementById('digital-workforce') || document.getElementById('posts-news') || document.querySelector('main > section:last-of-type');
    if (!before || !before.parentNode) return;
    const section = document.createElement('section');
    section.className = 'wrap panel'; section.id = 'corporate-project-map'; section.setAttribute('data-section','corporate-map'); section.setAttribute('data-source','/data/group-entities-project-business.json');
    section.innerHTML = `<div class='head'><div><p class='k'>${T('Firme i projektni slojevi','Corporate and project layers')}</p><h2>${T('Javna mapa društava, lokacija i projekata.','Public map of entities, locations and projects.')}</h2><p>${T('Ovaj prikaz je javni operativni sažetak, ne samostalni pravni certifikat vlasništva.','This view is a public operating summary, not a standalone legal ownership certificate.')}</p></div></div><div class='grid three' id='corporate-map-cards'><article class='card'><span class='tag'>GNK ASG d.o.o.</span><h3>${T('Hrvatska tehnološka i operativna jezgra','Croatian technology and operating core')}</h3><p>${T('Softverski integrator, javni financijski sažetak i operativni sloj portala.','Software integrator, public financial summary and operating portal layer.')}</p></article><article class='card'><span class='tag'>GNK DINAMO Ltd. Group</span><h3>${T('Američka tržišna i grupna platforma','US market and group platform')}</h3><p>${T('Colorado platforma za međunarodne ugovore, financiranje, širenje i THE CODE.','Colorado platform for international contracts, financing, expansion and THE CODE.')}</p></article><article class='card'><span class='tag'>33 + 12</span><h3>${T('Mreža i plan širenja','Network and expansion plan')}</h3><p>${T('33 postojeće i 12 planiranih pozicija prikazati uz jasnu razliku između registriranih i planiranih lokacija.','33 existing and 12 planned positions shown with a clear distinction between registered and planned locations.')}</p></article></div><div class='disclaimer'>${T('Planirane lokacije nisu prikazane kao već registrirana sjedišta bez zasebne dokumentacije.','Planned locations are not presented as already registered seats without separate documentation.')}</div>`;
    before.parentNode.insertBefore(section, before);
  };

  const renderPublicDesk = (feed, conclusions, workerResults) => {
    const host = document.getElementById('public-feed-cards'); if (!host) return;
    const items = [];
    const push = item => {
      if (!item || items.length >= 4) return;
      const title = item.title || item.name || item.summary || item.task; if (!title) return;
      items.push({ label:String(item.type || item.status || item.category || T('OBJAVA','POST')).toUpperCase(), title, summary:item.summary || item.description || item.url || T('Javni operativni zapis.','Public operating record.'), url:item.url || item.href || '/objave/' });
    };
    (feed?.latest || []).forEach(push); (conclusions?.items || []).forEach(push); (workerResults?.workers || []).forEach(push);
    if (!items.length) return;
    host.innerHTML = items.map(item => `<a class='story' href='${esc(item.url)}'><time>${esc(item.label)}</time><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p></a>`).join('');
  };

  const renderCorporateMap = data => {
    ensureCorporateMapHost();
    const host = document.getElementById('corporate-map-cards'); if (!host || !data) return;
    const entities = Array.isArray(data.entities) ? data.entities : [];
    const projects = Array.isArray(data.projectBusiness) ? data.projectBusiness : [];
    const cards = entities.slice(0,5).map(e => ({ tag:e.type || e.jurisdiction || T('Entitet','Entity'), title:e.name || e.title, text:e.summary || e.role || e.description || T('Javna operativna mapa.','Public operating map.') }));
    if (projects.length) cards.push({ tag:T('Projekti','Projects'), title:T('Projektni poslovni slojevi','Project business layers'), text:projects.slice(0,9).map(x => x.title || x.name || x).filter(Boolean).join(' · ') });
    if (!cards.length) return;
    host.innerHTML = cards.slice(0,6).map(c => `<article class='card'><span class='tag'>${esc(c.tag)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('');
  };

  const renderWorkforce = async () => {
    await Promise.all([loadScript('/assets/js/digital-workforce-directory-v1.js'), loadScript('/assets/js/digital-workforce-company-layer-v1.js')]);
    const d = window.GNKDigitalWorkforceDirectory || {};
    const profiles = Number(d.count) || (Array.isArray(d.profiles) ? d.profiles.length : 1537);
    const primary = Number(d.primaryLocations || d.primaryLocationCount) || 33;
    const expanded = Number(d.expandedLocations || d.expandedLocationCount) || 12;
    const total = Number(d.companyCount || d.locationCount) || primary + expanded;
    setText('dw-profiles', fmt(profiles)); setText('dw-primary', fmt(primary)); setText('dw-expanded', fmt(expanded)); setText('dw-total', fmt(total));
  };

  const boot = async () => {
    ensureCss(); ensureCorporateMapHost();
    const [feed, conclusions, groupData, workers] = await Promise.all([
      getJson('/data/public-operational-feed.json', {latest:[]}), getJson('/data/public-conclusions.json', {items:[]}), getJson('/data/group-entities-project-business.json', null), getJson('/data/worker-results-3h.json', {workers:[]})
    ]);
    renderPublicDesk(feed, conclusions, workers); renderCorporateMap(groupData); renderWorkforce();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
