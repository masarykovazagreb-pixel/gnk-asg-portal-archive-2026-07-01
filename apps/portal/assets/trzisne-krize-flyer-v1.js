(() => {
  'use strict';

  const WIDGET_ID = 'gnk-krize-flyer';
  if (document.getElementById(WIDGET_ID)) return;
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/trzisne-krize' || path === '/en/market-crises') return;

  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');
  const copy = isEnglish
    ? { flag: 'History', title: 'Market Crises — 2000 to 2026', cta: 'Explore' }
    : { flag: 'Povijest', title: 'Tržišne krize — od 2000. do danas', cta: 'Istraži' };

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(14px, env(safe-area-inset-right));
      top: max(480px, calc(env(safe-area-inset-top) + 480px));
      left: auto;
      z-index: 9994;
      width: 91px;
      padding: 9px;
      border-radius: 11px;
      background: #fbbf24;
      border: 1px solid #b45309;
      color: #241703;
      font-family: Arial, sans-serif;
      box-shadow: 0 10px 26px rgba(0,0,0,.3);
      text-decoration: none;
      display: block;
      transform-origin: top center;
      transform: rotate(4deg);
      animation: gnkKrizeSway 7.5s ease-in-out infinite;
      animation-delay: 2.4s;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover, #${WIDGET_ID}:focus-visible { box-shadow: 0 13px 30px rgba(0,0,0,.4); outline: none; }
    #${WIDGET_ID} .flag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .5rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
      color: #fbbf24; background: #241703; padding: 3px 6px; border-radius: 3px; margin-bottom: 6px;
    }
    #${WIDGET_ID} .flag::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: #fbbf24; }
    #${WIDGET_ID} strong { display: block; font-size: .68rem; font-weight: 800; line-height: 1.3; margin-bottom: 6px; }
    #${WIDGET_ID} span.cta {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .55rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      color: #241703;
    }
    @keyframes gnkKrizeSway { 0%, 100% { transform: rotate(4deg); } 50% { transform: rotate(-3deg); } }
    @media (max-width: 640px) { #${WIDGET_ID} { width: 77px; padding: 7px; top: max(451px, calc(env(safe-area-inset-top) + 451px)); right: max(40px, calc(env(safe-area-inset-right) + 26px)); } #${WIDGET_ID} strong { font-size: .6rem; } }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = isEnglish ? '/en/market-crises/' : '/trzisne-krize/';
  link.setAttribute('aria-label', `${copy.title} — ${copy.cta}`);
  link.innerHTML = `<span class="flag">${copy.flag}</span><strong>${copy.title}</strong><span class="cta">${copy.cta} →</span>`;

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
