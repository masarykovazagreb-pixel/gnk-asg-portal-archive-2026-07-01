(() => {
  'use strict';

  const WIDGET_ID = 'gnk-aktual-flyer';
  if (document.getElementById(WIDGET_ID)) return;
  if (location.pathname.replace(/\/+$/, '') === '/gnk-aktual') return;

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(14px, calc(env(safe-area-inset-right) + 0px));
      top: max(84px, env(safe-area-inset-top));
      left: auto;
      z-index: 9996;
      width: 68px;
      height: 92px;
      transform-origin: top center;
      animation: gnkAktualThreadSway 6.5s ease-in-out infinite;
      animation-delay: .8s;
      pointer-events: none;
    }
    #${WIDGET_ID} .thread {
      display: block;
      width: 1.5px;
      height: 10px;
      margin: 0 auto;
      background: linear-gradient(to bottom, rgba(255,255,255,.05), rgba(255,107,107,.6));
    }
    #${WIDGET_ID} .card {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 68px;
      padding: 7px;
      border-radius: 9px;
      background: #ff6b6b;
      border: 1px solid #e5323a;
      color: #2a0d0f;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 20px rgba(0,0,0,.22);
      text-decoration: none;
      display: block;
      pointer-events: auto;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID} .card:hover, #${WIDGET_ID} .card:focus-visible { box-shadow: 0 11px 24px rgba(0,0,0,.3); outline: none; }
    #${WIDGET_ID} .flag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .42rem; font-weight: 900; letter-spacing: .04em; text-transform: uppercase;
      color: #ff6b6b; background: #2a0d0f; padding: 2px 5px; border-radius: 3px; margin-bottom: 4px;
    }
    #${WIDGET_ID} .flag::before { content: ""; width: 3px; height: 3px; border-radius: 50%; background: #ff6b6b; }
    #${WIDGET_ID} strong { display: block; font-size: .52rem; font-weight: 800; line-height: 1.25; margin-bottom: 4px; }
    #${WIDGET_ID} span.cta {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: .42rem; font-weight: 900; text-transform: uppercase; letter-spacing: .02em;
      color: #2a0d0f;
    }
    @keyframes gnkAktualThreadSway { 0%, 100% { transform: rotate(6deg); } 50% { transform: rotate(-5deg); } }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 58px; height: 80px; top: max(84px, env(safe-area-inset-top)); right: max(12px, calc(env(safe-area-inset-right) + 0px)); }
      #${WIDGET_ID} .card { width: 58px; padding: 6px; }
      #${WIDGET_ID} strong { font-size: .46rem; }
    }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = WIDGET_ID;
  wrap.innerHTML = '<span class="thread" aria-hidden="true"></span><a class="card" href="/gnk-aktual/" aria-label="AKTUAL MEDIA — najnovije vijesti — Posjetite nas"><span class="flag">Uživo</span><strong>AKTUAL MEDIA</strong><span class="cta">Posjeti →</span></a>';

  const mount = () => document.body.appendChild(wrap);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
