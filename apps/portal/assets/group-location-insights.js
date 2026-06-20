(() => {
  'use strict';
  let network = null;
  let facts = null;
  let activeId = 'boulder';
  let renderedKey = '';
  let detailObserverReady = false;
  let clockTimer = null;

  const TIME_ZONES = {
    boulder:'America/Denver', croatia:'Europe/Zagreb', slovenia:'Europe/Ljubljana', hungary:'Europe/Budapest',
    serbia1:'Europe/Belgrade', serbia2:'Europe/Belgrade', serbia3:'Europe/Belgrade', serbia4:'Europe/Belgrade',
    vancouver:'America/Vancouver', toronto:'America/Toronto', mexicocity:'America/Mexico_City', panama:'America/Panama',
    bogota:'America/Bogota', lima:'America/Lima', santiago:'America/Santiago', saopaulo:'America/Sao_Paulo',
    buenosaires:'America/Argentina/Buenos_Aires', dubai:'Asia/Dubai', mumbai:'Asia/Kolkata', singapore:'Asia/Singapore',
    jakarta:'Asia/Jakarta', beijing:'Asia/Shanghai', seoul:'Asia/Seoul', tokyo:'Asia/Tokyo',
    kualalumpur:'Asia/Kuala_Lumpur', hongkong:'Asia/Hong_Kong', casablanca:'Africa/Casablanca', lagos:'Africa/Lagos',
    nairobi:'Africa/Nairobi', johannesburg:'Africa/Johannesburg', capetown:'Africa/Johannesburg', sydney:'Australia/Sydney',
    auckland:'Pacific/Auckland', sanjose:'America/Costa_Rica', quito:'America/Guayaquil', montevideo:'America/Montevideo',
    doha:'Asia/Qatar', bangkok:'Asia/Bangkok', manila:'Asia/Manila', hochiminh:'Asia/Ho_Chi_Minh',
    accra:'Africa/Accra', kigali:'Africa/Kigali', portlouis:'Indian/Mauritius', daressalaam:'Africa/Dar_es_Salaam', perth:'Australia/Perth'
  };
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const tr = () => en() ? {
    select:'Selected group position', country:'Country', continent:'Continent', countryPop:'Country population', cityPop:'City population', status:'Position status',
    local:'Local date and time', timezone:'Time zone', existing:'Existing group company', planned:'Planned expansion 2026', hq:'Central headquarters', finance:'Displayed financial context',
    source:'Demographic source basis', basis:'Figures are indicative; scope of city estimate', locate:'Selected point pulses red on the map and globe.'
  } : {
    select:'Odabrana pozicija grupe', country:'Država', continent:'Kontinent', countryPop:'Stanovnika države', cityPop:'Stanovnika grada', status:'Status pozicije',
    local:'Lokalno vrijeme i datum', timezone:'Vremenska zona', existing:'Postojeće društvo grupe', planned:'Planirano širenje 2026.', hq:'Središnje sjedište', finance:'Prikazani financijski kontekst',
    source:'Osnova demografskih izvora', basis:'Brojevi su orijentacijski; opseg gradskog podatka', locate:'Odabrana točka pulsira crveno na karti i globusu.'
  };
  const items = () => network ? [network.center].concat(network.nodes || []) : [];
  const node = id => items().find(item => item.id === id);
  const nName = item => item.id === 'boulder' ? item.name : (en() ? item.name_en : item.name_hr);
  const nPlace = item => item.id === 'boulder' ? item.place : (en() ? item.place_en : item.place_hr);

  async function get(path) {
    try {
      const response = await fetch(path + '?v=' + Date.now(), { cache:'no-store' });
      return response.ok ? response.json() : null;
    } catch (_) { return null; }
  }
  function localClock(id) {
    const timeZone = TIME_ZONES[id] || 'UTC';
    const locale = en() ? 'en-GB' : 'hr-HR';
    const now = new Date();
    try {
      const time = new Intl.DateTimeFormat(locale, { timeZone, hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).format(now);
      const date = new Intl.DateTimeFormat(locale, { timeZone, weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(now);
      const zone = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName:'short' }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || timeZone;
      return { time, date, zone, timeZone };
    } catch (_) {
      return { time:'—', date:'—', zone:timeZone, timeZone };
    }
  }
  function refreshClock() {
    const clock = document.querySelector('#networkDetail .insight-clock');
    if (!clock) return;
    const local = localClock(activeId);
    const time = clock.querySelector('.insight-clock-time');
    const date = clock.querySelector('.insight-clock-date');
    const zone = clock.querySelector('.insight-clock-zone');
    if (time) time.textContent = local.time;
    if (date) date.textContent = local.date;
    if (zone) zone.textContent = `${tr().timezone}: ${local.zone} · ${local.timeZone}`;
  }
  function findIdFromDetail() {
    const title = document.querySelector('#networkDetail h4')?.textContent.trim();
    const match = title && items().find(item => nName(item) === title || (item.id === 'boulder' && item.name === title));
    return match ? match.id : activeId;
  }
  function positionState(item) {
    const T = tr();
    return item.id === 'boulder' ? T.hq : item.status === 'planned' ? T.planned : T.existing;
  }
  function insightHtml(item, fact) {
    const T = tr();
    const country = en() ? fact.country_en : fact.country_hr;
    const continent = en() ? fact.continent_en : fact.continent_hr;
    const finance = en() ? facts.financial_context_en : facts.financial_context_hr;
    const basis = en() ? facts.population_basis_en : facts.population_basis_hr;
    return `<div class="insight-heading"><small>${esc(T.select)}</small><strong>${esc(nName(item))}</strong><span>${esc(nPlace(item))}</span></div>` +
      `<div class="insight-grid">` +
      `<div><label>${esc(T.country)}</label><b>${esc(country)}</b></div>` +
      `<div><label>${esc(T.continent)}</label><b>${esc(continent)}</b></div>` +
      `<div><label>${esc(T.countryPop)}</label><b>${esc(fact.country_population)}</b></div>` +
      `<div><label>${esc(T.cityPop)}</label><b>${esc(fact.city_population)}</b></div>` +
      `<div class="wide"><label>${esc(T.status)}</label><b>${esc(positionState(item))}</b></div>` +
      `<div class="wide insight-clock"><label>${esc(T.local)}</label><b class="insight-clock-time">—</b><span class="insight-clock-date">—</span><em class="insight-clock-zone"></em></div></div>` +
      `<div class="insight-finance"><label>${esc(T.finance)}</label><p>${esc(finance)}</p></div>` +
      `<details class="insight-source"><summary>${esc(T.source)}</summary><p>${esc(basis)}</p><p>${esc(T.basis)}: ${esc(fact.city_population_scope)}.</p>` +
      `${(facts.sources || []).map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.label)}</a>`).join('')}</details>` +
      `<p class="insight-pulse">● ${esc(T.locate)}</p>`;
  }
  function pulseLegacy2d(id) {
    const groups = Array.from(document.querySelectorAll('#networkSvg .network-node'));
    items().forEach((item, index) => { if (groups[index]) groups[index].dataset.locationId = item.id; });
    groups.forEach(group => group.classList.toggle('location-pulse-red', group.dataset.locationId === id));
  }
  function pulseVisible2d(id) {
    document.querySelectorAll('#networkGeoSvg .geo-node').forEach(group => group.classList.toggle('selected', group.dataset.locationId === id));
  }
  function renderFacts(id, force = false) {
    const box = document.getElementById('networkDetail');
    const item = node(id);
    const fact = facts?.locations?.[id];
    if (!box || !item || !fact) return false;
    activeId = id;
    const key = `${id}:${en() ? 'en' : 'hr'}`;
    let card = box.querySelector('.location-insights');
    if (!card) {
      card = document.createElement('section');
      card.className = 'location-insights';
      box.appendChild(card);
    }
    if (force || renderedKey !== key) {
      card.innerHTML = insightHtml(item, fact);
      renderedKey = key;
    }
    box.dataset.locationId = id;
    pulseLegacy2d(id);
    pulseVisible2d(id);
    refreshClock();
    return true;
  }
  window.GNK_LOCATION_TIME = { zone: id => TIME_ZONES[id] || 'UTC', read: id => localClock(id || activeId) };
  window.GNK_LOCATION_INSIGHTS = {
    select(id) {
      activeId = id || activeId;
      return renderFacts(activeId, true);
    },
    current() { return activeId; },
    refresh() { return renderFacts(activeId, true); }
  };
  function watchDetail() {
    const detail = document.getElementById('networkDetail');
    if (!detail || detailObserverReady) return false;
    detailObserverReady = true;
    new MutationObserver(mutations => {
      const externalChange = mutations.some(mutation => {
        const element = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
        return !element || !element.closest('.location-insights');
      });
      if (externalChange) renderFacts(findIdFromDetail(), false);
    }).observe(detail, { childList:true, subtree:true, characterData:true });
    renderFacts(findIdFromDetail(), true);
    return true;
  }
  async function init() {
    [network, facts] = await Promise.all([get('data/group_network.json'), get('data/group_location_facts.json')]);
    if (!network || !facts) return;
    let attempts = 0;
    const timer = setInterval(() => { if (watchDetail() || ++attempts > 150) clearInterval(timer); }, 70);
    if (!clockTimer) clockTimer = setInterval(refreshClock, 1000);
    document.addEventListener('gnk-location-selected', event => {
      const id = event.detail?.id;
      if (id && node(id)) renderFacts(id, true);
    });
    window.addEventListener('gnk-language-change', () => renderFacts(activeId, true));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
