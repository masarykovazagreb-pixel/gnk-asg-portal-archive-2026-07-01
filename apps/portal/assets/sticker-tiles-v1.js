(() => {
  'use strict';

  const WIDGET_ID = 'gnk-sticker-tiles';
  if (document.getElementById(WIDGET_ID)) return;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');

  const ALL_ITEMS = [
    { key: 'news', title: 'AKTUAL MEDIA', desc: isEnglish ? 'Live business, world and tech news aggregator, updated hourly.' : 'Uživo agregator poslovnih, svjetskih i tehnoloških vijesti, ažurira se svaki sat.', href: '/gnk-aktual/', bg: '#ff6b6b', fg: '#2a0d0f', selfPath: '/gnk-aktual' },
    { key: 'ideja', title: isEnglish ? 'Ideas in Action' : 'Ideje u djelovanju', desc: isEnglish ? 'Ideas the Group is actively turning into practice.' : 'Ideje koje Grupa aktivno pretvara u djelovanje.', href: '/ideje-u-djelovanju/', bg: '#c9ff66', fg: '#12211b', selfPath: '/ideje-u-djelovanju' },
    { key: 'puls', title: 'Puls Tržišta', desc: isEnglish ? 'Live world indices, stocks, commodities, currencies and crypto.' : 'Uživo svjetski indeksi, dionice, roba, valute i kripto.', href: '/puls-trzista/', bg: '#a78bfa', fg: '#17131f', selfPath: '/puls-trzista' },
    { key: 'ai3d', title: 'SYNAPSE — AI Agent 3D Simulation', desc: isEnglish ? 'Interactive 3D demo of autonomous AI agents — worth a look.' : 'Interaktivan 3D demo autonomnih AI agenata — obavezno pogledati.', href: '/synapse-demo/', bg: '#00f0ff', fg: '#062229', selfPath: '/synapse-demo' },
    { key: 'bio', title: 'Nilus Bio (PRJ-006)', desc: isEnglish ? 'Organic Egyptian food products — market study project.' : 'Organski egipatski prehrambeni proizvodi — projekt u fazi studije tržišta.', href: '/nilus-bio/', bg: '#fcd34d', fg: '#241703', selfPath: '/nilus-bio' },
    { key: 'tech', title: 'GNK DINAMO Digital Solutions', desc: isEnglish ? 'Technology services within GNK DINAMO Ltd. Group.' : 'Tehnološke usluge unutar GNK DINAMO Ltd. Group.', href: '/digital-solutions/', bg: '#2563eb', fg: '#eff6ff', selfPath: '/digital-solutions' },
    { key: 'krize', title: isEnglish ? 'Market Crises' : 'Tržišne krize', desc: isEnglish ? 'Major market crises from 2000 to today, compared live.' : 'Velike tržišne krize od 2000. do danas, uživo usporedba.', href: isEnglish ? '/en/market-crises/' : '/trzisne-krize/', bg: '#fbbf24', fg: '#241703', selfPath: isEnglish ? '/en/market-crises' : '/trzisne-krize' },
    { key: 'pulse', title: 'Pulse — Command Center', desc: isEnglish ? 'Live weather, world clock, FX and security dashboard demo.' : 'Uživo vrijeme, svjetski sat, valute i sigurnosni dashboard demo.', href: '/pulse-demo/', bg: '#29d5a1', fg: '#071110', selfPath: '/pulse-demo' }
  ].filter(item => item.selfPath !== path);

  // Single "★ PROJEKTI" toggle in the header, opening a colored dropdown
  // panel listing all sticker projects. Replaces the old fixed left/right
  // tooth-tile bars entirely (desktop and mobile both use this now).
  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID}-mobile-toggle {
      display: flex;
      height: 34px;
      padding: 0 13px;
      border: 1.5px solid #d4af37;
      border-radius: 999px;
      background: rgba(255,255,255,.06);
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
      animation: gnkStickerTogglePulse 1.8s ease-in-out infinite;
    }
    #${WIDGET_ID}-mobile-toggle span { animation: gnkStickerTextPulse 1.8s ease-in-out infinite; }
    @keyframes gnkStickerTogglePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,.65), inset 0 0 0 0 rgba(212,175,55,0); border-color: #d4af37; }
      50% { box-shadow: 0 0 0 9px rgba(212,175,55,0), inset 0 0 8px 0 rgba(212,175,55,.25); border-color: #f3d778; }
    }
    @keyframes gnkStickerTextPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .55; }
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
      margin-bottom: 4px;
    }
    #${WIDGET_ID}-mobile-panel .gnk-mp-desc {
      display: block;
      font: 400 11px/1.4 Arial, sans-serif;
    }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID}-mobile-toggle { animation: none; } #${WIDGET_ID}-mobile-toggle span { animation: none; } }
  `;
  document.head.appendChild(style);

  const mobileToggle = document.createElement('button');
  mobileToggle.id = `${WIDGET_ID}-mobile-toggle`;
  mobileToggle.type = 'button';
  mobileToggle.innerHTML = `<span>${isEnglish ? '★ PROJECTS' : '★ PROJEKTI'}</span>`;
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
    if (mobilePanel.classList.contains('open') && !mobilePanel.contains(event.target) && !mobileToggle.contains(event.target)) {
      mobilePanel.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    }
  });

  const mount = () => {
    document.body.appendChild(mobilePanel);
    // Insert the toggle inside the header's own actions row, right before
    // the HR/EN language switcher, so it aligns naturally with the
    // existing header controls.
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
