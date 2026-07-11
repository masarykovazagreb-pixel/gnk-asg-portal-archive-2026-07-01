(() => {
  'use strict';
  const isEnglish = () => /\/en(?:\/|$)/.test(window.location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  function labels() {
    return isEnglish() ? {
      finance:'Financials', network:'Global Network', technology:'Technology & AI', markets:'Markets', news:'News', desk:'Intelligence Desk', registers:'Public Registers', documents:'Documents', mail:'Webmail', install:'Install app', control:'Control'
    } : {
      finance:'Financije', network:'Globalna mreža', technology:'Tehnologija i AI', markets:'Tržišta', news:'Vijesti', desk:'Intelligence Desk', registers:'Javni registri', documents:'Dokumenti', mail:'Webmail', install:'Instaliraj aplikaciju', control:'Upravljanje'
    };
  }
  function renderMenu() {
    const nav = document.getElementById('navLinks');
    if (!nav) return;
    nav.querySelectorAll(':scope > a').forEach(link => link.classList.add('desktop-nav-link'));
    let mobile = nav.querySelector('.mobile-menu-links');
    if (!mobile) {
      mobile = document.createElement('div');
      mobile.className = 'mobile-menu-links';
      nav.prepend(mobile);
    }
    const t = labels();
    mobile.innerHTML = '<a class="primary" href="#assistant">' + t.desk + '</a>' +
      '<a href="#global-network">' + t.network + '</a>' +
      '<a href="#financials">' + t.finance + '</a>' +
      '<a href="#technology">' + t.technology + '</a>' +
      '<a href="#digital-assets">' + t.markets + '</a>' +
      '<a href="#news">' + t.news + '</a>' +
      '<a href="#publicSources">' + t.registers + '</a>' +
      '<a href="#dokumenti">' + t.documents + '</a>' +
      '<a href="/webmail/">' + t.mail + '</a>' +
      '<a href="/instalacija/">' + t.install + '</a>' +
      '<a class="management-link" href="/admin/">' + t.control + '</a>';
    mobile.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));
  }
  function removeLegacyFloatingHome() {
    document.querySelectorAll('.float-home, .mobile-home').forEach(home => home.remove());
  }
  function init() {
    renderMenu();
    removeLegacyFloatingHome();
    window.addEventListener('gnk-language-change', renderMenu);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
