(() => {
  'use strict';
  const path = location.pathname.toLowerCase().replace(/\/+/g, '/');
  const privatePage = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
  if (privatePage) return;

  const isIndex = path === '/' || path === '/en' || path === '/en/';
  const params = new URLSearchParams(location.search);
  const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status') || ((path.startsWith('/visual-index') || path.startsWith('/app')) && params.get('lang') === 'en');

  function install() {
    let button = document.getElementById('gnk-floating-home-v16');
    if (isIndex) {
      if (button) button.remove();
      return;
    }
    if (!document.getElementById('gnk-floating-home-v16-style')) {
      const style = document.createElement('style');
      style.id = 'gnk-floating-home-v16-style';
      style.textContent = '#gnk-floating-home-v16{position:fixed!important;left:14px!important;bottom:14px!important;z-index:2147482500!important;display:inline-flex!important;align-items:center!important;gap:8px!important;min-height:42px!important;padding:8px 13px!important;border:1px solid #d7aa3c!important;border-radius:999px!important;background:linear-gradient(145deg,#e4ba50,#9b6715)!important;color:#06101d!important;text-decoration:none!important;font:950 10px/1 Arial,sans-serif!important;letter-spacing:.055em!important;text-transform:uppercase!important;box-shadow:0 16px 44px rgba(0,0,0,.42)!important}#gnk-floating-home-v16:hover{background:linear-gradient(145deg,#ffe397,#c88c24)!important;transform:translateY(-2px)!important}@media(max-width:620px){#gnk-floating-home-v16{left:9px!important;bottom:9px!important;min-height:38px!important;padding:7px 11px!important;font-size:8.5px!important}}';
      document.head.appendChild(style);
    }
    if (!button) {
      button = document.createElement('a');
      button.id = 'gnk-floating-home-v16';
      document.body.appendChild(button);
    }
    button.href = english ? '/en/' : '/';
    button.setAttribute('aria-label', english ? 'Return to Home' : 'Povratak na početnu stranicu');
    button.innerHTML = '<span aria-hidden="true">⌂</span><strong>' + (english ? 'Home' : 'Početna') + '</strong>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  window.addEventListener('load', install, { once:true });
})();
