(() => {
  'use strict';

  const WIDGET_ID = 'gnk-ideje-sticker';
  if (document.getElementById(WIDGET_ID)) return;
  if (location.pathname.replace(/\/+$/, '') === '/ideje-u-djelovanju') return;

  const isEnglish = document.documentElement.lang === 'en';
  const copy = isEnglish
    ? { title: 'New ideas', sub: 'that become action', button: 'Visit us' }
    : { title: 'Nove ideje', sub: 'koje postaju djelovanje', button: 'Posjeti nas' };

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      left: max(16px, env(safe-area-inset-left));
      bottom: max(70px, calc(env(safe-area-inset-bottom) + 70px));
      z-index: 9997;
      width: 95px;
      padding: 9px;
      border-radius: 11px;
      background: #c9ff66;
      color: #12211b;
      font-family: Arial, sans-serif;
      box-shadow: 0 7px 17px rgba(0,0,0,.22);
      text-decoration: none;
      display: block;
      transform: rotate(-4deg);
      animation: gnkIdejeFloat 7s ease-in-out infinite;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover,
    #${WIDGET_ID}:focus-visible {
      transform: rotate(-2deg) translateY(-2px);
      box-shadow: 0 9px 20px rgba(0,0,0,.28);
      outline: none;
    }
    #${WIDGET_ID} strong {
      display: block;
      font-size: .58rem;
      font-weight: 800;
      letter-spacing: -.01em;
      margin-bottom: 2px;
    }
    #${WIDGET_ID} span.sub {
      display: block;
      font-size: .46rem;
      font-weight: 600;
      opacity: .82;
      margin-bottom: 6px;
    }
    #${WIDGET_ID} span.cta {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: .4rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .04em;
      background: #12211b;
      color: #c9ff66;
      padding: 4px 6px;
      border-radius: 999px;
    }
    @keyframes gnkIdejeFloat {
      0%, 100% { transform: rotate(-4deg) translateY(0); }
      50% { transform: rotate(-2deg) translateY(-5px); }
    }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 80px; padding: 7px; }
      #${WIDGET_ID} strong { font-size: .52rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${WIDGET_ID} { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = '/ideje-u-djelovanju/';
  link.setAttribute('aria-label', `${copy.title} ${copy.sub} — ${copy.button}`);
  link.innerHTML = `<strong>${copy.title}</strong><span class="sub">${copy.sub}</span><span class="cta">${copy.button} →</span>`;

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
