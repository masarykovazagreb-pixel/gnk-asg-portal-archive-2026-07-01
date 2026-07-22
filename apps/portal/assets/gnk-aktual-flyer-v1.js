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
      right: max(326px, calc(env(safe-area-inset-right) + 312px));
      top: max(84px, env(safe-area-inset-top));
      left: auto;
      z-index: 9996;
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
      transform-origin: top center;
      transform: rotate(3deg);
      animation: gnkAktualSway 6.5s ease-in-out infinite;
      animation-delay: .8s;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover, #${WIDGET_ID}:focus-visible { box-shadow: 0 11px 24px rgba(0,0,0,.3); outline: none; }
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
    @keyframes gnkAktualSway { 0%, 100% { transform: rotate(3deg); } 50% { transform: rotate(-2deg); } }
    @media (max-width: 640px) { #${WIDGET_ID} { width: 58px; padding: 6px; top: max(84px, env(safe-area-inset-top)); right: max(312px, calc(env(safe-area-inset-right) + 300px)); } #${WIDGET_ID} strong { font-size: .46rem; } }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = '/gnk-aktual/';
  link.setAttribute('aria-label', 'AKTUAL MEDIA — najnovije vijesti — Posjetite nas');
  link.innerHTML = '<span class="flag">Uživo</span><strong>AKTUAL MEDIA</strong><span class="cta">Otvori →</span>';

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
