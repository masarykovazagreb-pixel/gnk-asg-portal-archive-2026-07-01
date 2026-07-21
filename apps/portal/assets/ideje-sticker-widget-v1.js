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
      bottom: max(92px, calc(env(safe-area-inset-bottom) + 92px));
      z-index: 9997;
      width: 190px;
      padding: 18px;
      border-radius: 22px;
      background: #c9ff66;
      color: #12211b;
      font-family: Arial, sans-serif;
      box-shadow: 0 14px 34px rgba(0,0,0,.22);
      text-decoration: none;
      display: block;
      transform: rotate(-4deg);
      animation: gnkIdejeFloat 7s ease-in-out infinite;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover,
    #${WIDGET_ID}:focus-visible {
      transform: rotate(-2deg) translateY(-4px);
      box-shadow: 0 18px 40px rgba(0,0,0,.28);
      outline: none;
    }
    #${WIDGET_ID} strong {
      display: block;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -.01em;
      margin-bottom: 3px;
    }
    #${WIDGET_ID} span.sub {
      display: block;
      font-size: .82rem;
      font-weight: 600;
      opacity: .82;
      margin-bottom: 12px;
    }
    #${WIDGET_ID} span.cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: .72rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .04em;
      background: #12211b;
      color: #c9ff66;
      padding: 8px 12px;
      border-radius: 999px;
    }
    @keyframes gnkIdejeFloat {
      0%, 100% { transform: rotate(-4deg) translateY(0); }
      50% { transform: rotate(-2deg) translateY(-10px); }
    }
    @media (max-width: 640px) {
      #${WIDGET_ID} { width: 160px; padding: 14px; }
      #${WIDGET_ID} strong { font-size: .95rem; }
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
