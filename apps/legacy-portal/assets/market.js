(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const english = () => window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en';
  const COINS = {bitcoin:'BTC',ethereum:'ETH',solana:'SOL',ripple:'XRP',binancecoin:'BNB',cardano:'ADA',chainlink:'LINK','avalanche-2':'AVAX',tether:'USDT','usd-coin':'USDC',dai:'DAI','euro-coin':'EURC'};
  const FIATS = ['eur','usd','gbp','chf','jpy'];
  let dataset = {coins: []};
  let currency = 'eur';
  let live = false;
  function money(value, code) {
    const number = Number(value || 0);
    const digits = code === 'jpy' ? 0 : (number < 1 ? 5 : 2);
    return new Intl.NumberFormat(english() ? 'en-GB' : 'hr-HR', {style:'currency', currency:code.toUpperCase(), maximumFractionDigits:digits}).format(number);
  }
  function coin(id) { return (dataset.coins || []).find((item) => item.id === id); }
  function notify() {
    window.dispatchEvent(new CustomEvent('gnk-live-market-refresh', {detail:{ok: live, updated_at: dataset.updated_at || null}}));
  }
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
      grid.innerHTML = '<article class="coin"><strong>' + (en ? 'Connecting to market data…' : 'Povezivanje s tržišnim podatcima…') + '</strong></article>';
      return;
    }
    grid.innerHTML = dataset.coins.map((item) => {
      const change = Number(item.changes_24h[currency] || 0);
      return `<article class="coin"><div class="coin-top"><strong>${item.symbol}</strong><small>${item.id}</small></div><div class="price">${money(item.prices[currency], currency)}</div><div class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}% / 24 h</div></article>`;
    }).join('');
    const updated = $('#marketUpdated');
    if (updated && dataset.updated_at) updated.textContent = (en ? 'Updated: ' : 'Ažurirano: ') + new Date(dataset.updated_at).toLocaleString(en ? 'en-GB' : 'hr-HR') + (live ? (en ? ' · live in app' : ' · uživo u aplikaciji') : (en ? ' · published data' : ' · objavljeni podatci'));
    const ticker = $('#ticker');
    if (ticker) {
      const tape = dataset.coins.slice(0, 5).map((item) => {
        const change = Number(item.changes_24h[currency] || 0);
        return `<span><b>${item.symbol}</b> ${money(item.prices[currency], currency)} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>`;
      }).join('');
      ticker.innerHTML = tape + '<span><b>GNK ASG</b> DIGITAL ASSETS MONITOR · ' + (live ? (en ? 'LIVE APP REFRESH' : 'OSVJEŽAVANJE UŽIVO') : (en ? 'INFORMATIONAL DISPLAY' : 'INFORMATIVNI PRIKAZ')) + '</span>' + tape;
    }
    convert();
  }
  async function stored() {
    try {
      const response = await fetch('/data/market.json?v=' + Date.now(), {cache:'no-store'});
      if (response.ok) dataset = await response.json();
    } catch (_) {}
  }
  async function directLive() {
    try {
      const params = new URLSearchParams({ids:Object.keys(COINS).join(','), vs_currencies:FIATS.join(','), include_24hr_change:'true', include_last_updated_at:'true'});
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?' + params.toString(), {cache:'no-store'});
      if (!response.ok) throw new Error('source unavailable');
      const raw = await response.json();
      const coins = Object.entries(COINS).filter(([id]) => raw[id]).map(([id, symbol]) => ({id, symbol, prices:Object.fromEntries(FIATS.map((c) => [c, raw[id][c]])), changes_24h:Object.fromEntries(FIATS.map((c) => [c, raw[id][c + '_24h_change']]))}));
      if (!coins.length) throw new Error('empty feed');
      dataset = {updated_at:new Date().toISOString(), source:'CoinGecko public market data', status:'ok', coins};
      live = true;
    } catch (_) { live = false; }
    notify();
  }
  async function refresh() { await stored(); await directLive(); render(); }
  function init() {
    $('#currency')?.addEventListener('change', (event) => { currency = event.target.value; render(); });
    $('#convertAmount')?.addEventListener('input', convert);
    $('#convertCoin')?.addEventListener('change', convert);
    window.addEventListener('gnk-language-change', render);
    refresh();
    window.setInterval(refresh, 300000);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
