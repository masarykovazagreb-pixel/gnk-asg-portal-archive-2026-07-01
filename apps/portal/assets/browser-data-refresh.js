(() => {
  'use strict';
  const FRESH_MS = 180 * 60 * 1000;
  const isEnglish = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const freshUrl = path => path + (path.includes('?') ? '&' : '?') + '_browser_refresh=' + Date.now();

  async function read(path) {
    try {
      const response = await fetch(freshUrl(path), { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch (_) { return null; }
  }

  function dateLabel(value) {
    return value ? new Date(value).toLocaleString(isEnglish() ? 'en-GB' : 'hr-HR') : '—';
  }

  function cleanTechnicalText(value) {
    return String(value || '')
      .replace(/\s*·\s*zatražena provjera preglednikom/gi, '')
      .replace(/\s*·\s*browser recheck requested/gi, '')
      .replace(/\s*·\s*browser refresh/gi, '')
      .replace(/\s*·\s*BTC dopunjen uživo/gi, '')
      .replace(/\s*·\s*BTC completed live/gi, '')
      .replace(/\s*·\s*\d+\s+izvor(?:a)?\s+privremeno\s+nedostup(?:an|na|no|ni).*$/i, '')
      .replace(/\s*·\s*\d+\s+source(?:s)?\s+temporarily\s+unavailable.*$/i, '')
      .trim();
  }

  function patchMacroStamp(data) {
    const node = document.getElementById('macroUpdated');
    if (!node || !data) return;
    const updated = data.updated_at || data.checked_at;
    if (updated) node.textContent = cleanTechnicalText((isEnglish() ? 'Updated ' : 'Ažurirano ') + dateLabel(updated));
  }

  function patchExchangeStamp(data) {
    const node = document.querySelector('.exchange-refresh');
    if (!node || !data) return;
    const updated = data.checked_at || data.updated_at;
    if (updated) node.textContent = cleanTechnicalText((isEnglish() ? 'Latest automated check: ' : 'Posljednja automatizirana provjera: ') + dateLabel(updated));
  }

  function patchDigitalAssetsStamp(data) {
    const node = document.getElementById('marketUpdated');
    if (!node || !data) return;
    const updated = data.updated_at || data.checked_at;
    if (updated) node.textContent = cleanTechnicalText((isEnglish() ? 'Updated: ' : 'Ažurirano: ') + dateLabel(updated));
  }

  function cleanExistingPublicLabels() {
    ['macroUpdated', 'marketUpdated', 'newsBadge', 'automationBadge'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.textContent = cleanTechnicalText(node.textContent);
    });
    document.querySelectorAll('.exchange-refresh, .live-badge, .ticker-note').forEach(node => {
      node.textContent = cleanTechnicalText(node.textContent);
      if (/Poslovne vijesti:\s*\d+\s+stavki|Business News:\s*\d+\s+items/i.test(node.textContent)) {
        node.classList.remove('warning', 'waiting');
        node.classList.add('ok');
      }
    });
  }

  async function refreshPublicMarketData() {
    const [macro, stocks, market] = await Promise.all([
      read('/data/macro_market.json'),
      read('/data/stock_exchanges.json'),
      read('/data/market.json')
    ]);
    patchMacroStamp(macro);
    patchExchangeStamp(stocks);
    patchDigitalAssetsStamp(market);
    cleanExistingPublicLabels();
    window.dispatchEvent(new CustomEvent('gnk-browser-public-data-refreshed', { detail: {
      requested_at: new Date().toISOString(),
      macro_updated_at: macro && (macro.updated_at || macro.checked_at),
      stock_checked_at: stocks && (stocks.checked_at || stocks.updated_at),
      market_updated_at: market && (market.updated_at || market.checked_at)
    }}));
  }

  function schedule() {
    refreshPublicMarketData();
    setInterval(refreshPublicMarketData, 60000);
    setInterval(cleanExistingPublicLabels, 1500);
  }

  window.addEventListener('pageshow', refreshPublicMarketData);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPublicMarketData(); });
  window.addEventListener('gnk-language-change', refreshPublicMarketData);
  window.addEventListener('gnk-public-data-refresh', refreshPublicMarketData);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', schedule) : schedule();
})();