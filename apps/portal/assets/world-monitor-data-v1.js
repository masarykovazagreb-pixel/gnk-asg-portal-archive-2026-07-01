(()=>{
'use strict';
// GNK ASG — World Monitor kategorizirani podaci za AKTUAL MEDIA.
function isEnglish(){
  return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ||
    /\/en\//.test(location.pathname) || /\/en$/.test(location.pathname);
}
const en = isEnglish();

const CATEGORIES = [
  { key: 'geopolitical', label_hr: 'Geopolitika', label_en: 'Geopolitical', subs: [
    { key: 'conflicts', label_hr: 'Sukobi', label_en: 'Conflicts' },
    { key: 'military', label_hr: 'Vojska', label_en: 'Military' },
    { key: 'unrest', label_hr: 'Nemiri', label_en: 'Unrest' },
    { key: 'intelligence', label_hr: 'Obavještajno', label_en: 'Intelligence' },
    { key: 'displacement', label_hr: 'Raseljavanje', label_en: 'Displacement' },
    { key: 'cyber', label_hr: 'Cyber', label_en: 'Cyber' },
    { key: 'sanctions', label_hr: 'Sankcije', label_en: 'Sanctions' },
  ]},
  { key: 'natural', label_hr: 'Prirodni događaji', label_en: 'Natural events', subs: [
    { key: 'disasters', label_hr: 'Katastrofe', label_en: 'Natural Disasters' },
    { key: 'seismology', label_hr: 'Seizmologija', label_en: 'Seismology' },
    { key: 'climate', label_hr: 'Klima', label_en: 'Climate' },
    { key: 'wildfires', label_hr: 'Požari', label_en: 'Wildfires' },
    { key: 'radiation', label_hr: 'Radijacija', label_en: 'Radiation' },
    { key: 'thermal', label_hr: 'Toplinsko', label_en: 'Thermal' },
  ]},
  { key: 'economy', label_hr: 'Ekonomija i tržišta', label_en: 'Economy & markets', subs: [
    { key: 'economic', label_hr: 'Ekonomski pokazatelji', label_en: 'Economic' },
    { key: 'markets', label_hr: 'Tržišta', label_en: 'Markets' },
    { key: 'trade', label_hr: 'Trgovina', label_en: 'Trade' },
    { key: 'supplychain', label_hr: 'Opskrbni lanci', label_en: 'Supply Chain' },
    { key: 'prices', label_hr: 'Potrošačke cijene', label_en: 'Consumer Prices' },
    { key: 'predictions', label_hr: 'Predikcijska tržišta', label_en: 'Predictions' },
    { key: 'forecasts', label_hr: 'Prognoze', label_en: 'Forecasts' },
  ]},
  { key: 'infrastructure', label_hr: 'Infrastruktura i promet', label_en: 'Infrastructure & transport', subs: [
    { key: 'aviation', label_hr: 'Zrakoplovstvo', label_en: 'Aviation' },
    { key: 'maritime', label_hr: 'Pomorstvo', label_en: 'Maritime' },
    { key: 'infra', label_hr: 'Infrastruktura', label_en: 'Infrastructure' },
    { key: 'resilience', label_hr: 'Otpornost zemalja', label_en: 'Resilience' },
  ]},
  { key: 'health', label_hr: 'Zdravlje i okoliš', label_en: 'Health & environment', subs: [
    { key: 'publichealth', label_hr: 'Javno zdravlje', label_en: 'Public Health' },
    { key: 'imagery', label_hr: 'Snimke', label_en: 'Imagery' },
    { key: 'webcams', label_hr: 'Web kamere', label_en: 'Webcams' },
  ]},
  { key: 'other', label_hr: 'Ostalo', label_en: 'Other', subs: [
    { key: 'news', label_hr: 'Vijesti', label_en: 'News' },
    { key: 'research', label_hr: 'Istraživanje', label_en: 'Research' },
    { key: 'positive', label_hr: 'Pozitivni događaji', label_en: 'Positive Events' },
  ]},
];

function esc(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function fmtTime(iso){
  try { return new Date(iso).toLocaleString(en?'en-GB':'hr-HR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return iso||''; }
}

function renderItemsList(sub){
  if (!sub.items || !sub.items.length) return `<div class="wmd-empty">${en?'No items right now.':'Trenutno nema stavki.'}</div>`;
  const rows = sub.items.map(it => {
    if (it.cveId) {
      // CISA KEV cyber stavka
      return `<div class="wmd-item"><div class="wmd-item-head"><span class="wmd-item-tag${it.ransomware?' wmd-item-tag-danger':''}">${esc(it.cveId)}</span>${it.ransomware?`<span class="wmd-item-ransomware">${en?'Ransomware use':'Ransomware upotreba'}</span>`:''}</div><div class="wmd-item-title">${esc(it.name||it.product||'')}</div><div class="wmd-item-meta">${esc(it.vendor||'')} · ${en?'Added':'Dodano'} ${esc(it.dateAdded||'')}</div></div>`;
    }
    // GDELT vijest
    return `<a class="wmd-item wmd-item-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer nofollow"><div class="wmd-item-title">${esc(it.title||'')}</div><div class="wmd-item-meta">${esc(it.domain||'')} · ${esc(it.country||'')} · ${fmtTime(it.seenAt)}</div></a>`;
  }).join('');
  const sourceLine = sub.source_name ? `<div class="wmd-source">${en?'Source':'Izvor'}: ${esc(sub.source_name)}</div>` : '';
  return `<div class="wmd-items">${rows}</div>${sourceLine}`;
}

function renderSubState(catData, subKey){
  const sub = catData && catData[subKey];
  if (!sub) return `<span class="wmd-pending">${en?'Not yet configured':'Još nije konfigurirano'}</span>`;
  if (sub.state === 'needs-key') return `<span class="wmd-needs-key">${en?'Awaiting API connection':'Čeka se API veza'}</span>`;
  if (sub.state === 'unverified-endpoint') return `<span class="wmd-pending">${en?'Endpoint pending verification':'Endpoint čeka provjeru'}</span>`;
  if (sub.state === 'unavailable') return `<span class="wmd-unavailable">${en?'Temporarily unavailable':'Trenutno nedostupno'}</span>`;
  if (sub.state === 'live' && sub.items) return renderItemsList(sub);
  if (sub.state === 'live') return `<span class="wmd-live">${en?'Live':'Uživo'} ✓</span>`;
  return '';
}

function render(payload){
  const root = document.getElementById('akWorldMonitorData');
  if (!root) return;
  const cats = (payload && payload.categories) || {};
  const tabsHtml = CATEGORIES.map((c,i) => `<button type="button" class="wmd-tab${i===0?' active':''}" data-wmd-tab="${c.key}">${en?c.label_en:c.label_hr}</button>`).join('');
  const panelsHtml = CATEGORIES.map((c,i) => {
    const subsHtml = c.subs.map(s => {
      const sub = cats[c.key] && cats[c.key][s.key];
      const hasItems = sub && sub.state === 'live' && sub.items;
      const stateHtml = renderSubState(cats[c.key], s.key);
      if (hasItems) {
        return `<div class="wmd-sub-block"><div class="wmd-sub-block-label">${en?s.label_en:s.label_hr}</div>${stateHtml}</div>`;
      }
      return `<div class="wmd-sub-row"><span class="wmd-sub-label">${en?s.label_en:s.label_hr}</span>${stateHtml}</div>`;
    }).join('');
    return `<div class="wmd-panel${i===0?' active':''}" data-wmd-panel="${c.key}">${subsHtml}</div>`;
  }).join('');
  root.innerHTML = `<div class="wmd-tabs">${tabsHtml}</div><div class="wmd-panels">${panelsHtml}</div>` +
    (payload && payload.updated_at ? `<div class="wmd-updated">${en?'Updated':'Ažurirano'}: ${new Date(payload.updated_at).toLocaleString(en?'en-GB':'hr-HR')}</div>` : '');

  root.querySelectorAll('[data-wmd-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-wmd-tab]').forEach(b => b.classList.remove('active'));
      root.querySelectorAll('[data-wmd-panel]').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      root.querySelector(`[data-wmd-panel="${btn.dataset.wmdTab}"]`)?.classList.add('active');
    });
  });
}

fetch('/data/world-monitor.json?v=' + Date.now(), { cache: 'no-store' })
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(render)
  .catch(() => {
    const root = document.getElementById('akWorldMonitorData');
    if (root) root.innerHTML = `<span class="wmd-unavailable">${en?'Data temporarily unavailable.':'Podaci trenutno nedostupni.'}</span>`;
  });
})();
