(() => {
  'use strict';

  const WIDGET_ID = 'gnk-digital-solutions-flyer';
  if (document.getElementById(WIDGET_ID)) return;
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/digital-solutions') return;

  const label = 'Tech';
  const title = 'GNK DINAMO Digital Solutions';

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(298px, calc(env(safe-area-inset-right) + 284px));
      top: max(84px, env(safe-area-inset-top));
      z-index: 9991;
      width: 44px;
      height: 66px;
      transform-origin: top center;
      animation: gnkDigitalSolThreadSway 6.4s ease-in-out infinite;
      animation-delay: 1.9s;
      pointer-events: none;
    }
    #${WIDGET_ID} .thread {
      display: block;
      width: 1.5px;
      height: 22px;
      margin: 0 auto;
      background: linear-gradient(to bottom, rgba(255,255,255,.05), rgba(37,99,235,.55));
    }
    #${WIDGET_ID} .badge {
      position: absolute;
      top: 22px;
      left: 50%;
      transform: translateX(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #2563eb;
      border: 1px solid #1e3a8a;
      color: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      font-size: .62rem;
      font-weight: 900;
      text-decoration: none;
      box-shadow: 0 5px 14px rgba(37,99,235,.32);
      pointer-events: auto;
      transition: box-shadow .2s ease, transform .2s ease;
    }
    #${WIDGET_ID} .badge:hover, #${WIDGET_ID} .badge:focus-visible {
      box-shadow: 0 7px 18px rgba(37,99,235,.42);
      transform: translateX(-50%) scale(1.06);
      outline: none;
    }
    #${WIDGET_ID} .badge::after {
      content: "↗";
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #1e3a8a;
      color: #eff6ff;
      font-size: .55rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,.35);
    }
    @keyframes gnkDigitalSolThreadSway {
      0%, 100% { transform: rotate(-8deg); }
      50% { transform: rotate(9deg); }
    }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 38px; height: 58px; right: max(260px, calc(env(safe-area-inset-right) + 248px)); }
      #${WIDGET_ID} .badge { width: 38px; height: 38px; font-size: .5rem; }
    }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = WIDGET_ID;
  wrap.innerHTML = `<span class="thread" aria-hidden="true"></span><a class="badge" href="/digital-solutions/" aria-label="${title}">${label}</a>`;

  const mount = () => document.body.appendChild(wrap);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
