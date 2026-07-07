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
    const [feed, conclusions, groupData, workers] = await Promise.all([
      getJson('/data/public-operational-feed.json', {latest:[]}), getJson('/data/public-conclusions.json', {items:[]}), getJson('/data/group-entities-project-business.json', null), getJson('/data/worker-results-3h.json', {workers:[]})
    ]);
    renderPublicDesk(feed, conclusions, workers); renderCorporateMap(groupData); renderWorkforce();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
