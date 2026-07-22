(() => {
  'use strict';

  const WIDGET_ID = 'gnk-synapse-flyer';
  if (document.getElementById(WIDGET_ID)) return;
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/synapse-demo') return;

  const isEnglish = document.documentElement.lang === 'en' || path.startsWith('/en/');
  const copy = isEnglish
    ? { flag: 'Demo', title: 'SYNAPSE — AI Agent 3D Simulation', cta: 'Try it' }
    : { flag: 'Demo', title: 'SYNAPSE — AI Agent 3D simulacija', cta: 'Isprobaj' };

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(14px, env(safe-area-inset-right));
      top: max(599px, calc(env(safe-area-inset-top) + 599px));
      left: auto;
      z-index: 9993;
      width: 91px;
      padding: 9px;
      border-radius: 11px;
      background: #062229;
      border: 1px solid #00f0ff;
      color: #d7fbff;
      font-family: Arial, sans-serif;
      box-shadow: 0 10px 26px rgba(0,240,255,.18);
      text-decoration: none;
      display: block;
      transform-origin: top center;
      transform: rotate(-3deg);
      animation: gnkSynapseSway 8s ease-in-out infinite;
      animation-delay: 3.2s;
      transition: box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover, #${WIDGET_ID}:focus-visible { box-shadow: 0 13px 30px rgba(0,240,255,.3); outline: none; }
    #${WIDGET_ID} .flag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .5rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase;
      color: #062229; background: #00f0ff; padding: 3px 6px; border-radius: 3px; margin-bottom: 6px;
    }
    #${WIDGET_ID} .flag::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: #062229; }
    #${WIDGET_ID} strong { display: block; font-size: .68rem; font-weight: 800; line-height: 1.3; margin-bottom: 6px; }
    #${WIDGET_ID} span.cta {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: .55rem; font-weight: 900; text-transform: uppercase; letter-spacing: .03em;
      color: #00f0ff;
    }
    @keyframes gnkSynapseSway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg); } }
    @media (max-width: 640px) { #${WIDGET_ID} { width: 77px; padding: 7px; top: max(567px, calc(env(safe-area-inset-top) + 567px)); right: max(40px, calc(env(safe-area-inset-right) + 26px)); } #${WIDGET_ID} strong { font-size: .6rem; } }
    @media (prefers-reduced-motion: reduce) { #${WIDGET_ID} { animation: none; } }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = '/synapse-demo/';
  link.setAttribute('aria-label', `${copy.title} — ${copy.cta}`);
  link.innerHTML = `<span class="flag">${copy.flag}</span><strong>${copy.title}</strong><span class="cta">${copy.cta} →</span>`;

  const mount = () => document.body.appendChild(link);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
