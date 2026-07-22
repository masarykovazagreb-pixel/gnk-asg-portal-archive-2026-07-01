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
      right: max(14px, env(safe-area-inset-right));
      top: max(115px, calc(env(safe-area-inset-top) + 115px));
      left: auto;
      bottom: auto;
      z-index: 9997;
      width: 114px;
      padding: 11px;
      border-radius: 13px;
      background: #c9ff66;
      color: #12211b;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 20px rgba(0,0,0,.22);
      text-decoration: none;
      display: block;
      transform-origin: top center;
      transform: rotate(-6deg);
      animation: gnkIdejeSway 4.5s ease-in-out infinite;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover,
    #${WIDGET_ID}:focus-visible {
      box-shadow: 0 11px 24px rgba(0,0,0,.28);
      outline: none;
    }
    #${WIDGET_ID} strong {
      display: block;
      font-size: .7rem;
      font-weight: 800;
      letter-spacing: -.01em;
      margin-bottom: 2px;
    }
    #${WIDGET_ID} span.sub {
      display: block;
      font-size: .55rem;
      font-weight: 600;
      opacity: .82;
      margin-bottom: 7px;
    }
    #${WIDGET_ID} span.cta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: .48rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .04em;
      background: #12211b;
      color: #c9ff66;
      padding: 5px 7px;
      border-radius: 999px;
    }
    @keyframes gnkIdejeSway {
      0%, 100% { transform: rotate(-6deg); }
      50% { transform: rotate(5deg); }
    }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 96px; padding: 8px; top: max(103px, calc(env(safe-area-inset-top) + 103px)); }
      #${WIDGET_ID} strong { font-size: .62rem; }
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
