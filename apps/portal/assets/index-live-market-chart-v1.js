(() => {
  'use strict';
  if (window.__GNK_ASG_LIVE_MARKET_CHART_V1__) return;
  window.__GNK_ASG_LIVE_MARKET_CHART_V1__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const copy = {
    hr: {
      title: 'Aktivni tržišni grafikon',
      subtitle: 'Stvarni podaci iz GNK ASG tržišnog modula',
      open: 'Otvori tržišta',
      collecting: 'Prikupljanje stvarnih uzoraka kretanja…',
      unavailable: 'Tržišni podaci trenutačno nisu dostupni.',
      updated: 'Ažurirano',
      auto: 'Automatsko osvježavanje svakih 60 sekundi',
      noSeries: 'Grafikon će prikazati kretanje čim pristigne najmanje dva stvarna podatka.'
    },
    en: {
      title: 'Active market chart',
      subtitle: 'Real data from the GNK ASG market module',
      open: 'Open markets',
      collecting: 'Collecting real market samples…',
      unavailable: 'Market data is currently unavailable.',
      updated: 'Updated',
      auto: 'Automatic refresh every 60 seconds',
      noSeries: 'The chart will show movement after at least two real data points are received.'
    }
  }[lang];

  const instruments = {
    bitcoin: {
      label: 'Bitcoin / EUR', assetKey: 'bitcoin', suffix: ' EUR',
      valueKeys: ['price_eur', 'value_eur', 'price', 'value']
    },
    gold: {
      label: lang === 'en' ? 'Gold reference / EUR' : 'Referentno zlato / EUR', assetKey: 'asg_gold_reference', suffix: ' EUR',
      valueKeys: ['value_eur', 'price_eur', 'price', 'value']
    },
    brent: {
      label: 'Brent / USD', assetKey: 'brent', suffix: ' USD',
      valueKeys: ['price_usd', 'price', 'value_usd', 'value']
    },
    usd_eur: {
      label: 'USD / EUR', assetKey: 'usd_eur', suffix: '',
      valueKeys: ['rate', 'price', 'value']
    }
  };

  const numberValue = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const firstNumber = (object, keys) => {
    for (const key of keys) {
      const value = numberValue(object?.[key]);
      if (value !== null) return value;
    }
    return null;
  };

  const safeJson = value => {
    try { return JSON.parse(value); } catch { return null; }
  };

  const loadStored = key => {
    try {
      const value = safeJson(localStorage.getItem(`gnk_asg_market_chart_v1_${key}`) || '[]');
      return Array.isArray(value) ? value.filter(point => Number.isFinite(point?.v) && Number.isFinite(point?.t)).slice(-120) : [];
    } catch { return []; }
  };

  const saveStored = (key, points) => {
    try { localStorage.setItem(`gnk_asg_market_chart_v1_${key}`, JSON.stringify(points.slice(-120))); } catch {}
  };

  const normalizePoint = (item, index) => {
    if (typeof item === 'number') return Number.isFinite(item) ? { t: index, v: item } : null;
    if (!item || typeof item !== 'object') return null;
    const value = firstNumber(item, ['value', 'price', 'price_eur', 'price_usd', 'rate', 'close', 'y']);
    if (value === null) return null;
    const rawTime = item.timestamp ?? item.time ?? item.date ?? item.updatedAt ?? item.x;
    const parsedTime = typeof rawTime === 'number' ? rawTime : Date.parse(rawTime || '');
    return { t: Number.isFinite(parsedTime) ? parsedTime : index, v: value };
  };

  const serverSeries = (payload, key, asset) => {
    const candidates = [
      asset?.history, asset?.series, asset?.sparkline, asset?.prices, asset?.points,
      payload?.history?.[key], payload?.series?.[key], payload?.chart?.[key], payload?.points?.[key]
    ];
    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;
      const points = candidate.map(normalizePoint).filter(Boolean);
      if (points.length > 1) return points.slice(-120);
    }
    return [];
  };

  const realSeries = (payload, key) => {
    const config = instruments[key];
    const asset = payload?.assets?.[config.assetKey] || {};
    const fromServer = serverSeries(payload, key, asset);
    if (fromServer.length > 1) return fromServer;

    const current = firstNumber(asset, config.valueKeys);
    const stored = loadStored(key);
    if (current !== null) {
      const currentTime = Date.parse(asset.updatedAt || asset.timestamp || payload?.updatedAt || payload?.timestamp || '') || Date.now();
      const last = stored[stored.length - 1];
      if (!last || currentTime - last.t >= 45000 || last.v !== current) stored.push({ t: currentTime, v: current });
    }
    const clean = stored.filter(point => Date.now() - point.t < 7 * 86400000).slice(-120);
    saveStored(key, clean);
    return clean;
  };

  const statusOf = (payload, asset) => {
    const raw = String(asset?.status || payload?.status || payload?.marketStatus || '').toUpperCase();
    const allowed = ['LIVE', 'SNAPSHOT', 'DELAYED', 'FALLBACK', 'UNAVAILABLE'];
    if (allowed.includes(raw)) return raw;
    return payload?.ok === false ? 'UNAVAILABLE' : 'SNAPSHOT';
  };

  const formatValue = (value, suffix) => value === null
    ? '—'
    : `${value.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: value < 10 ? 5 : 2 })}${suffix}`;

  const formatTime = value => {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'hr-HR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Zagreb'
    }).format(date);
  };

  function installStyles() {
    if (document.getElementById('gnk-live-market-chart-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'gnk-live-market-chart-style-v1';
    style.textContent = `
      .feature-grid.gnk-market-chart-layout{grid-template-areas:"featured news" "chart news"!important;align-items:stretch!important}
      .feature-grid.gnk-market-chart-layout>.featured{grid-area:featured!important}
      .feature-grid.gnk-market-chart-layout>.news-list{grid-area:news!important}
      #gnk-live-market-chart{grid-area:chart!important;min-width:0;border:1px solid rgba(215,170,60,.34);border-radius:18px;padding:16px 18px 14px;background:radial-gradient(circle at 85% 5%,rgba(43,143,230,.18),transparent 34%),linear-gradient(145deg,#071a31,#030d1a);box-shadow:0 18px 48px rgba(0,0,0,.24);overflow:hidden}
      #gnk-live-market-chart *{box-sizing:border-box}
      .gnk-market-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:10px}
      .gnk-market-chart-head h3{margin:0;color:#f7f9fc;font-size:18px}.gnk-market-chart-head p{margin:4px 0 0;color:#a9b7c9;font-size:11px}
      .gnk-market-status{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid rgba(215,170,60,.32);border-radius:999px;color:#dce6f2;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
      .gnk-market-status i{width:7px;height:7px;border-radius:50%;background:#d7aa3c;box-shadow:0 0 10px #d7aa3c}.gnk-market-status[data-status="LIVE"] i{background:#31d47c;box-shadow:0 0 11px #31d47c}.gnk-market-status[data-status="DELAYED"] i,.gnk-market-status[data-status="FALLBACK"] i{background:#f0b84d;box-shadow:0 0 11px #f0b84d}.gnk-market-status[data-status="UNAVAILABLE"] i{background:#ef6670;box-shadow:0 0 11px #ef6670}
      .gnk-market-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0 12px}.gnk-market-tabs button{padding:7px 10px;border:1px solid rgba(215,170,60,.23);border-radius:999px;background:rgba(255,255,255,.025);color:#dce6f2;font-size:9px;font-weight:900;cursor:pointer}.gnk-market-tabs button.active{border-color:#d7aa3c;background:linear-gradient(135deg,rgba(43,143,230,.22),rgba(215,170,60,.16));color:#ffe08a}
      .gnk-market-metrics{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:7px}.gnk-market-price{display:block;color:#ffe08a;font-size:24px;font-weight:950;line-height:1}.gnk-market-change{display:block;margin-top:5px;font-size:11px;font-weight:900}.gnk-market-change.up{color:#31d47c}.gnk-market-change.down{color:#ef6670}.gnk-market-time{color:#a9b7c9;font-size:9px;text-align:right}
      .gnk-market-canvas-wrap{position:relative;height:210px;border:1px solid rgba(215,170,60,.14);border-radius:13px;background:linear-gradient(180deg,rgba(43,143,230,.07),rgba(2,8,18,.2));overflow:hidden}.gnk-market-canvas-wrap canvas{display:block;width:100%;height:100%}.gnk-market-empty{position:absolute;inset:0;display:grid;place-items:center;padding:20px;color:#a9b7c9;font-size:11px;text-align:center;pointer-events:none}
      .gnk-market-chart-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;color:#8fa1b8;font-size:9px}.gnk-market-chart-foot a{color:#ffe08a;font-weight:900;text-decoration:none;text-transform:uppercase;white-space:nowrap}
      @media(max-width:900px){.feature-grid.gnk-market-chart-layout{grid-template-columns:1fr!important;grid-template-areas:"featured" "chart" "news"!important}.gnk-market-chart-head,.gnk-market-metrics,.gnk-market-chart-foot{align-items:flex-start;flex-direction:column}.gnk-market-time{text-align:left}.gnk-market-canvas-wrap{height:190px}}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    const grid = document.querySelector('.feature-grid');
    const featured = grid?.querySelector('.featured');
    const news = grid?.querySelector('.news-list');
    if (!grid || !featured || !news) return null;
    const existing = document.getElementById('gnk-live-market-chart');
    if (existing) return existing;

    grid.classList.add('gnk-market-chart-layout');
    const panel = document.createElement('article');
    panel.id = 'gnk-live-market-chart';
    panel.innerHTML = `
      <div class="gnk-market-chart-head">
        <div><h3>${copy.title}</h3><p>${copy.subtitle}</p></div>
        <span class="gnk-market-status" data-status="SNAPSHOT"><i></i><span>SNAPSHOT</span></span>
      </div>
      <div class="gnk-market-tabs" role="tablist" aria-label="${copy.title}">
        ${Object.entries(instruments).map(([key,item],index) => `<button type="button" role="tab" data-market-key="${key}" class="${index === 0 ? 'active' : ''}" aria-selected="${index === 0}">${item.label}</button>`).join('')}
      </div>
      <div class="gnk-market-metrics">
        <div><strong class="gnk-market-price">—</strong><span class="gnk-market-change">—</span></div>
        <div class="gnk-market-time">${copy.collecting}</div>
      </div>
      <div class="gnk-market-canvas-wrap"><canvas aria-label="${copy.title}"></canvas><div class="gnk-market-empty">${copy.noSeries}</div></div>
      <div class="gnk-market-chart-foot"><span>${copy.auto}</span><a href="${lang === 'en' ? '/markets/' : '/trzista/'}">${copy.open} →</a></div>`;
    grid.insertBefore(panel, news);
    return panel;
  }

  function drawChart(canvas, points) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 700);
    const height = Math.max(170, rect.height || 210);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { left: 50, right: 16, top: 18, bottom: 25 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const values = points.map(point => point.v);
    if (!values.length) return;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      const delta = Math.abs(min || 1) * 0.01;
      min -= delta;
      max += delta;
    }
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(215,170,60,.12)';
    ctx.fillStyle = 'rgba(169,183,201,.8)';
    ctx.font = '9px Arial';
    for (let row = 0; row < 4; row += 1) {
      const y = pad.top + chartH * row / 3;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      const value = max - (max - min) * row / 3;
      ctx.fillText(value.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: value < 10 ? 4 : 1 }), 4, y + 3);
    }

    const x = index => points.length === 1 ? pad.left + chartW / 2 : pad.left + chartW * index / (points.length - 1);
    const y = value => pad.top + chartH - ((value - min) / (max - min)) * chartH;
    const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    gradient.addColorStop(0, 'rgba(43,143,230,.42)');
    gradient.addColorStop(1, 'rgba(43,143,230,0)');

    if (points.length > 1) {
      ctx.beginPath();
      points.forEach((point,index) => index ? ctx.lineTo(x(index), y(point.v)) : ctx.moveTo(x(index), y(point.v)));
      ctx.lineTo(x(points.length - 1), height - pad.bottom);
      ctx.lineTo(x(0), height - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point,index) => index ? ctx.lineTo(x(index), y(point.v)) : ctx.moveTo(x(index), y(point.v)));
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = 'rgba(215,170,60,.45)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const lastIndex = points.length - 1;
    ctx.beginPath();
    ctx.arc(x(lastIndex), y(points[lastIndex].v), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#31d47c';
    ctx.shadowColor = '#31d47c';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    const firstTime = points[0]?.t > 100000000000 ? formatTime(points[0].t) : '';
    const lastTime = points[lastIndex]?.t > 100000000000 ? formatTime(points[lastIndex].t) : '';
    ctx.fillStyle = 'rgba(169,183,201,.75)';
    ctx.font = '9px Arial';
    if (firstTime) ctx.fillText(firstTime, pad.left, height - 7);
    if (lastTime) {
      const measure = ctx.measureText(lastTime).width;
      ctx.fillText(lastTime, width - pad.right - measure, height - 7);
    }
  }

  function boot() {
    installStyles();
    const panel = createPanel();
    if (!panel) return;

    let activeKey = 'bitcoin';
    let lastPayload = null;
    const canvas = panel.querySelector('canvas');
    const empty = panel.querySelector('.gnk-market-empty');
    const price = panel.querySelector('.gnk-market-price');
    const change = panel.querySelector('.gnk-market-change');
    const time = panel.querySelector('.gnk-market-time');
    const status = panel.querySelector('.gnk-market-status');

    const render = () => {
      if (!lastPayload) return;
      const config = instruments[activeKey];
      const asset = lastPayload?.assets?.[config.assetKey] || {};
      const current = firstNumber(asset, config.valueKeys);
      const points = realSeries(lastPayload, activeKey);
      const first = points[0]?.v;
      const last = points[points.length - 1]?.v;
      const movement = Number.isFinite(first) && Number.isFinite(last) && first !== 0 ? ((last - first) / first) * 100 : null;
      const sourceStatus = statusOf(lastPayload, asset);
      const updatedAt = asset.updatedAt || asset.timestamp || lastPayload.updatedAt || lastPayload.timestamp || Date.now();

      price.textContent = formatValue(current ?? last ?? null, config.suffix);
      change.textContent = movement === null ? '—' : `${movement >= 0 ? '+' : ''}${movement.toLocaleString(lang === 'en' ? 'en-US' : 'hr-HR', { maximumFractionDigits: 2 })}%`;
      change.className = `gnk-market-change ${movement > 0 ? 'up' : movement < 0 ? 'down' : ''}`;
      time.textContent = `${copy.updated}: ${formatTime(updatedAt)}`;
      status.dataset.status = sourceStatus;
      status.querySelector('span').textContent = sourceStatus;
      empty.hidden = points.length > 1;
      empty.textContent = points.length ? copy.noSeries : copy.unavailable;
      drawChart(canvas, points);
    };

    panel.querySelectorAll('[data-market-key]').forEach(button => button.addEventListener('click', () => {
      activeKey = button.dataset.marketKey;
      panel.querySelectorAll('[data-market-key]').forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
      });
      render();
    }));

    const refresh = async () => {
      try {
        const response = await fetch(`/api/market?cb=${Date.now()}`, { cache: 'no-store', headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        lastPayload = await response.json();
        render();
      } catch {
        status.dataset.status = 'UNAVAILABLE';
        status.querySelector('span').textContent = 'UNAVAILABLE';
        time.textContent = copy.unavailable;
        empty.hidden = false;
        empty.textContent = copy.unavailable;
      }
    };

    const resize = new ResizeObserver(() => { if (lastPayload) render(); });
    resize.observe(panel.querySelector('.gnk-market-canvas-wrap'));
    refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('pagehide', () => { clearInterval(timer); resize.disconnect(); }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
