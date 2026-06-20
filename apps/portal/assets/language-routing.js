(() => {
  'use strict';
  const KEY = 'gnk_asg_language';
  const pathname = window.location.pathname;
  const isEnglishPage = /\/en(?:\/|$)/.test(pathname);
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
