(() => {
  'use strict';

  const WIDGET_ID = 'gnk-digital-solutions-flyer';
  if (document.getElementById(WIDGET_ID)) return;
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/digital-solutions') return;

  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');
  const copy = isEnglish
    ? { flag: 'Tech', title: 'GNK DINAMO Digital Solutions', cta: 'Explore' }
    : { flag: 'Tech', title: 'GNK DINAMO Digital Solutions', cta: 'Istraži' };

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(52px, calc(env(safe-area-inset-right) + 38px));
      top: max(837px, calc(env(safe-area-inset-top) + 837px));
      left: auto;
      z-index: 9991;
      width: 91px;
      padding: 9px;
      border-radius: 11px;
      background: #2563eb;
      border: 1px solid #1e3a8a;
      color: #eff6ff;
      font-family: Arial, sans-serif;
      box-shadow: 0 10px 26px rgba(37,99,235,.3);
      text-decoration: none;
      display: block;
      transform-origin: top center;
      transform: rotate(-3deg);
      animation: gnkDigitalSolSway 7.2s ease-in-out infinite;
      animation-delay: 4.8s;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover, #${WIDGET_ID}:focus-visible { box-shadow: 0 13px 30px rgba(37,99,235,.42); outline: none; }
    #${WIDGET_ID} .flag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .5rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
      color: #2563eb; background: #eff6ff; padding: 3px 6px; border-radius: 3px; margin-bottom: 6px;
    }
    #${WIDGET_ID} .flag::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: #2563eb; }
    #${WIDGET_ID} strong { display: block; font-size: .65rem; font-weight: 800; line-height: 1.3; margin-bottom: 6px; }
    #${WIDGET_ID} span.cta {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .55rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      color: #eff6ff;
    }
    @keyframes gnkDigitalSolSway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg); } }
    @media (max-width: 640px) { #${WIDGET_ID} { width: 77px; padding: 7px; top: max(799px, calc(env(safe-area-inset-top) + 799px)); right: max(40px, calc(env(safe-area-inset-right) + 26px)); } #${WIDGET_ID} strong { font-size: .58rem; } }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = '/digital-solutions/';
  link.setAttribute('aria-label', `${copy.title} — ${copy.cta}`);
  link.innerHTML = `<span class="flag">${copy.flag}</span><strong>${copy.title}</strong><span class="cta">${copy.cta} →</span>`;

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
