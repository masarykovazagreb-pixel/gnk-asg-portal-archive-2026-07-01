(() => {
  'use strict';
  const KEY = 'gnk_asg_language';
  const pathname = window.location.pathname;
  const isEnglishPage = /\/en(?:\/|$)/.test(pathname);
  const isAutomatedBrowser = navigator.webdriver === true;

  function hrefToSameOriginPath(href) {
    if (!href) return null;
    try {
      const resolved = new URL(href, window.location.href);
      let target = resolved.pathname + resolved.search + resolved.hash;
      target = target.replace(/\/en\/en(?:\/|$)/g, '/en/');
      return target || '/';
    } catch (error) {
      return null;
    }
  }

  function alternateHref(lang) {
    const alternate = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
    return alternate ? hrefToSameOriginPath(alternate.getAttribute('href')) : null;
  }

  function currentCanonicalPath() {
    const canonical = document.querySelector('link[rel="canonical"]');
    return hrefToSameOriginPath(canonical && canonical.getAttribute('href')) || (window.location.pathname + window.location.search + window.location.hash);
  }

  function targetFor(lang) {
    if (lang === (isEnglishPage ? 'en' : 'hr')) return currentCanonicalPath();
    return alternateHref(lang);
  }

  // First-time visitor default: redirect only when this exact HR page declares
  // a real EN counterpart. This keeps preview/test hosts on-origin and prevents
  // a generic /en/ fallback from masking a missing page-level translation.
  if (!isEnglishPage && !isAutomatedBrowser) {
    let hasStoredPreference = true;
    try { hasStoredPreference = localStorage.getItem(KEY) !== null; } catch (error) {}
    if (!hasStoredPreference) {
      const target = alternateHref('en');
      if (target) {
        try { localStorage.setItem(KEY, 'en'); } catch (error) {}
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

  // Legacy button-style language switch. Never route to a generic language
  // homepage when a page-level equivalent is missing: disable that choice so
  // a broken/mismatched pair cannot be presented as a valid switch.
  function wireButtons() {
    const buttons = document.querySelectorAll('.language-switch [data-lang]');
    if (!buttons.length) return false;
    applyCurrent();
    buttons.forEach(button => {
      const lang = button.dataset.lang;
      const selected = lang === current;
      const target = targetFor(lang);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('aria-label', lang === 'en' ? 'English' : 'Hrvatski');
      if (!selected && !target) {
        button.setAttribute('aria-disabled', 'true');
        button.onclick = event => event.preventDefault();
        return;
      }
      button.removeAttribute('aria-disabled');
      button.onclick = event => {
        event.preventDefault();
        try { localStorage.setItem(KEY, lang); } catch (error) {}
        if (selected) { applyCurrent(); return; }
        const next = targetFor(lang);
        if (next) window.location.assign(next);
      };
    });
    return true;
  }

  // Unified static header (.lang) is used by Aktual and many public pages.
  // Rewrite its hard-coded / and /en/ links from reciprocal hreflang metadata,
  // so /gnk-aktual/ <-> /en/gnk-aktual/ and every other declared pair stay on
  // the same logical page rather than jumping to a language homepage.
  function wireStaticLinks() {
    const links = document.querySelectorAll('.lang a');
    if (!links.length) return false;
    links.forEach(link => {
      const label = (link.getAttribute('aria-label') || link.textContent || '').toLowerCase();
      const lang = label.indexOf('english') !== -1 || /^\s*en\s*$/i.test(link.textContent || '') ? 'en' : 'hr';
      const selected = lang === current;
      const target = targetFor(lang);
      if (selected) {
        link.href = currentCanonicalPath();
        link.setAttribute('aria-current', 'page');
      } else if (target) {
        link.href = target;
        link.removeAttribute('aria-disabled');
        link.removeAttribute('aria-current');
        link.onclick = () => { try { localStorage.setItem(KEY, lang); } catch (error) {} };
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.removeAttribute('aria-current');
        link.onclick = event => event.preventDefault();
      }
    });
    return true;
  }

  function wire() {
    const a = wireButtons();
    const b = wireStaticLinks();
    return a || b;
  }

  if (!wire()) {
    const timer = setInterval(() => { if (wire()) clearInterval(timer); }, 80);
    setTimeout(() => clearInterval(timer), 5000);
  }
})();
