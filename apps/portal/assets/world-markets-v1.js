(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const english = () => window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en';
  function fmt(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(english() ? 'en-GB' : 'hr-HR', {maximumFractionDigits: digits, minimumFractionDigits: digits}).format(n);
  }
  function card(item) {
    const change = Number(item.change_pct);
    const hasChange = Number.isFinite(change);
    const digits = Number(item.price) >= 100 ? 2 : 4;
    const label = item.country ? `${item.name} · ${item.country}` : item.name;
    return `<article class="coin"><div class="coin-top"><strong>${item.symbol.replace(/^\^/, '').toUpperCase()}</strong><small>${label}</small></div><div class="price">${fmt(item.price, digits)}</div><div class="change ${hasChange && change >= 0 ? 'positive' : 'negative'}">${hasChange ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '—'}</div></article>`;
  }
  async function render() {
    const grid = $('#worldMarketsGrid');
    if (!grid) return;
    const en = english();
    try {
      const response = await fetch('/api/public-world-markets?v=' + Date.now(), {cache: 'no-store', headers: {accept: 'application/json'}});
      if (!response.ok) throw new Error('world markets endpoint unavailable');
      const data = await response.json();
      const items = [...(data.indices || []), ...(data.commodities || [])];
      if (!items.length) throw new Error('empty world markets payload');
      grid.innerHTML = items.map(card).join('');
    } catch (_) {
      grid.innerHTML = '<article class="coin"><strong>' + (en ? 'World market data are temporarily unavailable.' : 'Podatci o svjetskim tržištima trenutačno nisu dostupni.') + '</strong></article>';
    }
  }
  window.addEventListener('gnk-language-change', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', render) : render();
  window.setInterval(render, 180000);
})();
