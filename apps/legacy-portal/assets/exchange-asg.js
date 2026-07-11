(() => {
  'use strict';
  const OUNCES_PER_KG = 32.1507465686;
  let asg = null;
  let exchange = null;
  let macro = null;
  const english = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const text = (hr, en) => english() ? en : hr;
  const number = (value, digits = 2) => new Intl.NumberFormat(english() ? 'en-US' : 'hr-HR', {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(Number(value || 0));
  const usd = value => new Intl.NumberFormat(english() ? 'en-US' : 'hr-HR', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(Number(value || 0));
  const pct = value => value == null ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function goldValues() {
    const priceOz = Number(macro?.assets?.gold?.current || 0);
    const goldKg = priceOz * OUNCES_PER_KG;
    const asgUnit = goldKg / Number(asg?.ratio?.asg_units || 100);
    const referenceTotal = asgUnit * Number(asg?.reference_supply || 0);
    return { priceOz, goldKg, asgUnit, referenceTotal, change: macro?.assets?.gold?.change_30d_percent ?? null };
  }
  function ensureTarget() {
    const holder = document.querySelector('#digital-assets .container');
    if (!holder) return null;
    let target = document.getElementById('exchangeAsgModule');
    if (!target) {
      target = document.createElement('div');
      target.id = 'exchangeAsgModule';
      target.className = 'exchange-asg-layout';
      const macroPanel = holder.querySelector('.macro-dashboard');
      if (macroPanel) macroPanel.insertAdjacentElement('afterend', target);
      else holder.appendChild(target);
    }
    return target;
  }
  function marketCard(item) {
    const status = item.value == null ? text('Službeni online izvor', 'Official online source') : number(item.value, 2);
    const change = item.change_percent == null ? '' : `<span class="exchange-change ${Number(item.change_percent) >= 0 ? 'up' : 'down'}">${pct(item.change_percent)}</span>`;
    return `<article class="exchange-card"><div class="market-source"><span>${esc(item.exchange)}</span><span>${esc(english() ? item.region_en : item.region_hr)}</span></div><h4>${esc(item.name)}</h4><span class="ticker">${esc(item.symbol)}</span><div class="exchange-value ${item.value == null ? 'placeholder' : ''}">${esc(status)}</div>${change}<span class="exchange-delay">${esc(english() ? item.delay_en : item.delay_hr)}</span><a href="${esc(item.official_url)}" target="_blank" rel="noopener nofollow">${text('Provjeri izvor →','Verify source →')}</a></article>`;
  }
  function renderExchange() {
    const panel = document.getElementById('exchangePanel');
    if (!panel || !exchange) return;
    panel.innerHTML = `<div class="exchange-head"><div><span class="exchange-label">${text('BURZOVNI MONITOR','STOCK EXCHANGE MONITOR')}</span><h3>${text('Hrvatska i svjetska tržišta','Croatian and global markets')}</h3><p>${text('Zagrebačka burza te referentni indeksi dvaju vodećih američkih tržišta.','Zagreb Stock Exchange and reference indices of two leading US markets.')}</p></div><span class="exchange-refresh">${text('Brza provjera · 5 min','Fast check · 5 min')}</span></div><div class="exchange-grid">${(exchange.markets || []).map(marketCard).join('')}</div><p class="exchange-disclaimer">${esc(english() ? exchange.disclaimer_en : exchange.disclaimer_hr)}</p>`;
  }
  function renderAsg() {
    const panel = document.getElementById('asgPanel');
    if (!panel || !asg) return;
    const v = goldValues();
    panel.innerHTML = `<div class="asg-visual"><img src="assets/asg-coin-visual.svg" alt="ASG Gold Reference"></div><div class="asg-content"><span class="asg-label">GOLD-LINKED DIGITAL ASSET</span><h3>ASG Stable Coin</h3><p class="asg-subtitle">${esc(english() ? asg.issuer_en : asg.issuer_hr)}</p><div class="asg-state-wrap"><span class="asg-state">${esc(english() ? asg.classification_en : asg.classification_hr)}</span></div><div class="asg-metrics"><div class="asg-metric highlight"><small>${text('Indikativna vrijednost 1 ASG','Indicative value 1 ASG')}</small><strong>${v.asgUnit ? usd(v.asgUnit) : '—'}</strong></div><div class="asg-metric"><small>${text('Kretanje prema zlatu · 30d','Gold-linked change · 30d')}</small><strong>${pct(v.change)}</strong></div><div class="asg-metric"><small>${text('Referentna količina','Reference quantity')}</small><strong>${number(asg.reference_supply, 0)} ASG</strong></div><div class="asg-metric"><small>${text('Indikativna ukupna vrijednost','Indicative total value')}</small><strong>${v.referenceTotal ? usd(v.referenceTotal) : '—'}</strong></div></div><div class="asg-formula"><strong>100 ASG = 1 kg ${text('zlata','gold')}</strong><br>${text('1 ASG predstavlja referencu na 10 g zlata. Vrijednost se automatski mijenja prema prikazanoj cijeni zlata.','1 ASG represents a reference to 10 g of gold. Value changes automatically with the displayed gold price.')}</div><p class="asg-disclaimer">${esc(english() ? asg.disclaimer_en : asg.disclaimer_hr)}</p></div>`;
  }
  function injectAsgCoinCard() {
    if (!asg || !macro?.assets?.gold) return;
    const grid = document.getElementById('coinGrid');
    if (!grid || grid.querySelector('.asg-market-card')) return;
    const v = goldValues();
    const card = document.createElement('article');
    card.className = 'coin asg-market-card';
    card.innerHTML = `<div class="coin-top"><strong>ASG</strong><small>gold-linked</small></div><div class="price">${usd(v.asgUnit)}</div><div class="change ${Number(v.change || 0) >= 0 ? 'positive' : 'negative'}">${pct(v.change)} / 30 d</div><div class="concept-note">${text('Konceptualni referentni prikaz','Conceptual reference display')}</div>`;
    grid.prepend(card);
  }
  function render() {
    const target = ensureTarget();
    if (!target) return;
    if (!target.innerHTML) target.innerHTML = '<section class="exchange-panel" id="exchangePanel"></section><aside class="asg-panel" id="asgPanel"></aside>';
    renderExchange();
    renderAsg();
    setTimeout(injectAsgCoinCard, 250);
  }
  async function load() {
    try {
      const responses = await Promise.all([
        fetch('data/asg_reference.json?v=' + Date.now(), {cache:'no-store'}),
        fetch('data/stock_exchanges.json?v=' + Date.now(), {cache:'no-store'}),
        fetch('data/macro_market.json?v=' + Date.now(), {cache:'no-store'})
      ]);
      if (responses[0].ok) asg = await responses[0].json();
      if (responses[1].ok) exchange = await responses[1].json();
      if (responses[2].ok) macro = await responses[2].json();
      render();
    } catch (error) {}
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', load) : load();
  window.addEventListener('gnk-language-change', render);
  window.setInterval(load, 300000);
})();
