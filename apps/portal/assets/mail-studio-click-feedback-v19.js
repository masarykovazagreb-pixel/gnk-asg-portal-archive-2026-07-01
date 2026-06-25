(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_STUDIO_CLICK_FEEDBACK_V19__) return;
  window.__GNK_ASG_MAIL_STUDIO_CLICK_FEEDBACK_V19__ = true;

  const VERSION = 'GNK_ASG_MAIL_STUDIO_CLICK_FEEDBACK_V19_20260626';
  const LABELS = {
    send: { idle:'Pošalji', active:'Slanje…', done:'✓ Poslano' },
    save: { idle:'Spremi draft', active:'Spremanje…', done:'✓ Spremljeno' },
    load: { idle:'Učitaj draft', active:'Učitavanje…', done:'✓ Učitano' },
    helper: { idle:'Predložak', active:'Priprema…', done:'✓ Pripremljeno' },
    autoReply: { idle:'Auto odgovor', active:'Priprema…', done:'✓ Pripremljeno' },
    clear: { idle:'Očisti', active:'Čišćenje…', done:'✓ Očišćeno' }
  };

  const style = document.createElement('style');
  style.id = 'gnk-mail-studio-click-feedback-v19-style';
  style.textContent = `
    [data-gnk-v18-action]{
      position:relative!important;
      overflow:hidden!important;
      isolation:isolate;
      transform:translateY(0) scale(1);
      transition:transform .10s ease,box-shadow .16s ease,filter .16s ease,border-color .16s ease!important;
      box-shadow:0 5px 0 rgba(88,57,8,.72),0 10px 24px rgba(0,0,0,.28)!important;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
    }
    [data-gnk-v18-action]:hover{
      filter:brightness(1.12);
      border-color:#f4d37a!important;
      box-shadow:0 6px 0 rgba(88,57,8,.78),0 14px 28px rgba(0,0,0,.34),0 0 18px rgba(244,211,122,.18)!important;
    }
    [data-gnk-v18-action]:focus-visible{
      outline:3px solid rgba(244,211,122,.82)!important;
      outline-offset:3px!important;
    }
    [data-gnk-v18-action]:active,
    [data-gnk-v18-action].gnk-mail-is-pressed{
      transform:translateY(5px) scale(.985)!important;
      box-shadow:0 1px 0 rgba(88,57,8,.72),0 4px 10px rgba(0,0,0,.24)!important;
      filter:brightness(.96);
    }
    [data-gnk-v18-action].gnk-mail-click-ok{
      animation:gnkMailConfirmV19 .55s ease;
      border-color:#61e294!important;
      box-shadow:0 5px 0 rgba(18,96,55,.72),0 0 24px rgba(97,226,148,.35)!important;
    }
    [data-gnk-v18-action].gnk-mail-click-busy{
      cursor:progress!important;
      filter:saturate(.85);
    }
    .gnk-mail-ripple-v19{
      position:absolute;
      z-index:-1;
      border-radius:999px;
      pointer-events:none;
      background:radial-gradient(circle,rgba(255,255,255,.72) 0%,rgba(244,211,122,.34) 42%,rgba(244,211,122,0) 72%);
      transform:translate(-50%,-50%) scale(0);
      animation:gnkMailRippleV19 .52s ease-out forwards;
    }
    @keyframes gnkMailRippleV19{
      to{transform:translate(-50%,-50%) scale(1);opacity:0}
    }
    @keyframes gnkMailConfirmV19{
      0%{transform:translateY(3px) scale(.985)}
      45%{transform:translateY(-2px) scale(1.025)}
      100%{transform:translateY(0) scale(1)}
    }
    @media (prefers-reduced-motion:reduce){
      [data-gnk-v18-action],.gnk-mail-ripple-v19{transition:none!important;animation-duration:.01ms!important}
    }
  `;
  document.head.appendChild(style);

  const actionOf = button => String(button?.dataset?.gnkV18Action || '');
  const label = (button,state) => {
    const action = actionOf(button);
    const map = LABELS[action];
    if (!map) return;
    if (!button.dataset.gnkIdleLabel) button.dataset.gnkIdleLabel = button.textContent.trim() || map.idle;
    button.textContent = state === 'idle' ? button.dataset.gnkIdleLabel : map[state];
  };

  const ripple = (button,event) => {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width,rect.height) * 2.2;
    const node = document.createElement('span');
    node.className = 'gnk-mail-ripple-v19';
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.left = `${event.clientX ? event.clientX - rect.left : rect.width/2}px`;
    node.style.top = `${event.clientY ? event.clientY - rect.top : rect.height/2}px`;
    button.appendChild(node);
    setTimeout(() => node.remove(),600);
  };

  const press = (button,event) => {
    button.classList.add('gnk-mail-is-pressed');
    ripple(button,event);
    try { navigator.vibrate?.(18); } catch (_) {}
    setTimeout(() => button.classList.remove('gnk-mail-is-pressed'),150);
  };

  const confirm = (button) => {
    button.classList.remove('gnk-mail-click-busy');
    button.classList.add('gnk-mail-click-ok');
    label(button,'done');
    setTimeout(() => {
      button.classList.remove('gnk-mail-click-ok');
      label(button,'idle');
    },1100);
  };

  const bind = button => {
    if (!button || button.dataset.gnkClickFeedbackV19 === '1') return;
    button.dataset.gnkClickFeedbackV19 = '1';
    label(button,'idle');

    button.addEventListener('pointerdown',event => press(button,event),true);
    button.addEventListener('keydown',event => {
      if (event.key === 'Enter' || event.key === ' ') press(button,{clientX:0,clientY:0});
    },true);
    button.addEventListener('click',() => {
      const action = actionOf(button);
      button.classList.add('gnk-mail-click-busy');
      label(button,'active');
      if (action === 'send') {
        const status = document.getElementById('status');
        let cycles = 0;
        const watch = setInterval(() => {
          cycles += 1;
          const text = String(status?.textContent || '').toLowerCase();
          if (/poslana|poslano|evidentirana/.test(text)) {
            clearInterval(watch);
            confirm(button);
          } else if (/greška|nedostaje|nije prihvaćen/.test(text) || cycles > 80) {
            clearInterval(watch);
            button.classList.remove('gnk-mail-click-busy');
            label(button,'idle');
          }
        },100);
      } else {
        setTimeout(() => confirm(button),180);
      }
    },true);
  };

  const install = () => document.querySelectorAll('[data-gnk-v18-action]').forEach(bind);
  const boot = () => {
    install();
    const observer = new MutationObserver(install);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.documentElement.dataset.gnkMailClickFeedback = VERSION;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
