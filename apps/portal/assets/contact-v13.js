(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'');
  if(path!=='/contact'&&path!=='/en/contact')return;
  document.body.classList.add('gnk-contact-v13');
  document.querySelectorAll('body>header,.site-header,.floating-home,.floating-ai').forEach(node=>{node.setAttribute('aria-hidden','true');node.style.display='none'});
  document.querySelectorAll('input,select,textarea').forEach(field=>field.setAttribute('autocomplete',field.getAttribute('autocomplete')||'off'));
  if(!document.querySelector('script[src*="contact-parity-v1.js"]')){
    const parity=document.createElement('script');
    parity.src='/assets/contact-parity-v1.js?v=20260628-v1';
    document.head.appendChild(parity);
  }
})();
