(() => {
  'use strict';

  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && path !== '/en') return;
  if (window.__GNK_ASG_INDEX_CANVA_FINAL_V1__) return;
  window.__GNK_ASG_INDEX_CANVA_FINAL_V1__ = true;

  const en = path === '/en';
  const T = (hr, enText) => en ? enText : hr;
  const fmt = value => Number(value || 0).toLocaleString(en ? 'en-US' : 'hr-HR');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[char]));

  const warn = (label, err) => {
    try { console.warn('[GNK index]', label, err && err.message ? err.message : err || 'fallback active'); } catch (_) {}
  };

  const getJson = async (url, fallback) => {
    try {
      const response = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch (err) {
      warn(url, err);
      return fallback;
    }
  };

  const loadScript = src => new Promise(resolve => {
    try {
      if ([...document.scripts].some(script => script.src && script.src.includes(src))) return resolve(false);
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => { warn(src); resolve(false); };
      document.head.appendChild(script);
    } catch (err) {
      warn(src, err);
      resolve(false);
    }
  });

  const pickItems = (feed, conclusions, workerResults) => {
    const out = [];
    const push = item => {
      if (!item || out.length >= 4) return;
      const title = item.title || item.name || item.summary || item.task || '';
      if (!title) return;
      out.push({
        label: String(item.type || item.status || item.category || T('OBJAVA','POST')).toUpperCase(),
        title,
        summary: item.summary || item.description || item.url || T('Javni operativni zapis.', 'Public operating record.'),
        url: item.url || item.href || '/objave/'
      });
    };
    (feed && Array.isArray(feed.latest) ? feed.latest : []).forEach(push);
    (conclusions && Array.isArray(conclusions.items) ? conclusions.items : []).forEach(push);
    (workerResults && Array.isArray(workerResults.workers) ? workerResults.workers : []).forEach(push);
    return out.slice(0, 4);
  };

  const renderPublicDesk = (feed, conclusions, workerResults) => {
    const host = document.getElementById('public-feed-cards');
    if (!host) return;
    const items = pickItems(feed, conclusions, workerResults);
    if (!items.length) return;
    host.innerHTML = items.map(item => `
      <a class='story' href='${esc(item.url)}'>
        <time>${esc(item.label)}</time>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.summary)}</p>
      </a>
    `).join('');
  };

  const readDirectoryCount = directory => {
    if (!directory) return 1537;
    if (Number(directory.count)) return Number(directory.count);
    if (Array.isArray(directory.profiles)) return directory.profiles.length;
    if (Array.isArray(directory.items)) return directory.items.length;
    return 1537;
  };

  const updateText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const renderWorkforce = directory => {
    const profiles = readDirectoryCount(directory);
    const primary = Number(directory && (directory.primaryLocations || directory.primaryLocationCount)) || 33;
    const expanded = Number(directory && (directory.expandedLocations || directory.expandedLocationCount)) || 12;
    const total = Number(directory && (directory.companyCount || directory.locationCount)) || primary + expanded || 45;
    updateText('dw-profiles', fmt(profiles));
    updateText('dw-primary', fmt(primary));
    updateText('dw-expanded', fmt(expanded));
    updateText('dw-total', fmt(total));
  };

  const boot = async () => {
    const [feed, conclusions, workerResults] = await Promise.all([
      getJson('/data/public-operational-feed.json', { latest:[] }),
      getJson('/data/public-conclusions.json', { items:[] }),
      getJson('/data/worker-results-3h.json', { workers:[] })
    ]);

    renderPublicDesk(feed, conclusions, workerResults);

    await Promise.all([
      loadScript('/assets/js/digital-workforce-directory-v1.js'),
      loadScript('/assets/js/digital-workforce-company-layer-v1.js')
    ]);

    renderWorkforce(window.GNKDigitalWorkforceDirectory || null);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
