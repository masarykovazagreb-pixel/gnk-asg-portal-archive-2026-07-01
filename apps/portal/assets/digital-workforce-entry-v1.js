(() => {
  'use strict';

  function addLink(nav, href, label, beforeSelector) {
    if (!nav || nav.querySelector('a[href="' + href + '"]')) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    const before = beforeSelector ? nav.querySelector(beforeSelector) : null;
    nav.insertBefore(link, before || null);
  }

  function install() {
    const english = /(^|\/)en(\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
    const publicNav = document.getElementById('navLinks');
    addLink(publicNav, '/digital-workforce/', english ? 'Digital Workforce' : 'Digitalna radna snaga', 'a[href="#dokumenti"],a[href="#documents"]');

    const adminNav = document.querySelector('.admin-page .nav-links');
    addLink(adminNav, '/digital-workforce/', 'Digitalna radna snaga');
    addLink(adminNav, '/editor-desk/', 'Editor Desk');

    document.querySelectorAll('[data-digital-workforce-entry]').forEach((node) => {
      node.setAttribute('href', '/digital-workforce/');
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install) : install();
  window.addEventListener('gnk-language-change', install);
})();
