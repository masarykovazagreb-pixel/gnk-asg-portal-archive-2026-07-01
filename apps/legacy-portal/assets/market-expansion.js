(() => {
  'use strict';
  let stocks = null;
  let asg = null;
  const isEnglish = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const selectedCurrency = () => document.getElementById('currency')?.value || 'eur';
  const t = () => isEnglish() ? {
    eyebrow:'Markets and Reference Assets', title:'Stock Exchange Monitor & ASG Gold Reference', intro:'Official exchange links and public market indicators alongside an informational gold-linked ASG profile.', exchange:'Stock Exchange Monitor', checked:'Latest automated check', croatia:'Croatia', world:'Global market', verify:'Verify at official source →', awaiting:'Open official online display', issuer:'Issuer reference: GNK DINAMO Ltd.', status:'Pre-launch informational display', value:'Indicative ASG reference value', supply:'Proposed reference supply', rule:'Reference rule', legal:'Informational gold-linked value concept. Not a public offer, prospectus, crypto-asset white paper, investment advice or confirmation of issuance of a regulated stablecoin.', disclosure:'Stock-market and reference-asset data are informational. Values may be delayed and must be verified at the respective official source.', cardNote:'Gold reference · pre-launch', retained:'Latest available value retained; source temporarily unavailable'
  } : {
    eyebrow:'Tržišta i referentna imovina', title:'Burzovni monitor i ASG Gold Reference', intro:'Službene burzovne poveznice i javni tržišni pokazatelji uz informativni ASG profil vezan uz vrijednost zlata.', exchange:'Burzovni monitor', checked:'Posljednja automatizirana provjera', croatia:'Hrvatska', world:'Globalno tržište', verify:'Provjeri službeni izvor →', awaiting:'Otvori službeni online prikaz', issuer:'Referentni izdavatelj: GNK DINAMO Ltd.', status:'Pre-launch informativni prikaz', value:'Indikativna referentna vrijednost ASG', supply:'Predviđena referentna količina', rule:'Referentno pravilo', legal:'Informativni koncept vrijednosti vezan uz zlato. Nije javna ponuda, prospekt, bijela knjiga kriptoimovine, investicijski savjet niti potvrda izdavanja reguliranog stablecoina.', disclosure:'Burzovni i referentni tržišni podatci prikazuju se informativno. Vrijednosti mogu biti odgođene te se provjeravaju na službenom izvoru.', cardNote:'Referenca na zlato · pre-launch', retained:'Zadržana posljednja dostupna vrijednost; izvor je privremeno nedostupan'
  };
  const money = (value, code) => value == null ? '—' : new Intl.NumberFormat(isEnglish() ? 'en-US' : 'hr-HR', {style:'currency', currency:code.toUpperCase(), maximumFractionDigits:2}).format(Number(value));
  const number = value => value == null ? '—' : new Intl.NumberFormat(isEnglish() ? 'en-US' : 'hr-HR', {maximumFractionDigits:2}).format(Number(value));
  const change = value => value == null ? '' : `<span class="exchange-change ${Number(value) >= 0 ? 'up' : 'down'}">${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}% / 30 d</span>`;
  function asgValue(code) {
    if (!asg) return null;
    if (code === 'usd') return asg.current_value_usd;
    if (code === 'eur') return asg.current_value_eur;
    return asg.current_value_eur;
  }
  function marketCard(item) {
    const c = t();
    const hrvatska = item.id === 'crobex' || item.id === 'crobex10';
    const retained = item.status === 'public_market_feed_stale';
    const delay = retained ? c.retained : (isEnglish() ? item.delay_en : item.delay_hr);
    const value = item.value == null ? `<div class="exchange-value pending">${c.awaiting}</div>` : `<div class="exchange-value">${number(item.value)}</div>${change(item.change_percent)}`;
    return `<article class="exchange-card ${hrvatska ? 'hr' : 'world'}"><small>${hrvatska ? c.croatia : c.world} · ${item.exchange}</small><h4>${item.name}</h4>${value}<p class="exchange-delay">${delay}</p><a href="${item.official_url}" target="_blank" rel="noopener nofollow">${c.verify}</a></article>`;
  }
  function injectAsgCard() {
    const grid = document.getElementById('coinGrid');
    if (!grid || !asg) return;
    grid.querySelector('.asg-market-card')?.remove();
    const currency = selectedCurrency();
    const shownCurrency = currency === 'usd' ? 'USD' : 'EUR';
    const changeValue = Number(asg.change_30d_percent || 0);
    const card = document.createElement('article');
    card.className = 'coin asg-market-card';
    card.innerHTML = `<div class="coin-top"><strong>ASG</strong><small>${t().cardNote}</small></div><div class="price">${money(asgValue(currency), shownCurrency)}</div><div class="change ${changeValue >= 0 ? 'positive' : 'negative'}">${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}% / 30 d</div><div class="concept-note">100 ASG = 1 kg ${isEnglish() ? 'gold' : 'zlata'}</div>`;
    grid.prepend(card);
  }
  function render() {
    const target = document.getElementById('marketExpansion');
    if (!target || !stocks || !asg) return;
    const c = t();
    const checkedAt = stocks.checked_at || stocks.updated_at;
    const checked = checkedAt ? new Date(checkedAt).toLocaleString(isEnglish() ? 'en-GB' : 'hr-HR') : '—';
    const assetValue = asg.current_value_eur != null ? money(asg.current_value_eur, 'EUR') : (asg.current_value_usd != null ? money(asg.current_value_usd, 'USD') : '—');
    target.innerHTML = `<div class="market-expansion-head"><div><p class="eyebrow">${c.eyebrow}</p><h3>${c.title}</h3></div><p>${c.intro}</p></div><div class="exchange-layout"><article class="exchange-board"><div class="exchange-board-title"><strong>${c.exchange}</strong><span class="exchange-refresh">${c.checked}: ${checked}</span></div><div class="exchange-grid">${stocks.markets.map(marketCard).join('')}</div></article><aside class="asg-panel"><span class="asg-status">${c.status}</span><div class="asg-coin-wrap"><img class="asg-coin-art" src="assets/asg-gold-coin.svg" alt="ASG Gold Reference Asset"><div><h4>ASG Stable Coin</h4><span class="issuer">${c.issuer}</span></div></div><div class="asg-value"><small>${c.value}</small><strong>${assetValue} / ASG</strong>${asg.change_30d_percent == null ? '' : change(asg.change_30d_percent)}</div><div class="asg-facts"><div class="asg-fact"><small>${c.supply}</small><strong>${number(asg.total_supply)} ASG</strong></div><div class="asg-fact"><small>${c.rule}</small><strong>${isEnglish() ? asg.reference_rule_en : asg.reference_rule_hr}</strong></div></div><p class="asg-legal">${c.legal}</p></aside></div><p class="market-disclosure">${c.disclosure}</p>`;
    injectAsgCard();
  }
  async function load() {
    try {
      const responses = await Promise.all([fetch('data/stock_exchanges.json?v=' + Date.now(), {cache:'no-store'}), fetch('data/asg_gold_asset.json?v=' + Date.now(), {cache:'no-store'})]);
      if (responses[0].ok) stocks = await responses[0].json();
      if (responses[1].ok) asg = await responses[1].json();
      render();
    } catch (error) {}
  }
  function init() {
    const section = document.getElementById('digital-assets');
    if (!section) return;
    let target = document.getElementById('marketExpansion');
    if (!target) {
      target = document.createElement('div');
      target.id = 'marketExpansion';
      target.className = 'market-expansion';
      const container = section.querySelector('.container');
      if (container) container.appendChild(target);
    }
    document.getElementById('currency')?.addEventListener('change', injectAsgCard);
    window.addEventListener('gnk-market-grid-refreshed', injectAsgCard);
    window.addEventListener('gnk-language-change', render);
    load();
    setInterval(load, 300000);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
