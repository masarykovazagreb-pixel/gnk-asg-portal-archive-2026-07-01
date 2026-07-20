(() => {
  'use strict';

  const WIDGET_ID = 'gnk-whatsapp-fab';
  const PHONE_E164 = '385915358365';
  const DEFAULT_MESSAGE = 'Pozdrav, zanima me više informacija o GNK ASG d.o.o.';

  if (document.getElementById(WIDGET_ID)) return;

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} {
      position: fixed;
      right: max(16px, env(safe-area-inset-right));
      bottom: max(16px, env(safe-area-inset-bottom));
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #25d366;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .34);
      z-index: 9999;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #${WIDGET_ID}:hover,
    #${WIDGET_ID}:focus-visible {
      transform: translateY(-2px) scale(1.06);
      box-shadow: 0 12px 30px rgba(0, 0, 0, .42);
      outline: 3px solid rgba(255, 255, 255, .9);
      outline-offset: 3px;
    }
    #${WIDGET_ID} svg { width: 28px; height: 28px; fill: #fff; }
    @media (max-width: 480px) {
      #${WIDGET_ID} { width: 50px; height: 50px; }
      #${WIDGET_ID} svg { width: 25px; height: 25px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${WIDGET_ID} { transition: none; }
    }
  `;

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', document.documentElement.lang === 'en'
    ? 'Contact GNK ASG via WhatsApp'
    : 'Kontaktirajte GNK ASG putem WhatsAppa');
  link.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.872 6.416L4 29l7.77-1.837A11.93 11.93 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.818a9.77 9.77 0 0 1-4.978-1.363l-.357-.212-4.61 1.09 1.226-4.49-.232-.367A9.76 9.76 0 0 1 6.182 15c0-5.418 4.401-9.818 9.819-9.818S25.818 9.582 25.818 15 21.419 24.818 16.001 24.818zm5.383-7.34c-.294-.148-1.74-.858-2.01-.957-.27-.099-.467-.148-.664.148-.196.295-.759.957-.93 1.153-.172.196-.343.221-.637.074-.294-.148-1.243-.458-2.368-1.462-.876-.782-1.467-1.748-1.639-2.043-.172-.295-.018-.454.13-.601.134-.133.294-.344.442-.516.147-.172.196-.295.294-.492.098-.196.049-.369-.024-.516-.074-.148-.664-1.6-.91-2.19-.24-.577-.484-.5-.664-.51l-.566-.01c-.196 0-.516.074-.786.369-.27.295-1.03 1.006-1.03 2.454s1.055 2.847 1.202 3.043c.147.196 2.077 3.171 5.032 4.446.703.303 1.251.484 1.679.62.705.224 1.347.192 1.854.117.566-.084 1.74-.712 1.985-1.399.245-.688.245-1.277.172-1.4-.074-.123-.27-.196-.564-.344z"/></svg>';

  document.head.appendChild(style);
  document.body.appendChild(link);
})();
