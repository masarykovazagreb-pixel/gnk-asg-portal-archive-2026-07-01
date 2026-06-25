(() => {
  'use strict';
  if (window.__GNK_ASG_LIVE_MARKET_CHART_TRZISTA_V4__) return;
  window.__GNK_ASG_LIVE_MARKET_CHART_TRZISTA_V4__ = true;
  window.__GNK_ASG_LIVE_MARKET_CHART_V3__ = true;
  window.__GNK_ASG_LIVE_MARKET_CHART_V2__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const english = document.documentElement.lang === 'en';
  const labels = english ? {
    title:'Live market movement', source:'Same chart and data as the Markets page', open:'Open markets', loading:'Loading chart from Markets…'
  } : {
    title:'Kretanje tržišta uživo', source:'Isti grafikon i podatci kao na stranici Tržišta', open:'Otvori tržišta', loading:'Učitavanje grafikona sa stranice Tržišta…'
  };

  const REFRESH_MS = 60000;
  let frame = null;
  let timer = null;

  function addStyle() {
    if (document.getElementById('gnk-market-trzista-v4-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-market-trzista-v4-style';
    style.textContent = `
      #gnk-live-market-chart-v3{margin-top:18px;padding-top:16px;border-top:1px solid rgba(215,170,60,.22);min-width:0}
      #gnk-live-market-chart-v3 *{box-sizing:border-box}
      .gnk-market-v4-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .gnk-market-v4-head h4{margin:0;color:#fff;font-size:14px}
      .gnk-market-v4-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid rgba(49,212,124,.32);border-radius:999px;color:#dce6f2;font-size:8px;font-weight:900}
      .gnk-market-v4-badge i{width:7px;height:7px;border-radius:50%;background:#31d47c;box-shadow:0 0 10px #31d47c}
      .gnk-market-v4-frame{position:relative;height:300px;border:1px solid rgba(215,170,60,.16);border-radius:14px;overflow:hidden;background:linear-gradient(180deg,rgba(43,143,230,.08),rgba(2,8,18,.18))}
      .gnk-market-v4-frame iframe{display:block;width:100%;height:100%;border:0;background:transparent}
      .gnk-market-v4-loading{position:absolute;inset:0;display:grid;place-items:center;padding:14px;color:#a9b7c9;font-size:9px;text-align:center;pointer-events:none;background:linear-gradient(180deg,rgba(7,18,38,.92),rgba(2,8,18,.92));transition:opacity .25s ease}
      .gnk-market-v4-frame.is-ready .gnk-market-v4-loading{opacity:0}
      .gnk-market-v4-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;color:#8fa1b8;font-size:8px}
      .gnk-market-v4-foot a{color:#ffe08a;text-decoration:none;font-weight:900}
      @media(max-width:620px){.gnk-market-v4-frame{height:260px}}
    `;
    document.head.appendChild(style);
  }

  function sourceUrl() {
    return `/trzista/?embed=chart&cb=${Date.now()}`;
  }

  function build() {
    const host = document.querySelector('#mreza-grupe .map-card');
    if (!host) return null;

    document.getElementById('gnk-live-market-chart')?.remove();
    document.getElementById('gnk-live-market-chart-v2')?.remove();
    document.getElementById('gnk-live-market-chart-v3')?.remove();

    const panel = document.createElement('section');
    panel.id = 'gnk-live-market-chart-v3';
    panel.innerHTML = `
      <div class="gnk-market-v4-head">
        <h4>${labels.title}</h4>
        <span class="gnk-market-v4-badge"><i></i><span>TRŽIŠTA</span></span>
      </div>
      <div class="gnk-market-v4-frame">
        <iframe title="${labels.title}" src="${sourceUrl()}" loading="eager" referrerpolicy="same-origin"></iframe>
        <div class="gnk-market-v4-loading">${labels.loading}</div>
      </div>
      <div class="gnk-market-v4-foot"><span>${labels.source}</span><a href="/trzista/">${labels.open} →</a></div>`;
    host.appendChild(panel);

    frame = panel.querySelector('iframe');
    frame.addEventListener('load', () => panel.querySelector('.gnk-market-v4-frame')?.classList.add('is-ready'));
    return panel;
  }

  function refreshFrame() {
    if (!frame || !document.documentElement.contains(frame)) return;
    const holder = frame.closest('.gnk-market-v4-frame');
    holder?.classList.remove('is-ready');
    frame.src = sourceUrl();
  }

  function ensure() {
    addStyle();
    if (!document.getElementById('gnk-live-market-chart-v3')) build();
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'GNK_ASG_MARKET_EMBED_READY') return;
    document.querySelector('.gnk-market-v4-frame')?.classList.add('is-ready');
  });

  ensure();
  [100,350,900,1800,3500].forEach(delay => setTimeout(ensure,delay));
  const observer = new MutationObserver(() => {
    if (!document.getElementById('gnk-live-market-chart-v3')) requestAnimationFrame(ensure);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  timer = setInterval(refreshFrame,REFRESH_MS);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) refreshFrame(); });
  window.addEventListener('pagehide',() => { clearInterval(timer); observer.disconnect(); },{once:true});
})();
