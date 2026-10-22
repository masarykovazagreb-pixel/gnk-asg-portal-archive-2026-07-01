/* AKTUAL MEDIA — ponašanje najave proizvoda.
 *
 * Pravila:
 *  - najava se otvara sama najviše jednom po sesiji (sessionStorage),
 *  - „Ne prikazuj više" pamti se trajno (localStorage), bez kolačića,
 *  - „Kasnije" zatvara samo ovu sesiju,
 *  - Esc, klik na podlogu i gumb × zatvaraju; fokus se vraća tamo gdje je bio,
 *  - bez JS-a nema ničega: sadržaj je u HTML-u, ali skriven (`hidden`),
 *  - ne dira glavnu sliku ni tijek stranice — sloj je fiksan i odvojen.
 */
(function () {
  'use strict';

  var MODAL = 'amPromoModal';
  var TOP = 'amPromoTop';
  var SHOWN_KEY = 'am-promo-v1:shown';
  var NEVER_KEY = 'am-promo-v1:never';
  var DELAY = 7000;

  function store(kind, key, value) {
    try {
      var s = kind === 'local' ? window.localStorage : window.sessionStorage;
      if (value === undefined) return s.getItem(key);
      s.setItem(key, value);
      return value;
    } catch (err) {
      return null;
    }
  }

  function alreadySeen() {
    return store('local', NEVER_KEY) === '1' || store('session', SHOWN_KEY) === '1';
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var modal = document.getElementById(MODAL);
    if (!modal) return;

    var card = modal.querySelector('.am-promo-card');
    var closeButtons = modal.querySelectorAll('[data-am-promo-close]');
    var neverButton = modal.querySelector('[data-am-promo-never]');
    var lastFocus = null;
    var opened = false;

    function focusables() {
      if (!card) return [];
      return Array.prototype.filter.call(
        card.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null || el === document.activeElement; }
      );
    }

    function close(remember) {
      if (!opened) return;
      opened = false;
      modal.hidden = true;
      document.documentElement.classList.remove('am-promo-open');
      if (remember === 'never') store('local', NEVER_KEY, '1');
      store('session', SHOWN_KEY, '1');
      if (lastFocus && typeof lastFocus.focus === 'function') {
        try { lastFocus.focus({ preventScroll: true }); } catch (err) { lastFocus.focus(); }
      }
    }

    function open() {
      if (opened || alreadySeen()) return;
      opened = true;
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.documentElement.classList.add('am-promo-open');
      store('session', SHOWN_KEY, '1');
      var first = modal.querySelector('.am-promo-x') || (focusables()[0]);
      if (first) {
        try { first.focus({ preventScroll: true }); } catch (err) { first.focus(); }
      }
    }

    Array.prototype.forEach.call(closeButtons, function (el) {
      el.addEventListener('click', function (event) {
        event.preventDefault();
        close();
      });
    });

    if (neverButton) {
      neverButton.addEventListener('click', function (event) {
        event.preventDefault();
        close('never');
      });
    }

    document.addEventListener('keydown', function (event) {
      if (!opened) return;
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (alreadySeen()) return;

    /* 1) mirna najava nakon nekoliko sekundi čitanja */
    var timer = window.setTimeout(open, DELAY);

    /* 2) ili odmah kad čitatelj krene prema gore (izlazni pokret) */
    function onExitIntent(event) {
      if (event.clientY <= 0) {
        window.clearTimeout(timer);
        open();
        document.removeEventListener('mouseout', onExitIntent);
      }
    }
    document.addEventListener('mouseout', onExitIntent);

    /* 3) ako je kartica skrivena, ne otvaraj na silu */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearTimeout(timer);
      else if (!alreadySeen()) timer = window.setTimeout(open, 4000);
    });

    /* ---------- prozorčići: tiho „iskaču" kad uđu u vidno polje ---------- */
    var wins = document.querySelectorAll('.am-win');
    if (wins.length) {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
        Array.prototype.forEach.call(wins, function (el) { io.observe(el); });
      } else {
        Array.prototype.forEach.call(wins, function (el) { el.classList.add('is-in'); });
      }
    }

    /* ---------- lebdeća reklama: tri proizvoda u rotaciji ---------- */
    var ad = document.getElementById('amAd');
    if (ad && store('session', 'am-ad-v1:hidden') !== '1' && store('local', 'am-ad-v1:never') !== '1') {
      var adItems = Array.prototype.slice.call(ad.querySelectorAll('[data-am-ad-item]'));
      var adDots = Array.prototype.slice.call(ad.querySelectorAll('.am-ad-dots i'));
      var adIndex = 0;
      var adTimer = null;
      var adShown = false;

      function paintAd() {
        adItems.forEach(function (el, i) { el.hidden = i !== adIndex; });
        adDots.forEach(function (el, i) { el.classList.toggle('on', i === adIndex); });
      }

      function rotateAd() {
        if (!adItems.length) return;
        adIndex = (adIndex + 1) % adItems.length;
        paintAd();
      }

      function startAd() {
        if (adTimer) window.clearInterval(adTimer);
        adTimer = window.setInterval(rotateAd, 9000);
      }

      function stopAd() {
        if (adTimer) window.clearInterval(adTimer);
        adTimer = null;
      }

      function showAd() {
        if (adShown || document.hidden || opened) return;
        adShown = true;
        ad.hidden = false;
        paintAd();
        startAd();
      }

      var adClose = ad.querySelector('[data-am-ad-close]');
      if (adClose) {
        adClose.addEventListener('click', function () {
          ad.hidden = true;
          stopAd();
          store('session', 'am-ad-v1:hidden', '1');
        });
      }

      ad.addEventListener('mouseenter', stopAd);
      ad.addEventListener('mouseleave', startAd);
      ad.addEventListener('focusin', stopAd);
      ad.addEventListener('focusout', startAd);

      var adDue = Date.now() + 12000;
      window.setTimeout(showAd, 12000);

      /* Ako je u trenutku dospijeća bila otvorena velika najava, reklama se
         pojavljuje odmah nakon zatvaranja — ali nikad prije 12 s. */
      var adRetry = window.setInterval(function () {
        if (adShown || Date.now() < adDue) { if (adShown) window.clearInterval(adRetry); return; }
        if (!document.documentElement.classList.contains('am-promo-open')) showAd();
      }, 3000);

      /* Dok je velika najava otvorena, reklama se ne pojavljuje preko nje. */
      var adWatch = window.setInterval(function () {
        if (document.documentElement.classList.contains('am-promo-open') && !ad.hidden) {
          ad.hidden = true;
          stopAd();
        }
      }, 500);
      window.addEventListener('pagehide', function () { window.clearInterval(adWatch); stopAd(); }, { once: true });
    }

    /* Traka na vrhu: označi aktivnu stranicu ako je jedna od ponuđenih. */
    var top = document.getElementById(TOP);
    if (top) {
      Array.prototype.forEach.call(top.querySelectorAll('a[href]'), function (link) {
        try {
          var url = new URL(link.getAttribute('href'), location.href);
          if (url.origin === location.origin && url.pathname === location.pathname) {
            link.setAttribute('aria-current', 'page');
          }
        } catch (err) { /* relativni linkovi bez URL-a nisu kritični */ }
      });
    }
  });
})();
