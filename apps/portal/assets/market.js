(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const english = () => window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en';
  let dataset = {coins: []};
  let currency = 'eur';
  let live = false;
  let refreshing = false;
  function money(value, code) {
    const number = Number(value || 0);
    const digits = code === 'jpy' ? 0 : (number < 1 ? 5 : 2);
    return new Intl.NumberFormat(english() ? 'en-GB' : 'hr-HR', {style:'currency', currency:code.toUpperCase(), maximumFractionDigits:digits}).format(number);
  }
  function coin(id) { return (dataset.coins || []).find((item) => item.id === id); }
  function notify() { window.dispatchEvent(new CustomEvent('gnk-live-market-refresh', {detail:{ok: live, updated_at: dataset.updated_at || null, stale:dataset.stale===true}})); }
  function convert() {
    const output = $('#convertResult');
    const selected = coin($('#convertCoin')?.value);
    if (!output || !selected) return;
    output.textContent = money(Number($('#convertAmount')?.value || 0) * Number(selected.prices[currency] || 0), currency);
  }
  function render() {
    const en = english();
    const grid = $('#coinGrid');
    if (!grid) return;
    if (!(dataset.coins || []).length) {
      grid.innerHTML = '<article class="coin"><strong>' + (en ? 'Market data are temporarily unavailable.' : 'Tržišni podatci trenutačno nisu dostupni.') + '</strong></article>';
      const updated = $('#marketUpdated');
      if (updated) updated.textContent = en ? 'Refresh pending…' : 'Osvježavanje u tijeku…';
      return;
    }
    grid.innerHTML = dataset.coins.map((item) => {
      const change = Number(item.changes_24h?.[currency] || 0);
      return `<article class="coin"><div class="coin-top"><strong>${item.symbol}</strong><small>${item.id}</small></div><div class="price">${money(item.prices?.[currency], currency)}</div><div class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}% / 24 h</div></article>`;
    }).join('');
    const updated = $('#marketUpdated');
    if (updated && dataset.updated_at) {
      const stale = dataset.stale === true;
      const state = live ? (en ? ' · live source' : ' · izvor uživo') : stale ? (en ? ' · stale fallback snapshot' : ' · zastarjeli rezervni presjek') : (en ? ' · latest published snapshot' : ' · zadnji objavljeni presjek');
      updated.textContent = (en ? 'Updated: ' : 'Ažurirano: ') + new Date(dataset.updated_at).toLocaleString(en ? 'en-GB' : 'hr-HR') + state;
      updated.classList.toggle('negative', stale);
    }
    const ticker = $('#ticker');
    if (ticker) {
      const tape = dataset.coins.slice(0, 5).map((item) => {
        const change = Number(item.changes_24h?.[currency] || 0);
        return `<span><b>${item.symbol}</b> ${money(item.prices?.[currency], currency)} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>`;
      }).join('');
      const state = live ? (en ? 'LIVE SAME-ORIGIN REFRESH' : 'OSVJEŽAVANJE UŽIVO PREKO PORTALA') : dataset.stale === true ? (en ? 'STALE FALLBACK DATA' : 'ZASTARJELI REZERVNI PODATCI') : (en ? 'PUBLISHED FALLBACK DATA' : 'OBJAVLJENI REZERVNI PODATCI');
      ticker.innerHTML = tape + '<span><b>GNK ASG</b> DIGITAL ASSETS MONITOR · ' + state + '</span>' + tape;
    }
    convert();
  }
  async function sameOrigin() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/public-market?v=' + Date.now(), {cache:'no-store', headers:{accept:'application/json'}, signal:controller.signal});
      if (!response.ok) throw new Error('market endpoint unavailable');
      const data = await response.json();
      if (!Array.isArray(data?.coins) || !data.coins.length) throw new Error('empty market endpoint');
      dataset = data;
      live = data.status === 'ok' && data.stale !== true;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function stored() {
    try {
      const response = await fetch('/data/market.json?v=' + Date.now(), {cache:'no-store'});
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data?.coins) || !data.coins.length) return false;
      const timestamp = Date.parse(String(data?.updated_at || ''));
      const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Infinity;
      dataset = {...data, status:'fallback', stale:age > 86400000, age_seconds:Number.isFinite(age)?Math.max(0,Math.floor(age/1000)):null};
      live = false;
      return true;
    } catch (_) { return false; }
  }
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const hasStored = await stored();
      if (hasStored) { render(); notify(); }
      try {
        await sameOrigin();
        render();
        notify();
      } catch (_) {
        if (!hasStored) { dataset = {coins:[], stale:true}; live = false; render(); notify(); }
      }
    } finally {
      refreshing = false;
    }
  }
  function init() {
    $('#currency')?.addEventListener('change', (event) => { currency = event.target.value; render(); });
    $('#convertAmount')?.addEventListener('input', convert);
    $('#convertCoin')?.addEventListener('change', convert);
    window.addEventListener('gnk-language-change', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('online', refresh);
    refresh();
    window.setInterval(refresh, 120000);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();