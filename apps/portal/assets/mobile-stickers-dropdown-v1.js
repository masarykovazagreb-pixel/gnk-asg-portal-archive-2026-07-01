(() => {
  'use strict';

  const WIDGET_ID = 'gnk-mobile-stickers-dropdown';
  if (document.getElementById(WIDGET_ID)) return;

  const isEnglish = document.documentElement.lang === 'en' || location.pathname.startsWith('/en/');
  const label = isEnglish ? 'Stickers' : 'Stikeri';

  const items = [
    { name: 'AKTUAL MEDIA', href: '/gnk-aktual/', color: '#ff6b6b' },
    { name: 'Ideje u djelovanju', href: '/ideje-u-djelovanju/', color: '#c9ff66' },
    { name: 'Puls Tržišta', href: '/puls-trzista/', color: '#a78bfa' },
    { name: 'SYNAPSE', href: '/synapse-demo/', color: '#00f0ff' },
    { name: 'Nilus Bio', href: '/nilus-bio/', color: '#fcd34d' },
    { name: 'GNK DINAMO Digital Solutions', href: '/digital-solutions/', color: '#2563eb' },
    { name: 'Tržišne krize', href: '/trzisne-krize/', color: '#fbbf24' },
    { name: 'Pulse — Command Center', href: '/pulse-demo/', color: '#29d5a1' }
  ];

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} { display: none; }
    @media (max-width: 640px) {
      #${WIDGET_ID} {
        display: inline-flex;
        position: relative;
      }
      #${WIDGET_ID} .trigger {
        font: 800 .72rem/1 Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: .04em;
        padding: 9px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.35);
        background: rgba(255,255,255,.08);
        color: inherit;
        cursor: pointer;
      }
      #${WIDGET_ID} .panel {
        display: none;
        position: fixed;
        top: 60px;
        right: 14px;
        left: 14px;
        z-index: 2147483000;
        background: #0b1220;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 14px;
        box-shadow: 0 20px 50px rgba(0,0,0,.5);
        padding: 8px;
        max-height: 70vh;
        overflow-y: auto;
      }
      #${WIDGET_ID} .panel.open { display: block; }
      #${WIDGET_ID} .panel a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 12px;
        border-radius: 10px;
        color: #fff;
        text-decoration: none;
        font: 700 .82rem/1.2 Arial, sans-serif;
      }
      #${WIDGET_ID} .panel a:hover,
      #${WIDGET_ID} .panel a:focus-visible { background: rgba(255,255,255,.08); }
      #${WIDGET_ID} .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      #${WIDGET_ID} .backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 2147482999;
        background: rgba(0,0,0,.35);
      }
      #${WIDGET_ID} .backdrop.open { display: block; }
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = WIDGET_ID;

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'trigger';
  trigger.textContent = label;
  trigger.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'menu');
  panel.innerHTML = items.map(item =>
    `<a href="${item.href}" role="menuitem"><span class="dot" style="background:${item.color}"></span>${item.name}</a>`
  ).join('');

  function toggle() {
    const isOpen = panel.classList.toggle('open');
    backdrop.classList.toggle('open', isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
  }
  function close() {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', toggle);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  wrap.append(trigger, panel);

  function mount() {
    const actions = document.querySelector('#gnk-unified-menu .actions');
    if (!actions) {
      // Header may not be built yet (menu script runs slightly later); retry briefly.
      let attempts = 0;
      const retry = setInterval(() => {
        attempts++;
        const found = document.querySelector('#gnk-unified-menu .actions');
        if (found) {
          clearInterval(retry);
          found.insertBefore(wrap, found.querySelector('.toggle'));
          document.body.appendChild(backdrop);
        } else if (attempts > 40) {
          clearInterval(retry);
          document.body.appendChild(wrap);
          document.body.appendChild(backdrop);
        }
      }, 100);
      return;
    }
    actions.insertBefore(wrap, actions.querySelector('.toggle'));
    document.body.appendChild(backdrop);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
