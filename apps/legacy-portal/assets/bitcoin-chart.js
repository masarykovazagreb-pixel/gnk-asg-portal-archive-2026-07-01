(() => {
  'use strict';
  const marketSection = document.querySelector('#digital-assets .container');
  if (!marketSection) return;
  const META = {
    btc: {hr:'Bitcoin', en:'Bitcoin', ticker:'BTC', line:'#2c83f3', css:'btc', unit:'USD / BTC'},
    gold: {hr:'Zlato', en:'Gold', ticker:'XAU', line:'#d4af37', css:'gold'},
    oil: {hr:'Brent nafta', en:'Brent Oil', ticker:'BRENT', line:'#2ebd85', css:'oil'},
    usd: {hr:'USD / EUR', en:'USD / EUR', ticker:'USD', line:'#afb7c4', css:'usd'}
  };
  const I18N = {
    hr: {aria:'Bitcoin, zlato, nafta i američki dolar - usporedni tržišni prikaz', title:'Bitcoin · zlato · Brent nafta · USD/EUR', intro:'Statistički odnos kretanja cijena, prikazan na zajedničkoj indeksiranoj osnovici.', updating:'Ažuriranje…', indexed:'Relativna promjena', btc:'Bitcoin cijena', chart:'Usporedni grafikon Bitcoina, zlata, nafte i američkog dolara', foot:'Podatci su indikativni i mogu biti vremenski odgođeni. Korelacija prikazuje zajednički smjer dnevnih promjena u promatranom razdoblju, ali ne dokazuje uzročnost niti predstavlja investicijski savjet.', updated:'Ažurirano ', liveBtc:' · BTC dopunjen uživo', start:'Početak = 100', today:'Danas', btcPrice:'BTC cijena USD', correlation:{btc_gold:'BTC / zlato',btc_oil:'BTC / Brent nafta',btc_usd:'BTC / USD'}, noData:'nema dovoljno podataka', weak:'slaba povezanost', positive:'pozitivna povezanost', inverse:'suprotan smjer'},
    en: {aria:'Bitcoin, gold, oil and US dollar - comparative market display', title:'Bitcoin · Gold · Brent Oil · USD/EUR', intro:'Statistical relationship of price movements displayed on a common indexed baseline.', updating:'Updating…', indexed:'Relative change', btc:'Bitcoin price', chart:'Comparative chart of Bitcoin, gold, oil and the US dollar', foot:'Data are indicative and may be time-delayed. Correlation shows aligned daily direction over the observed period, but does not prove causation or constitute investment advice.', updated:'Updated ', liveBtc:' · BTC completed live', start:'Start = 100', today:'Today', btcPrice:'BTC price USD', correlation:{btc_gold:'BTC / gold',btc_oil:'BTC / Brent Oil',btc_usd:'BTC / USD'}, noData:'insufficient data', weak:'weak relationship', positive:'positive relationship', inverse:'opposite direction'}
  };
  const lang = () => (window.GNK_LANG && window.GNK_LANG.get() === 'en') ? 'en' : 'hr';
  let dataset = null;
  let view = 'indexed';
  let completedBtcLive = false;
  const panel = document.createElement('section');
  panel.className = 'macro-dashboard';
  const toolbar = marketSection.querySelector('.market-toolbar');
  if (toolbar) toolbar.insertAdjacentElement('afterend', panel); else marketSection.appendChild(panel);
  function build() {
    const t = I18N[lang()];
    panel.setAttribute('aria-label', t.aria);
    panel.innerHTML = `<div class="macro-head"><div><span class="btc-label">CROSS-ASSET MARKET MONITOR</span><h3>${t.title}</h3><p>${t.intro}</p></div><span class="macro-period" id="macroUpdated">${t.updating}</span></div><div class="macro-cards" id="macroCards"></div><div class="market-comparison-tabs"><button class="${view === 'indexed' ? 'active' : ''}" data-view="indexed">${t.indexed}</button><button class="${view === 'btc' ? 'active' : ''}" data-view="btc">${t.btc}</button></div><div class="macro-chart-box"><canvas id="macroChart" role="img" aria-label="${t.chart}"></canvas><div class="macro-legend" id="macroLegend"></div></div><div class="macro-analysis" id="macroCorrelations"></div><p class="macro-foot">${t.foot}</p>`;
    panel.querySelectorAll('.market-comparison-tabs button').forEach(button => button.onclick = () => { view = button.dataset.view; build(); renderAll(); });
  }
  const format = (value, key) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const currency = key === 'usd' ? 'EUR' : 'USD';
    const fraction = key === 'usd' ? 4 : key === 'btc' ? 0 : 2;
    return new Intl.NumberFormat(lang() === 'en' ? 'en-US' : 'hr-HR', {style:'currency', currency, maximumFractionDigits:fraction}).format(Number(value));
  };
  const pct = value => value == null ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  const validPoints = asset => Boolean(asset && Array.isArray(asset.points) && asset.points.length > 1);
  const normalise = points => {
    if (!points || !points.length || !Number(points[0][1])) return [];
    const first = Number(points[0][1]);
    return points.map(point => [point[0], Math.round((Number(point[1]) / first) * 10000) / 100]);
  };
  const dailyReturns = points => points.slice(1).map((row, index) => Number(points[index][1]) ? Number(row[1]) / Number(points[index][1]) - 1 : null).filter(value => value != null && Number.isFinite(value));
  function correlation(left, right) {
    const count = Math.min(left.length, right.length);
    if (count < 3) return null;
    const a = left.slice(-count), b = right.slice(-count);
    const avgA = a.reduce((sum, value) => sum + value, 0) / count;
    const avgB = b.reduce((sum, value) => sum + value, 0) / count;
    const numerator = a.reduce((sum, value, index) => sum + (value - avgA) * (b[index] - avgB), 0);
    const varianceA = a.reduce((sum, value) => sum + Math.pow(value - avgA, 2), 0);
    const varianceB = b.reduce((sum, value) => sum + Math.pow(value - avgB, 2), 0);
    const denominator = Math.sqrt(varianceA * varianceB);
    return denominator ? Math.round((numerator / denominator) * 1000) / 1000 : null;
  }
  function recomputeCorrelations() {
    if (!dataset || !dataset.assets || !validPoints(dataset.assets.btc)) return;
    const btcReturns = dailyReturns(dataset.assets.btc.points);
    dataset.correlations = dataset.correlations || {};
    ['gold','oil','usd'].forEach(key => {
      dataset.correlations[`btc_${key}`] = validPoints(dataset.assets[key]) ? correlation(btcReturns, dailyReturns(dataset.assets[key].points)) : null;
    });
  }
  async function completeMissingBitcoin() {
    if (!dataset || !dataset.assets || validPoints(dataset.assets.btc)) return;
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30', {cache:'no-store'});
      if (!response.ok) return;
      const raw = await response.json();
      const byDay = new Map();
      (raw.prices || []).forEach(row => {
        if (!Array.isArray(row) || row.length < 2 || !Number.isFinite(Number(row[1]))) return;
        const day = new Date(Number(row[0])).toISOString().slice(0, 10);
        byDay.set(day, [Number(row[0]), Number(row[1])]);
      });
      const points = Array.from(byDay.values()).slice(-31);
      if (points.length < 3) return;
      const values = points.map(point => point[1]);
      const first = values[0], last = values[values.length - 1];
      const last7 = values.length > 8 ? values[values.length - 8] : first;
      dataset.assets.btc = {symbol:'BTC-USD', label:'Bitcoin', ticker:'BTC', unit:META.btc.unit, source:'CoinGecko public market data · browser fallback', current:last, change_7d_percent:Math.round(((last / last7) - 1) * 10000) / 100, change_30d_percent:Math.round(((last / first) - 1) * 10000) / 100, low_30d:Math.min(...values), high_30d:Math.max(...values), points, indexed_points:normalise(points)};
      completedBtcLive = true;
      recomputeCorrelations();
    } catch (_) {}
  }
  function cards() {
    const holder = document.getElementById('macroCards'); if (!holder || !dataset || !dataset.assets) return;
    holder.innerHTML = Object.keys(META).map(key => { const a = dataset.assets[key]; if (!a) return ''; const direction = Number(a.change_30d_percent || 0) >= 0 ? 'up' : 'down'; return `<article class="macro-card"><div class="asset"><span><i class="macro-dot ${META[key].css}"></i>${META[key][lang()]}</span><span>${META[key].ticker}</span></div><strong class="macro-price">${format(a.current,key)}</strong><span class="macro-change ${direction}">${pct(a.change_30d_percent)} / 30d</span><div class="unit">${a.unit || ''}</div></article>`; }).join('');
  }
  function legend(keys) { const target = document.getElementById('macroLegend'); if (target) target.innerHTML = keys.filter(key => dataset && dataset.assets && validPoints(dataset.assets[key])).map(key => `<span><i style="background:${META[key].line}"></i>${META[key][lang()]}</span>`).join(''); }
  function draw(keys) {
    const canvas = document.getElementById('macroChart'); if (!canvas || !dataset || !dataset.assets) return;
    const t = I18N[lang()], rect = canvas.parentElement.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    const width = Math.max(285, Math.floor(rect.width - 18)), height = window.innerWidth < 650 ? 235 : 290;
    canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d'); ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,width,height);
    const pad = {left:42,right:14,top:17,bottom:30};
    const series = keys.map(key => { const asset = dataset.assets[key]; return asset ? {key, points: view === 'btc' ? asset.points : asset.indexed_points} : null; }).filter(s => s && Array.isArray(s.points) && s.points.length);
    if (!series.length) return;
    const vals = series.flatMap(s => s.points.map(p => Number(p[1]))).filter(Number.isFinite), low = Math.min(...vals), high = Math.max(...vals), span = Math.max(high-low, 0.01), maxPoints = Math.max(...series.map(s => s.points.length));
    const x = i => pad.left + (i / Math.max(maxPoints-1,1)) * (width-pad.left-pad.right), y = v => pad.top + (1 - (v-low)/span) * (height-pad.top-pad.bottom);
    ctx.font='11px Arial'; ctx.fillStyle='rgba(214,225,239,.72)'; ctx.strokeStyle='rgba(212,175,55,.16)'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){const val=high-(span*i/3), yy=y(val); ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(width-pad.right,yy);ctx.stroke();ctx.fillText(view==='indexed'?val.toFixed(1):format(val,'btc'),3,yy+4);}
    series.forEach(s => {ctx.beginPath();s.points.forEach((p,i) => {const xx=x(i), yy=y(Number(p[1])); i ? ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.strokeStyle=META[s.key].line;ctx.lineWidth=s.key==='btc'?2.8:2;ctx.stroke();});
    ctx.fillStyle='rgba(214,225,239,.76)';ctx.fillText(view==='indexed'?t.start:t.btcPrice,pad.left,height-9);ctx.fillText(t.today,width-49,height-9); legend(keys);
  }
  function correlations() {
    const target=document.getElementById('macroCorrelations'); if(!target || !dataset) return; const t = I18N[lang()];
    const values = dataset.correlations || {};
    target.innerHTML = Object.keys(t.correlation).map(key => { const value=values[key]; const explanation=value==null?t.noData:Math.abs(value)<0.25?t.weak:value>0?t.positive:t.inverse; return `<div class="correlation"><small>${t.correlation[key]}</small><strong>${value == null ? '—' : Number(value).toFixed(3)}</strong><p>${explanation}</p></div>`; }).join('');
  }
  function renderAll() { if (!dataset || !dataset.assets) return; const t = I18N[lang()]; document.getElementById('macroUpdated').textContent=t.updated + new Date(dataset.updated_at).toLocaleString(lang() === 'en' ? 'en-GB' : 'hr-HR') + (completedBtcLive ? t.liveBtc : ''); cards(); correlations(); draw(view==='btc'?['btc']:['btc','gold','oil','usd']); }
  async function load() {
    try {const response=await fetch('data/macro_market.json?v='+Date.now(),{cache:'no-store'}); if(response.ok) dataset=await response.json();} catch(error) {}
    if (dataset && dataset.assets && !validPoints(dataset.assets.btc)) await completeMissingBitcoin();
    renderAll();
  }
  build(); load();
  window.addEventListener('resize', () => dataset && draw(view==='btc'?['btc']:['btc','gold','oil','usd']));
  window.addEventListener('gnk-language-change', () => {build(); renderAll();});
  setInterval(load,300000);
})();
