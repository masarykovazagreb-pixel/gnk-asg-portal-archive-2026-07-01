(()=>{
'use strict';
// GNK ASG — World Monitor podaci (besplatni javni izvori) za AKTUAL MEDIA.
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
    /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
const en = isEnglish();

const SECTIONS = [
  { cat: 'natural', sub: 'seismology', label_hr: 'Potresi (USGS)', label_en: 'Earthquakes (USGS)' },
  { cat: 'geopolitical', sub: 'conflicts', label_hr: 'Sukobi i nemiri (GDELT)', label_en: 'Conflicts & Unrest (GDELT)' },
  { cat: 'economy', sub: 'economic', label_hr: 'Ekonomski pokazatelji (World Bank)', label_en: 'Economic indicators (World Bank)' },
];

function esc(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderSection(sec, data){
  const label = en ? sec.label_en : sec.label_hr;
  if (!data || data.state === 'unavailable') {
    return `<div class="wmd-block"><div class="wmd-block-label">${label}</div><span class="wmd-unavailable">${en?'Temporarily unavailable':'Trenutno nedostupno'}</span></div>`;
  }
  if (data.state !== 'live' || !data.items || !data.items.length) {
    return `<div class="wmd-block"><div class="wmd-block-label">${label}</div><span class="wmd-pending">${en?'No current items':'Trenutno nema stavki'}</span></div>`;
  }
  const items = data.items.slice(0, 5).map(it => {
    const title = esc(it.title || '');
    const link = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer nofollow" class="wmd-item-link">${title}</a>` : `<span>${title}</span>`;
    return `<div class="wmd-item">${link}</div>`;
  }).join('');
  const src = data.source_name ? `<div class="wmd-source">${en?'Source':'Izvor'}: <a href="${esc(data.source_url||'#')}" target="_blank" rel="noopener noreferrer nofollow">${esc(data.source_name)}</a></div>` : '';
  return `<div class="wmd-block"><div class="wmd-block-label">${label}</div><div class="wmd-items">${items}</div>${src}</div>`;
}

function render(payload){
  const root = document.getElementById('akWorldMonitorData');
  if (!root) return;
  const cats = (payload && payload.categories) || {};
  const html = SECTIONS.map(sec => renderSection(sec, cats[sec.cat] && cats[sec.cat][sec.sub])).join('');
  const updated = payload && payload.updated_at ? `<div class="wmd-updated">${en?'Updated':'Ažurirano'}: ${new Date(payload.updated_at).toLocaleString(en?'en-GB':'hr-HR')}</div>` : '';
  root.innerHTML = `<style>.wmd-block{padding:12px 0;border-bottom:1px solid var(--ak-line)}.wmd-block-label{font-weight:700;color:var(--ak-text);font-size:.85rem;margin-bottom:8px;font-family:Arial,sans-serif}.wmd-items{display:flex;flex-direction:column;gap:6px}.wmd-item{font-size:.82rem;line-height:1.4;font-family:Arial,sans-serif}.wmd-item-link{color:var(--ak-text);text-decoration:none}.wmd-item-link:hover{color:var(--ak-red)}.wmd-unavailable{color:#c98a8a;font-size:.8rem;font-family:Arial,sans-serif}.wmd-pending{color:var(--ak-sub);font-size:.8rem;font-family:Arial,sans-serif}.wmd-source{font-size:.68rem;color:var(--ak-sub);margin-top:8px;font-family:Arial,sans-serif}.wmd-updated{font-size:.68rem;color:var(--ak-sub);margin-top:10px;font-family:Arial,sans-serif}</style>${html}${updated}`;
}

fetch('/data/world-monitor.json?v=' + Date.now(), { cache: 'no-store' })
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(render)
  .catch(() => {
    const root = document.getElementById('akWorldMonitorData');
    if (root) root.innerHTML = `<span class="wmd-unavailable">${en?'Data temporarily unavailable.':'Podaci trenutno nedostupni.'}</span>`;
  });
})();
