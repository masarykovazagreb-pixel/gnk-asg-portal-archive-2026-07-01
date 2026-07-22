(() => {
  'use strict';

  const WIDGET_ID = 'gnk-sticker-tiles';
  if (document.getElementById(WIDGET_ID)) return;

  const path = location.pathname.replace(/\/+$/, '') || '/';
  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');

  const ITEMS = [
    { key: 'news', label: 'News', title: 'AKTUAL MEDIA', desc: isEnglish ? 'Live business, world and tech news aggregator, updated hourly.' : 'Uživo agregator poslovnih, svjetskih i tehnoloških vijesti, ažurira se svaki sat.', href: '/gnk-aktual/', bg: '#ff6b6b', fg: '#2a0d0f', selfPath: '/gnk-aktual' },
    { key: 'ideja', label: isEnglish ? 'Ideas' : 'Ideja', title: isEnglish ? 'Ideas in Action' : 'Ideje u djelovanju', desc: isEnglish ? 'Ideas the Group is actively turning into practice.' : 'Ideje koje Grupa aktivno pretvara u djelovanje.', href: '/ideje-u-djelovanju/', bg: '#c9ff66', fg: '#12211b', selfPath: '/ideje-u-djelovanju' },
    { key: 'puls', label: 'Puls', title: 'Puls Tržišta', desc: isEnglish ? 'Live world indices, stocks, commodities, currencies and crypto.' : 'Uživo svjetski indeksi, dionice, roba, valute i kripto.', href: '/puls-trzista/', bg: '#a78bfa', fg: '#17131f', selfPath: '/puls-trzista' },
    { key: 'ai3d', label: 'AI 3D', title: 'SYNAPSE — AI Agent 3D Simulation', desc: isEnglish ? 'Interactive 3D demo of autonomous AI agents — worth a look.' : 'Interaktivan 3D demo autonomnih AI agenata — obavezno pogledati.', href: '/synapse-demo/', bg: '#00f0ff', fg: '#062229', selfPath: '/synapse-demo' },
    { key: 'bio', label: 'Bio', title: 'Nilus Bio (PRJ-006)', desc: isEnglish ? 'Organic Egyptian food products — market study project.' : 'Organski egipatski prehrambeni proizvodi — projekt u fazi studije tržišta.', href: '/nilus-bio/', bg: '#fcd34d', fg: '#241703', selfPath: '/nilus-bio' },
    { key: 'tech', label: 'Tech', title: 'GNK DINAMO Digital Solutions', desc: isEnglish ? 'Technology services within GNK DINAMO Ltd. Group.' : 'Tehnološke usluge unutar GNK DINAMO Ltd. Group.', href: '/digital-solutions/', bg: '#2563eb', fg: '#eff6ff', selfPath: '/digital-solutions' },
    { key: 'krize', label: isEnglish ? 'Crisis' : 'Krize', title: isEnglish ? 'Market Crises' : 'Tržišne krize', desc: isEnglish ? 'Major market crises from 2000 to today, compared live.' : 'Velike tržišne krize od 2000. do danas, uživo usporedba.', href: isEnglish ? '/en/market-crises/' : '/trzisne-krize/', bg: '#fbbf24', fg: '#241703', selfPath: isEnglish ? '/en/market-crises' : '/trzisne-krize' },
    { key: 'pulse', label: 'Pulse', title: 'Pulse — Command Center', desc: isEnglish ? 'Live weather, world clock, FX and security dashboard demo.' : 'Uživo vrijeme, svjetski sat, valute i sigurnosni dashboard demo.', href: '/pulse-demo/', bg: '#29d5a1', fg: '#071110', selfPath: '/pulse-demo' }
  ].filter(item => item.selfPath !== path);

  const TOOTH = 18;   // px always visible below the header's gold line
  const HIDDEN = 82;  // px tucked up behind the header when closed
  const TILE_H = TOOTH + HIDDEN;
  const AUTO_CLOSE_MS = 4000;

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      top: 84px;
      left: 0;
      right: 0;
      height: 0;
      overflow: visible;
      z-index: 9985;
      display: flex;
      justify-content: center;
      gap: 8px;
      pointer-events: none;
    }
    #${WIDGET_ID} .gnk-tile {
      position: relative;
      width: 70px;
      height: ${TILE_H}px;
      border-radius: 0 0 12px 12px;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(0,0,0,.28);
      transform: translateY(-${HIDDEN}px);
      transition: transform .32s cubic-bezier(.34,1.15,.64,1);
      pointer-events: auto;
      cursor: pointer;
      font-family: Arial, sans-serif;
    }
    #${WIDGET_ID} .gnk-tile.open { transform: translateY(0); }
    #${WIDGET_ID} .gnk-tile .gnk-tile-bg { position: absolute; inset: 0; opacity: .96; }
    #${WIDGET_ID} .gnk-tile .gnk-tile-body {
      position: relative; height: 100%;
      display: flex; flex-direction: column; justify-content: flex-end;
      padding: 8px 7px; box-sizing: border-box;
    }
    #${WIDGET_ID} .gnk-tile .gnk-tile-title {
      font-size: .62rem; font-weight: 900; line-height: 1.2;
      opacity: 0; transition: opacity .16s ease .08s; margin-bottom: 4px;
    }
    #${WIDGET_ID} .gnk-tile .gnk-tile-full {
      font-size: .56rem; font-weight: 700; line-height: 1.25;
      opacity: 0; transition: opacity .16s ease .12s; margin-bottom: 6px;
    }
    #${WIDGET_ID} .gnk-tile .gnk-tile-cta {
      font-size: .5rem; font-weight: 900; text-transform: uppercase; letter-spacing: .04em;
      opacity: 0; transition: opacity .16s ease .16s;
    }
    #${WIDGET_ID} .gnk-tile.open .gnk-tile-title,
    #${WIDGET_ID} .gnk-tile.open .gnk-tile-full,
    #${WIDGET_ID} .gnk-tile.open .gnk-tile-cta { opacity: 1; }
    #${WIDGET_ID} .gnk-tile .gnk-tile-label {
      font-size: .66rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      text-align: center; height: ${TOOTH}px; display: flex; align-items: center; justify-content: center;
    }
    @media (max-width: 900px) {
      #${WIDGET_ID} { gap: 4px; }
      #${WIDGET_ID} .gnk-tile { width: 50px; }
      #${WIDGET_ID} .gnk-tile .gnk-tile-title,
      #${WIDGET_ID} .gnk-tile .gnk-tile-full { font-size: .5rem; }
      #${WIDGET_ID} .gnk-tile .gnk-tile-cta { font-size: .44rem; }
      #${WIDGET_ID} .gnk-tile .gnk-tile-label { font-size: .56rem; }
    }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} .gnk-tile { transition: none; } }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = WIDGET_ID;

  ITEMS.forEach(item => {
    const tile = document.createElement('div');
    tile.className = 'gnk-tile';
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-label', item.title);
    tile.innerHTML = `
      <div class="gnk-tile-bg" style="background:${item.bg}"></div>
      <div class="gnk-tile-body" style="color:${item.fg}">
        <div class="gnk-tile-title">${item.title}</div>
        <div class="gnk-tile-full">${item.desc}</div>
        <div class="gnk-tile-cta">${isEnglish ? 'Open →' : 'Otvori →'}</div>
        <div class="gnk-tile-label">${item.label}</div>
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
      if (!openState) {
        openTile();
      } else {
        location.href = item.href;
      }
    });
    tile.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        tile.click();
      }
    });
    tile.addEventListener('mouseleave', () => {
      if (openState && closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closeTile, AUTO_CLOSE_MS);
      }
    });

    bar.appendChild(tile);
  });

  document.addEventListener('click', event => {
    if (bar.contains(event.target)) return;
    bar.querySelectorAll('.gnk-tile.open').forEach(t => t.classList.remove('open'));
  });

  const mount = () => document.body.appendChild(bar);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
