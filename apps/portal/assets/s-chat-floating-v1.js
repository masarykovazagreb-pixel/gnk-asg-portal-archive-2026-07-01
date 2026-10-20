/* GNK ASG S+Chat floating entry — shared by public menu and the protected home-page script. */
(() => {
  'use strict';
  if (window.__GNK_SCHAT_FLOAT_V1__) return;
  window.__GNK_SCHAT_FLOAT_V1__ = true;

  function init() {
    if (/^\/(?:s-chat|radio\/player)(?:\/|$)/.test(location.pathname)) return;
    if (!document.getElementById('gnk-splus-floating-button')) {
      const style = document.createElement('style');
      style.id = 'gnk-splus-floating-style';
      style.textContent = [
        '#gnk-splus-floating-button{position:fixed;right:20px;bottom:92px;z-index:9000;display:inline-flex;align-items:center;gap:9px;min-height:48px;padding:12px 17px;border-radius:999px;color:#fff;background:linear-gradient(135deg,#0d4c48,#166e68);border:1px solid #c7aa72;box-shadow:0 8px 28px #0007;font:700 14px system-ui,sans-serif;text-decoration:none;letter-spacing:.01em}',
        '#gnk-splus-floating-button:hover,#gnk-splus-floating-button:focus-visible{background:#1e7770;color:#fff;box-shadow:0 10px 30px #0009;outline-offset:3px}',
        '#gnk-splus-floating-button .splus-star{color:#f1d89c;font-size:21px;line-height:1}',
        '@media(max-width:600px){#gnk-splus-floating-button{right:12px;bottom:95px;padding:11px 13px;font-size:12px;min-height:44px}}',
        '@media(prefers-reduced-motion:reduce){#gnk-splus-floating-button{transition:none}}'
      ].join('');
      document.head.appendChild(style);
      const link = document.createElement('a');
      link.id = 'gnk-splus-floating-button';
      link.href = '/s-chat/';
      link.setAttribute('aria-label','Otvori GNK ASG S+Chat — AI razgovor');
      link.title = 'GNK ASG S+Chat · Powered by GNK ASG';
      const icon = document.createElement('span'); icon.className='splus-star'; icon.textContent='✦'; icon.setAttribute('aria-hidden','true');
      const label = document.createElement('span'); label.textContent='GNK ASG S+Chat';
      link.append(icon,label);
      document.body.appendChild(link);
    }

    // On the protected homepage replace the old inline form with a link,
    // without editing apps/portal/index.html or introducing a second API.
    if (['/','/index.html','/en/','/en','/en/index.html'].includes(location.pathname)) {
      const form = document.getElementById('chatForm');
      if (form && !document.getElementById('gnk-splus-home-button')) {
        form.style.display = 'none';
        const anchor=document.createElement('a');
        anchor.id='gnk-splus-home-button';
        anchor.href='/s-chat/';
        anchor.textContent=location.pathname.startsWith('/en')?'OPEN GNK ASG S+CHAT →':'OTVORI GNK ASG S+CHAT →';
        anchor.setAttribute('aria-label','Otvori zasebnu stranicu GNK ASG S+Chat');
        anchor.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 22px;border-radius:12px;background:linear-gradient(130deg,#146b5d,#259b86);color:#fff;font-weight:800;text-decoration:none;margin:15px 0;box-shadow:0 5px 24px rgba(7,79,68,.25)';
        form.insertAdjacentElement('afterend',anchor);
        const messages=document.querySelector('#assistant .messages');
        if(messages)messages.textContent='GNK ASG S+Chat — zaseban prostor za razgovore, pisanje i analizu. Powered by GNK ASG.';
        const heading=document.querySelector('#assistant h2');
        if(heading)heading.textContent='GNK ASG S+Chat';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
