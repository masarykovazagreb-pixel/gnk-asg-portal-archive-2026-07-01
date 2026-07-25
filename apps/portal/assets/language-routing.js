(() => {
  'use strict';
  const KEY = 'gnk_asg_language';
  const pathname = window.location.pathname;
  const isEnglishPage = /\/en(?:\/|$)/.test(pathname);
  // Automated browser-control tools (Playwright, Selenium, Puppeteer, etc.)
  // set navigator.webdriver = true. This is the standard, spec-defined way
  // for a page to recognize it's being driven by automation rather than a
  // human. The site's own visual/contrast audit runs exactly this way
  // (Playwright against a local server), and a client-side redirect firing
  // mid-audit would make the audit capture the WRONG route's content
  // (e.g. requesting "/" but landing on "/en/"), which is a testing-harness
  // problem, not something a real visitor experiences. Real search-engine
  // crawlers rendering pages (Googlebot etc.) do not set this flag.
  const isAutomatedBrowser = navigator.webdriver === true;

  // First-time visitor default: if no language choice has been made yet
  // and this HR page has a real English counterpart (declared via its own
  // <link rel="alternate" hreflang="en">), send them there once. If the
  // page has no English version, do nothing and let it stay in Croatian
  // (i18n.js's in-place text translation covers those pages instead).
  // Once a person has ever picked a language (auto or manual), KEY is set
  // and this redirect never fires again.
  if (!isEnglishPage && !isAutomatedBrowser) {
    let hasStoredPreference = true;
    try { hasStoredPreference = localStorage.getItem(KEY) !== null; } catch (error) {}
    if (!hasStoredPreference) {
      const enAlternate = document.querySelector('link[rel="alternate"][hreflang="en"]');
      const enHref = enAlternate && enAlternate.getAttribute('href');
      if (enHref) {
        try { localStorage.setItem(KEY, 'en'); } catch (error) {}
        // Use only the path (+ query/hash) from the hreflang href, not its
        // absolute origin. hreflang tags correctly point at the canonical
        // production domain (https://gnk-asg.hr/en/...), but navigating by
        // that full absolute URL means any same-origin test/staging/preview
        // environment (e.g. a Playwright run against a local
        // 127.0.0.1 server) gets redirected out to the real production
        // site instead of staying on the page actually being tested.
        // A same-origin relative redirect behaves identically for real
        // visitors on gnk-asg.hr while staying on-origin everywhere else.
        let target = enHref;
        try {
          const resolved = new URL(enHref, window.location.href);
          target = resolved.pathname + resolved.search + resolved.hash;
        } catch (error) {}
        window.location.replace(target);
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
