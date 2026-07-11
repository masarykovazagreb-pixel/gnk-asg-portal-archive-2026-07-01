(() => {
  'use strict';
  const english = () => window.GNK_LANG && window.GNK_LANG.get() === 'en';
  function update(trigger) {
    trigger.innerHTML = '<span>✦</span> ' + (english() ? 'INTELLIGENCE DESK' : 'INTELLIGENCE DESK');
    trigger.setAttribute('aria-label', english() ? 'Open GNK ASG Intelligence Desk' : 'Otvori GNK ASG Intelligence Desk');
  }
  function init() {
    if (document.querySelector('.float-chat-trigger')) return;
    const trigger = document.createElement('button');
    trigger.className = 'float-chat-trigger';
    trigger.type = 'button';
    update(trigger);
    trigger.onclick = () => {
      const desk = document.getElementById('assistant');
      if (desk) {
        desk.scrollIntoView({behavior:'smooth', block:'start'});
        window.setTimeout(() => document.getElementById('deskInput')?.focus(), 420);
      }
    };
    document.body.appendChild(trigger);
    window.addEventListener('gnk-language-change', () => update(trigger));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
