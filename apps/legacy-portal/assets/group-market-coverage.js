(() => {
  'use strict';
  if (window.GNK_GROUP_MARKET_COVERAGE_READY) return;
  window.GNK_GROUP_MARKET_COVERAGE_READY = true;

  const state = { network: null, facts: null };
  const isEnglish = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

  const copy = () => isEnglish() ? {
    eyebrow: 'DIRECT MARKET COVERAGE',
    title: 'Geographic and population reach',
    intro: 'Summed reach of distinct cities and country-level markets represented by group positions.',
    current: 'Current network',
    expanded: 'After planned 2026 expansion',
    positions: 'Positions',
    cities: 'Distinct cities',
    markets: 'Countries / markets',
    continents: 'Continents',
    cityPopulation: 'Urban population covered',
    marketPopulation: 'Country-market population covered',
    cityNote: 'Unique city populations only',
    marketNote: 'Unique country / market populations only',
    currentTag: '33 existing',
    expandedTag: '33 + 12 planned = 45',
    basis: 'Indicative demographic reach; city and market populations are counted once even where several group positions refer to the same city or market.',
    sources: 'Population basis: World Bank and UN DESA World Urbanization Prospects 2025.'
  } : {
    eyebrow: 'DIREKTNI TRŽIŠNI OBUHVAT',
    title: 'Geografski i populacijski doseg',
    intro: 'Zbrojeni doseg jedinstvenih gradova i tržišta po državama na kojima se prikazuju pozicije grupe.',
    current: 'Postojeća mreža',
    expanded: 'Nakon planiranog širenja 2026.',
    positions: 'Pozicije',
    cities: 'Jedinstveni gradovi',
    markets: 'Države / tržišta',
    continents: 'Kontinenti',
    cityPopulation: 'Obuhvat stanovništva gradova',
    marketPopulation: 'Obuhvat stanovništva tržišta',
    cityNote: 'Jedinstveni gradovi, bez višestrukog zbrajanja',
    marketNote: 'Jedinstvene države/tržišta, bez višestrukog zbrajanja',
    currentTag: '33 postojeće',
    expandedTag: '33 + 12 planiranih = 45',
    basis: 'Orijentacijski demografski doseg; grad ili država/tržište pribrajaju se samo jednom i kada postoji više pozicija grupe u istoj lokaciji.',
    sources: 'Populacijska osnova: World Bank i UN DESA World Urbanization Prospects 2025.'
  };

  function parsePopulation(value) {
    const normalized = String(value || '').toLowerCase().replace('oko', '').trim().replace(/\./g, '').replace(',', '.');
    const amount = Number.parseFloat(normalized);
    if (!Number.isFinite(amount)) return 0;
    if (normalized.includes('mlrd')) return amount * 1000000000;
    if (normalized.includes('mil')) return amount * 1000000;
    if (normalized.includes('tis')) return amount * 1000;
    return amount;
  }

  function formatPopulation(value) {
    const locale = isEnglish() ? 'en-GB' : 'hr-HR';
    if (value >= 1000000000) return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value / 1000000000) + (isEnglish() ? ' bn' : ' mlrd.');
    if (value >= 1000000) return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1000000) + (isEnglish() ? ' m' : ' mil.');
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }

  function statusById() {
    const statuses = new Map();
    if (!state.network) return statuses;
    if (state.network.center) statuses.set(state.network.center.id, 'active');
    (state.network.nodes || []).forEach(node => statuses.set(node.id, node.status || 'active'));
    return statuses;
  }

  function calculate(includePlanned) {
    const locations = state.facts && state.facts.locations ? state.facts.locations : {};
    const statuses = statusById();
    const included = Object.keys(locations).filter(id => includePlanned || statuses.get(id) !== 'planned');
    const cityMap = new Map();
    const marketMap = new Map();
    const continents = new Set();
    included.forEach(id => {
      const item = locations[id];
      const country = isEnglish() ? item.country_en : item.country_hr;
      const continent = isEnglish() ? item.continent_en : item.continent_hr;
      const cityKey = item.city + '|' + item.country_en;
      const marketKey = item.country_en;
      if (!cityMap.has(cityKey)) cityMap.set(cityKey, parsePopulation(item.city_population));
      if (!marketMap.has(marketKey)) marketMap.set(marketKey, parsePopulation(item.country_population));
      if (continent) continents.add(continent);
    });
    return {
      positions: included.length,
      cities: cityMap.size,
      markets: marketMap.size,
      continents: continents.size,
      cityPopulation: Array.from(cityMap.values()).reduce((sum, value) => sum + value, 0),
      marketPopulation: Array.from(marketMap.values()).reduce((sum, value) => sum + value, 0)
    };
  }

  function metric(label, value, note, emphasis) {
    return `<div class="coverage-metric${emphasis ? ' emphasis' : ''}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>${note ? `<span>${escapeHtml(note)}</span>` : ''}</div>`;
  }

  function card(title, tag, values, planned) {
    const t = copy();
    return `<article class="coverage-card${planned ? ' planned' : ''}"><header><div><small>${escapeHtml(tag)}</small><h5>${escapeHtml(title)}</h5></div><strong>${values.positions}</strong></header><div class="coverage-mini-grid">${metric(t.cities, String(values.cities))}${metric(t.markets, String(values.markets))}${metric(t.continents, String(values.continents))}</div><div class="coverage-population">${metric(t.cityPopulation, formatPopulation(values.cityPopulation), t.cityNote, true)}${metric(t.marketPopulation, formatPopulation(values.marketPopulation), t.marketNote, true)}</div></article>`;
  }

  function render() {
    const panel = document.getElementById('networkOverviewVisual');
    const kpis = panel && panel.querySelector('.network-overview-kpis');
    if (!panel || !kpis || !state.network || !state.facts) return false;
    let block = document.getElementById('networkMarketCoverage');
    if (!block) {
      block = document.createElement('section');
      block.id = 'networkMarketCoverage';
      block.className = 'network-market-coverage';
      kpis.insertAdjacentElement('afterend', block);
    }
    const t = copy();
    const current = calculate(false);
    const expanded = calculate(true);
    block.innerHTML = `<header class="coverage-head"><div><small>${escapeHtml(t.eyebrow)}</small><h4>${escapeHtml(t.title)}</h4><p>${escapeHtml(t.intro)}</p></div></header><div class="coverage-compare">${card(t.current, t.currentTag, current, false)}${card(t.expanded, t.expandedTag, expanded, true)}</div><p class="coverage-basis">${escapeHtml(t.basis)} <span>${escapeHtml(t.sources)}</span></p>`;
    return true;
  }

  async function init() {
    try {
      const results = await Promise.all([
        fetch('/data/group_network.json?v=' + Date.now(), { cache: 'no-store' }).then(response => response.json()),
        fetch('/data/group_location_facts.json?v=' + Date.now(), { cache: 'no-store' }).then(response => response.json())
      ]);
      state.network = results[0];
      state.facts = results[1];
    } catch (_) { return; }
    let attempts = 0;
    const timer = window.setInterval(() => { if (render() || ++attempts > 100) window.clearInterval(timer); }, 80);
    document.addEventListener('gnk-overview-mounted', render);
    window.addEventListener('gnk-language-change', render);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();