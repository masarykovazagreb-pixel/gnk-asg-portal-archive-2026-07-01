(() => {
  'use strict';

  const WIDGET_ID = 'gnk-header-whatsapp';
  if (document.getElementById(WIDGET_ID)) return;

  const PHONE_E164 = '385915358365';
  const isEnglish = document.documentElement.lang === 'en';
  const defaultMessage = isEnglish
    ? 'Hello, I would like more information about GNK ASG d.o.o.'
    : 'Pozdrav, zanima me više informacija o GNK ASG d.o.o.';

  const style = document.createElement('style');
  style.id = `${WIDGET_ID}-style`;
  style.textContent = `
    #${WIDGET_ID} { display: none; }
    @media (max-width: 650px) {
      #${WIDGET_ID} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #25d366;
        flex-shrink: 0;
      }
      #${WIDGET_ID} svg { width: 18px; height: 18px; fill: #fff; }
    }
  `;
  document.head.appendChild(style);

  const link = document.createElement('a');
  link.id = WIDGET_ID;
  link.href = `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(defaultMessage)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', isEnglish
    ? 'Contact GNK ASG via WhatsApp'
    : 'Kontaktirajte GNK ASG putem WhatsAppa');
  link.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.872 6.416L4 29l7.77-1.837A11.93 11.93 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.818a9.77 9.77 0 0 1-4.978-1.363l-.357-.212-4.61 1.09 1.226-4.49-.232-.367A9.76 9.76 0 0 1 6.182 15c0-5.418 4.401-9.818 9.819-9.818S25.818 9.582 25.818 15 21.419 24.818 16.001 24.818zm5.383-7.34c-.294-.148-1.74-.858-2.01-.957-.27-.099-.467-.148-.664.148-.196.295-.759.957-.93 1.153-.172.196-.343.221-.637.074-.294-.148-1.243-.458-2.368-1.462-.876-.782-1.467-1.748-1.639-2.043-.172-.295-.018-.454.13-.601.134-.133.294-.344.442-.516.147-.172.196-.295.294-.492.098-.196.049-.369-.024-.516-.074-.148-.664-1.6-.91-2.19-.24-.577-.484-.5-.664-.51l-.566-.01c-.196 0-.516.074-.786.369-.27.295-1.03 1.006-1.03 2.454s1.055 2.847 1.202 3.043c.147.196 2.077 3.171 5.032 4.446.703.303 1.251.484 1.679.62.705.224 1.347.192 1.854.117.566-.084 1.74-.712 1.985-1.399.245-.688.245-1.277.172-1.4-.074-.123-.27-.196-.564-.344z"/></svg>';

  function mount() {
    const actions = document.querySelector('#gnk-unified-menu .actions');
    if (!actions) {
      let attempts = 0;
      const retry = setInterval(() => {
        attempts++;
        const found = document.querySelector('#gnk-unified-menu .actions');
        if (found) {
          clearInterval(retry);
          found.insertBefore(link, found.querySelector('.toggle'));
        } else if (attempts > 40) {
          clearInterval(retry);
          document.body.appendChild(link);
        }
      }, 100);
      return;
    }
    actions.insertBefore(link, actions.querySelector('.toggle'));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
