(() => {
  'use strict';
  if (window.__GNK_ASG_MAIL_SIGNATURE_CONTACT_V1__) return;
  window.__GNK_ASG_MAIL_SIGNATURE_CONTACT_V1__ = true;

  const number = '+385 (0) 916104398';
  const icon = '<svg aria-label="WhatsApp" viewBox="0 0 24 24" width="1em" height="1em" style="display:inline-block;vertical-align:-0.15em;margin-left:.25em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9.1 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.1.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6 0l.8-.6c.2-.2.5-.2.7-.1l1.8.8c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.5.3-1.2.6-2 .5-1.3-.1-3.3-.8-5.2-2.7-1.9-1.9-2.6-3.9-2.7-5.2 0-.8.2-1.5.5-2Z"/></svg>';
  const replacement = `☎ ${number} ${icon}`;

  function patch() {
    document.querySelectorAll('.signature, #preview').forEach(node => {
      const next = node.innerHTML
        .replace(/(?:Telefon|Kontakt):\s*091\s*535\s*8365/gi,replacement)
        .replace(/091\s*535\s*8365/g,number);
      if (next !== node.innerHTML) node.innerHTML = next;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',patch,{once:true});
  else patch();
  new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});
})();
