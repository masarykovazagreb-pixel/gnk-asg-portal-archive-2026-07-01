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
      right: max(52px, calc(env(safe-area-inset-right) + 38px));
      top: max(242px, calc(env(safe-area-inset-top) + 242px));
      left: auto;
      z-index: 9996;
      width: 91px;
      padding: 9px;
      border-radius: 11px;
      background: #ff6b6b;
      border: 1px solid #e5323a;
      color: #2a0d0f;
      font-family: Arial, sans-serif;
      box-shadow: 0 10px 26px rgba(0,0,0,.25);
      text-decoration: none;
      display: block;
      transform-origin: top center;
      transform: rotate(3deg);
      animation: gnkAktualSway 6.5s ease-in-out infinite;
      animation-delay: .8s;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover, #${WIDGET_ID}:focus-visible { box-shadow: 0 13px 30px rgba(0,0,0,.35); outline: none; }
    #${WIDGET_ID} .flag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .5rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
      color: #ff6b6b; background: #2a0d0f; padding: 3px 6px; border-radius: 3px; margin-bottom: 6px;
    }
    #${WIDGET_ID} .flag::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: #ff6b6b; }
    #${WIDGET_ID} strong { display: block; font-size: .68rem; font-weight: 800; line-height: 1.3; margin-bottom: 6px; }
    #${WIDGET_ID} span.cta {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .55rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      color: #2a0d0f;
    }
    @keyframes gnkAktualSway { 0%, 100% { transform: rotate(3deg); } 50% { transform: rotate(-2deg); } }
    @media (max-width: 640px) { #${WIDGET_ID} { width: 77px; padding: 7px; top: max(219px, calc(env(safe-area-inset-top) + 219px)); right: max(40px, calc(env(safe-area-inset-right) + 26px)); } #${WIDGET_ID} strong { font-size: .6rem; } }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = '/gnk-aktual/';
  link.setAttribute('aria-label', 'AKTUAL MEDIA — najnovije vijesti — Posjetite nas');
  link.innerHTML = '<span class="flag">Uživo</span><strong>AKTUAL MEDIA — najnovije vijesti</strong><span class="cta">Posjetite nas →</span>';

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
