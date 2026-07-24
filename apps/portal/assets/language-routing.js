(() => {
  'use strict';
  const KEY = 'gnk_asg_language';
  const pathname = window.location.pathname;
  const isEnglishPage = /\/en(?:\/|$)/.test(pathname);

  // First-time visitor default: if no language choice has been made yet
  // and this HR page has a real English counterpart (declared via its own
  // <link rel="alternate" hreflang="en">), send them there once. If the
  // page has no English version, do nothing and let it stay in Croatian
  // (i18n.js's in-place text translation covers those pages instead).
  // Once a person has ever picked a language (auto or manual), KEY is set
  // and this redirect never fires again.
  if (!isEnglishPage) {
    let hasStoredPreference = true;
    try { hasStoredPreference = localStorage.getItem(KEY) !== null; } catch (error) {}
    if (!hasStoredPreference) {
      const enAlternate = document.querySelector('link[rel="alternate"][hreflang="en"]');
      const enHref = enAlternate && enAlternate.getAttribute('href');
      if (enHref) {
        try { localStorage.setItem(KEY, 'en'); } catch (error) {}
        window.location.replace(enHref);
        return;
      }
    }
  }

  const current = isEnglishPage ? 'en' : 'hr';
  try { localStorage.setItem(KEY, current); } catch (error) {}
  function applyCurrent() {
    if (window.GNK_LANG && typeof window.GNK_LANG.apply === 'function') {
      window.GNK_LANG.apply(current);
    }
  }
  function wire() {
    const buttons = document.querySelectorAll('.language-switch [data-lang]');
    if (!buttons.length) return false;
    applyCurrent();
    buttons.forEach(button => {
      const target = button.dataset.lang;
      const selected = target === current;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('aria-label', target === 'en' ? 'English' : 'Hrvatski');
      button.onclick = () => {
        try { localStorage.setItem(KEY, target); } catch (error) {}
        if (target === current) { applyCurrent(); return; }
        const anchor = window.location.hash || '';
        window.location.assign(target === 'en' ? '/en/' + anchor : '/' + anchor);
      };
    });
    return true;
  }
  if (!wire()) {
    const timer = setInterval(() => { if (wire()) clearInterval(timer); }, 80);
    setTimeout(() => clearInterval(timer), 5000);
  }
})();
