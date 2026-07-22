(() => {
  'use strict';

  const WIDGET_ID = 'gnk-ideje-sticker';
  if (document.getElementById(WIDGET_ID)) return;
  if (location.pathname.replace(/\/+$/, '') === '/ideje-u-djelovanju') return;

  const isEnglish = document.documentElement.lang === 'en';
  const label = isEnglish ? 'Ideas' : 'Ideje';
  const title = isEnglish ? 'New ideas that become action' : 'Nove ideje koje postaju djelovanje';

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(90px, calc(env(safe-area-inset-right) + 76px));
      top: max(84px, env(safe-area-inset-top));
      z-index: 9997;
      width: 44px;
      height: 66px;
      transform-origin: top center;
      animation: gnkIdejeThreadSway 5.5s ease-in-out infinite;
      pointer-events: none;
    }
    #${WIDGET_ID} .thread {
      display: block;
      width: 1.5px;
      height: 22px;
      margin: 0 auto;
      background: linear-gradient(to bottom, rgba(255,255,255,.05), rgba(255,255,255,.55));
    }
    #${WIDGET_ID} .badge {
      position: absolute;
      top: 22px;
      left: 50%;
      transform: translateX(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #c9ff66;
      color: #12211b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      font-size: .62rem;
      font-weight: 900;
      text-align: center;
      line-height: 1.1;
      text-decoration: none;
      box-shadow: 0 5px 14px rgba(0,0,0,.28);
      pointer-events: auto;
      transition: box-shadow .2s ease, transform .2s ease;
    }
    #${WIDGET_ID} .badge::after {
      content: "↗";
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #12211b;
      color: #c9ff66;
      font-size: .55rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,.35);
    }
    #${WIDGET_ID} .badge:hover,
    #${WIDGET_ID} .badge:focus-visible {
      box-shadow: 0 7px 18px rgba(0,0,0,.35);
      transform: translateX(-50%) scale(1.06);
      outline: none;
    }
    @keyframes gnkIdejeThreadSway {
      0%, 100% { transform: rotate(-9deg); }
      50% { transform: rotate(9deg); }
    }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 38px; height: 58px; right: max(76px, calc(env(safe-area-inset-right) + 64px)); }
      #${WIDGET_ID} .badge { width: 38px; height: 38px; font-size: .56rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${WIDGET_ID} { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = WIDGET_ID;
  wrap.innerHTML = `<span class="thread" aria-hidden="true"></span><a class="badge" href="/ideje-u-djelovanju/" aria-label="${title}">${label}</a>`;

  const mount = () => document.body.appendChild(wrap);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
