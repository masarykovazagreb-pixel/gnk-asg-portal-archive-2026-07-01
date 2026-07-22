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
  const OPEN_H = 104;   // px total height when open (label + title + desc + cta)
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
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(0,0,0,.28);
      transition: height .32s cubic-bezier(.34,1.15,.64,1);
      pointer-events: auto;
      cursor: pointer;
      font-family: Arial, sans-serif;
    }
    .gnk-tile.open { height: ${OPEN_H}px; }
    .gnk-tile .gnk-tile-bg { position: absolute; inset: 0; opacity: .96; }
    .gnk-tile .gnk-tile-body {
      position: relative; width: 100%;
      display: flex; flex-direction: column;
      padding: 6px 6px 7px; box-sizing: border-box;
    }
    .gnk-tile .gnk-tile-label {
      font-size: .54rem; font-weight: 900; text-transform: uppercase; letter-spacing: .01em;
      text-align: center; height: ${TOOTH - 2}px; display: flex; align-items: center; justify-content: center;
      line-height: 1.05; padding: 0 2px; word-break: break-word;
      order: -1;
    }
    .gnk-tile .gnk-tile-title { font-size: .6rem; font-weight: 900; line-height: 1.2; margin: 4px 0 3px; opacity: 0; transition: opacity .16s ease .1s; }
    .gnk-tile .gnk-tile-full { font-size: .54rem; font-weight: 700; line-height: 1.22; margin-bottom: 5px; opacity: 0; transition: opacity .16s ease .14s; }
    .gnk-tile .gnk-tile-cta { font-size: .48rem; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; opacity: 0; transition: opacity .16s ease .18s; }
    .gnk-tile.open .gnk-tile-title, .gnk-tile.open .gnk-tile-full, .gnk-tile.open .gnk-tile-cta { opacity: 1; }
    @media (max-width: 900px) {
      #${WIDGET_ID}-left, #${WIDGET_ID}-right { gap: 4px; }
      #${WIDGET_ID}-left { right: calc(50% + 44px); }
      #${WIDGET_ID}-right { left: calc(50% + 44px); }
      .gnk-tile { width: 46px; }
      .gnk-tile .gnk-tile-title, .gnk-tile .gnk-tile-full { font-size: .48rem; }
      .gnk-tile .gnk-tile-cta { font-size: .42rem; }
      .gnk-tile .gnk-tile-label { font-size: .52rem; }
    }
    @media (prefers-reduced-motion: reduce) { .gnk-tile { transition: none; } }
  `;
  document.head.appendChild(style);

  function buildGroup(items) {
    const group = document.createDocumentFragment();
    items.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'gnk-tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', item.title);
      tile.innerHTML = `
        <div class="gnk-tile-bg" style="background:${item.bg}"></div>
        <div class="gnk-tile-body" style="color:${item.fg}">
          <div class="gnk-tile-label">${item.label}</div>
          <div class="gnk-tile-title">${item.title}</div>
          <div class="gnk-tile-full">${item.desc}</div>
          <div class="gnk-tile-cta">${isEnglish ? 'Open →' : 'Otvori →'}</div>
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

  const mount = () => document.body.append(leftBar, rightBar);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
