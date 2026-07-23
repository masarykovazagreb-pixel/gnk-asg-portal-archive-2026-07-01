(() => {
  'use strict';

  const WIDGET_ID = 'gnk-sticker-tiles';
  if (document.getElementById(WIDGET_ID)) return;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');

  const ALL_ITEMS = [
    { key: 'news', label: isEnglish ? 'Open News' : 'Otvori News', title: 'AKTUAL MEDIA', desc: isEnglish ? 'Live business, world and tech news aggregator, updated hourly.' : 'Uživo agregator poslovnih, svjetskih i tehnoloških vijesti, ažurira se svaki sat.', href: '/gnk-aktual/', bg: '#ff6b6b', fg: '#2a0d0f', selfPath: '/gnk-aktual' },
    { key: 'ideja', label: isEnglish ? 'Open Ideas' : 'Otvori Ideju', title: isEnglish ? 'Ideas in Action' : 'Ideje u djelovanju', desc: isEnglish ? 'Ideas the Group is actively turning into practice.' : 'Ideje koje Grupa aktivno pretvara u djelovanje.', href: '/ideje-u-djelovanju/', bg: '#c9ff66', fg: '#12211b', selfPath: '/ideje-u-djelovanju' },
    { key: 'puls', label: isEnglish ? 'Open Puls' : 'Otvori Puls', title: 'Puls Tržišta', desc: isEnglish ? 'Live world indices, stocks, commodities, currencies and crypto.' : 'Uživo svjetski indeksi, dionice, roba, valute i kripto.', href: '/puls-trzista/', bg: '#a78bfa', fg: '#17131f', selfPath: '/puls-trzista' },
    { key: 'ai3d', label: isEnglish ? 'Open AI 3D' : 'Otvori AI 3D', title: 'SYNAPSE — AI Agent 3D Simulation', desc: isEnglish ? 'Interactive 3D demo of autonomous AI agents — worth a look.' : 'Interaktivan 3D demo autonomnih AI agenata — obavezno pogledati.', href: '/synapse-demo/', bg: '#00f0ff', fg: '#062229', selfPath: '/synapse-demo' },
    { key: 'bio', label: isEnglish ? 'Open Bio' : 'Otvori Bio', title: 'Nilus Bio (PRJ-006)', desc: isEnglish ? 'Organic Egyptian food products — market study project.' : 'Organski egipatski prehrambeni proizvodi — projekt u fazi studije tržišta.', href: '/nilus-bio/', bg: '#fcd34d', fg: '#241703', selfPath: '/nilus-bio' },
    { key: 'tech', label: isEnglish ? 'Open Tech' : 'Otvori Tech', title: 'GNK DINAMO Digital Solutions', desc: isEnglish ? 'Technology services within GNK DINAMO Ltd. Group.' : 'Tehnološke usluge unutar GNK DINAMO Ltd. Group.', href: '/digital-solutions/', bg: '#2563eb', fg: '#eff6ff', selfPath: '/digital-solutions' },
    { key: 'krize', label: isEnglish ? 'Open Crisis' : 'Otvori Krize', title: isEnglish ? 'Market Crises' : 'Tržišne krize', desc: isEnglish ? 'Major market crises from 2000 to today, compared live.' : 'Velike tržišne krize od 2000. do danas, uživo usporedba.', href: isEnglish ? '/en/market-crises/' : '/trzisne-krize/', bg: '#fbbf24', fg: '#241703', selfPath: isEnglish ? '/en/market-crises' : '/trzisne-krize' },
    { key: 'pulse', label: isEnglish ? 'Open Pulse' : 'Otvori Pulse', title: 'Pulse — Command Center', desc: isEnglish ? 'Live weather, world clock, FX and security dashboard demo.' : 'Uživo vrijeme, svjetski sat, valute i sigurnosni dashboard demo.', href: '/pulse-demo/', bg: '#29d5a1', fg: '#071110', selfPath: '/pulse-demo' }
  ].filter(item => item.selfPath !== path);

  const LEFT_ITEMS = ALL_ITEMS.slice(0, 4);
  const RIGHT_ITEMS = ALL_ITEMS.slice(4, 8);

  const TOOTH = 26;    // px visible when closed — allows 2-line 'Otvori X' label
  const OPEN_H = 112;   // px total height when open (label + title + desc + cta)
  const AUTO_CLOSE_MS = 4000;
  const GAP_FROM_CENTER = 76;

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID}-left, #${WIDGET_ID}-right {
      position: fixed;
      top: 84px;
      z-index: 9985;
      display: flex;
      gap: 8px;
      pointer-events: none;
    }
    #${WIDGET_ID}-left { right: calc(50% + ${GAP_FROM_CENTER}px); justify-content: flex-end; }
    #${WIDGET_ID}-right { left: calc(50% + ${GAP_FROM_CENTER}px); justify-content: flex-start; }
    .gnk-tile {
      position: relative;
      width: 68px;
      height: ${TOOTH}px;
      border-radius: 0 0 12px 12px;
      border: 1.5px solid #d4af37;
      border-top: none;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(0,0,0,.28);
      transition: height .32s cubic-bezier(.34,1.15,.64,1);
      pointer-events: auto;
      cursor: pointer;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    }
    .gnk-tile.open { height: ${OPEN_H}px; }
    .gnk-tile .gnk-tile-bg { position: absolute; inset: 0; opacity: .38; transition: opacity .28s ease; }
    .gnk-tile.open .gnk-tile-bg { opacity: .96; }
    .gnk-tile .gnk-tile-pulse {
      position: absolute; inset: 0; background: #8ce89a; opacity: 0;
      animation: gnkToothPulse 2.6s ease-in-out infinite;
    }
    .gnk-tile.open .gnk-tile-pulse { animation: none; opacity: 0; }
    @keyframes gnkToothPulse { 0%, 100% { opacity: 0; } 50% { opacity: .55; } }
    .gnk-tile .gnk-tile-body {
      position: relative; width: 100%;
      display: flex; flex-direction: column;
      padding: 6px 6px 7px; box-sizing: border-box;
    }
    .gnk-tile .gnk-tile-label {
      font-size: .54rem; font-weight: 900; text-transform: uppercase; letter-spacing: .01em;
      text-align: center; height: ${TOOTH - 2}px; display: flex; align-items: center; justify-content: center;
      line-height: 1.05; padding: 0 2px; word-break: break-word;
      order: -1; color: #0a1626; text-shadow: 0 0 3px rgba(255,255,255,.9), 0 0 1px rgba(255,255,255,.8);
    }
    .gnk-tile .gnk-tile-title { font-size: .6rem; font-weight: 900; line-height: 1.2; margin: 4px 0 3px; opacity: 0; transition: opacity .16s ease .1s; }
    .gnk-tile .gnk-tile-full { font-size: .54rem; font-weight: 700; line-height: 1.22; margin-bottom: 5px; opacity: 0; transition: opacity .16s ease .14s; }
    .gnk-tile .gnk-tile-cta {
      display: block; text-align: center; width: 100%; box-sizing: border-box;
      font-size: .52rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      opacity: 0; transition: opacity .16s ease .18s;
      background: #ffffff; color: #07162d; border: 1.5px solid #d4af37;
      padding: 6px 6px; border-radius: 999px; box-shadow: 0 2px 5px rgba(0,0,0,.3);
    }
    .gnk-tile.open .gnk-tile-title, .gnk-tile.open .gnk-tile-full { opacity: 1; }
    .gnk-tile.open .gnk-tile-cta { opacity: 1; animation: gnkCtaPulse 1.4s ease-in-out .3s 2; }
    @keyframes gnkCtaPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @media (max-width: 900px) {
      #${WIDGET_ID}-left, #${WIDGET_ID}-right { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { .gnk-tile { transition: none; } #${WIDGET_ID}-mobile-toggle { animation: none; } }
    #${WIDGET_ID}-mobile-toggle {
      display: none;
      height: 34px;
      padding: 0 12px;
      border: 1px solid #d4af37;
      border-radius: 999px;
      background: #181b22;
      color: #f5f2ea;
      font: 800 10px/1 Arial, sans-serif;
      letter-spacing: .05em;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      white-space: nowrap;
      flex: 0 0 auto;
      order: -1;
      animation: gnkStickerTogglePulse 2.2s ease-in-out infinite;
    }
    @keyframes gnkStickerTogglePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,.55); }
      50% { box-shadow: 0 0 0 7px rgba(212,175,55,0); }
    }
    #${WIDGET_ID}-mobile-panel {
      display: none;
      position: fixed;
      top: 84px;
      right: 8px;
      left: 8px;
      z-index: 2147483641;
      max-height: calc(100vh - 100px);
      overflow: auto;
      background: #0d0f14;
      border: 1px solid rgba(212,175,55,.35);
      border-top: 4px solid rgba(184,138,47,.85);
      border-radius: 16px;
      box-shadow: 0 28px 80px rgba(0,0,0,.6);
      padding: 14px;
    }
    #${WIDGET_ID}-mobile-panel.open { display: block; }
    #${WIDGET_ID}-mobile-panel .gnk-mp-item {
      display: block;
      padding: 12px 13px;
      margin-bottom: 8px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.25);
      text-decoration: none;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    #${WIDGET_ID}-mobile-panel .gnk-mp-item:active { transform: scale(.98); }
    #${WIDGET_ID}-mobile-panel .gnk-mp-title {
      display: block;
      font: 800 13px/1.3 Arial, sans-serif;
      color: #f5f2ea;
      margin-bottom: 4px;
    }
    #${WIDGET_ID}-mobile-panel .gnk-mp-desc {
      display: block;
      font: 400 11px/1.4 Arial, sans-serif;
      color: #94a3b8;
    }
    @media (max-width: 900px) {
      #${WIDGET_ID}-mobile-toggle { display: flex; }
    }
  `;
  document.head.appendChild(style);

  function buildGroup(items) {
    const group = document.createDocumentFragment();
    items.forEach((item, idx) => {
      const tile = document.createElement('div');
      tile.className = 'gnk-tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', item.title);
      const delay = (idx * 0.55).toFixed(2);
      const duration = (2.2 + (idx % 3) * 0.5).toFixed(2);
      tile.innerHTML = `
        <div class="gnk-tile-bg" style="background:${item.bg}"></div>
        <div class="gnk-tile-pulse" style="animation-delay:${delay}s; animation-duration:${duration}s;"></div>
        <div class="gnk-tile-body" style="color:${item.fg}">
          <div class="gnk-tile-label">${item.label}</div>
          <div class="gnk-tile-title">${item.title}</div>
          <div class="gnk-tile-full">${item.desc}</div>
          <div class="gnk-tile-cta">${isEnglish ? 'Visit us →' : 'Posjetite nas →'}</div>
        </div>
      `;

      let openState = false;
      let closeTimer = null;
      function closeTile() {
        openState = false;
        tile.classList.remove('open');
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      }
      function openTile() {
        openState = true;
        tile.classList.add('open');
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(closeTile, AUTO_CLOSE_MS);
      }
      tile.addEventListener('click', () => {
        if (!openState) openTile();
        else location.href = item.href;
      });
      tile.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tile.click(); }
      });

      group.appendChild(tile);
    });
    return group;
  }

  const leftBar = document.createElement('div');
  leftBar.id = `${WIDGET_ID}-left`;
  leftBar.appendChild(buildGroup(LEFT_ITEMS));

  const rightBar = document.createElement('div');
  rightBar.id = `${WIDGET_ID}-right`;
  rightBar.appendChild(buildGroup(RIGHT_ITEMS));

  document.addEventListener('click', event => {
    [leftBar, rightBar].forEach(bar => {
      if (bar.contains(event.target)) return;
      bar.querySelectorAll('.gnk-tile.open').forEach(t => t.classList.remove('open'));
    });
  });

  // Mobile: a single toggle button opens a dropdown panel listing all
  // sticker projects, instead of the fixed left/right tooth-tile bars
  // (which are hidden below 900px via the stylesheet above).
  const mobileToggle = document.createElement('button');
  mobileToggle.id = `${WIDGET_ID}-mobile-toggle`;
  mobileToggle.type = 'button';
  mobileToggle.textContent = isEnglish ? '★ PROJECTS' : '★ PROJEKTI';
  mobileToggle.setAttribute('aria-expanded', 'false');

  const mobilePanel = document.createElement('div');
  mobilePanel.id = `${WIDGET_ID}-mobile-panel`;
  mobilePanel.innerHTML = ALL_ITEMS.map(item =>
    `<a class="gnk-mp-item" href="${item.href}" style="background:${item.bg};color:${item.fg}"><span class="gnk-mp-title" style="color:${item.fg}">${item.title}</span><span class="gnk-mp-desc" style="color:${item.fg};opacity:.75">${item.desc}</span></a>`
  ).join('');

  mobileToggle.addEventListener('click', () => {
    const open = mobilePanel.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (mobilePanel.classList.contains('open') && !mobilePanel.contains(event.target) && event.target !== mobileToggle) {
      mobilePanel.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    }
  });

  const mount = () => {
    document.body.append(leftBar, rightBar, mobilePanel);
    // Insert the mobile toggle inside the header's own actions row, right
    // before the HR/EN language switcher, so it aligns naturally with the
    // existing header controls instead of floating separately.
    const actions = document.querySelector('#gnk-unified-menu .actions');
    const langSwitch = actions && actions.querySelector('.lang');
    if (actions && langSwitch) {
      actions.insertBefore(mobileToggle, langSwitch);
    } else {
      document.body.appendChild(mobileToggle);
    }
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
