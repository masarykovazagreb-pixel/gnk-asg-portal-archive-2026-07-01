/* AKTUAL MEDIA — index podium.
   Progresivno poboljšanje: zagrijava sljedeću stranicu kad korisnik pokaže
   namjeru (hover, dodir, fokus) na krug grada ili karticu deska.
   Bez JS-a stranica radi potpuno isto; ovo samo skraćuje prvi klik. */
(function () {
  'use strict';
  // Launch the same S+Chat floating component used by AKTUAL, without editing
  // the protected home-page HTML.
  if (!document.querySelector('script[data-gnk-splus-float]')) {
    var chatScript = document.createElement('script');
    chatScript.src = '/assets/s-chat-floating-v1.js?v=20261020';
    chatScript.dataset.gnkSplusFloat = '1';
    document.head.appendChild(chatScript);
  }
  var section = document.getElementById('aktual-izdanja');
  if (!section || !document.createElement) return;

  var warmed = Object.create(null);

  function warm(href) {
    if (!href || href.charAt(0) !== '/' || warmed[href]) return;
    warmed[href] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = href;
    document.head.appendChild(link);
  }

  function target(event) {
    var node = event.target;
    while (node && node !== section) {
      if (node.tagName === 'A') return node.getAttribute('href');
      node = node.parentNode;
    }
    return '';
  }

  function onIntent(event) {
    warm(target(event));
  }

  ['pointerover', 'touchstart', 'focusin'].forEach(function (type) {
    section.addEventListener(type, onIntent, { passive: true });
  });
})();
