(() => {
  'use strict';

  const normalise = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const isEnglish = () => /\/en(?:\/|$)/.test(location.pathname);

  function isInstallDuplicate(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));

    if (key === 'install') return true;
    if (['install', 'install app', 'instaliraj', 'instaliraj aplikaciju'].includes(text)) return true;
    if (href === '/instalacija/' || href === '/install/' || href === 'instalacija/' || href === 'install/') return true;
    return false;
  }

  function isAutoEditor(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));
    return key === 'auto-editor' || key === 'autoeditor' || text === 'auto editor' || href.includes('/auto-editor');
  }

  function isMediaKit(link) {
    const text = normalise(link.textContent);
    const href = normalise(link.getAttribute('href'));
    const key = normalise(link.dataset.key || link.getAttribute('data-nav-key'));
    return key === 'media' || key === 'media-kit' || text === 'media kit' || href.includes('/media-kit');
  }

  function repairMenu() {
    const selectors = [
      '#gnk-asg-premium-menu a',
      '#gnk-asg-drawer-menu a',
      '.gnk-asg-final-menu a',
      '.gnk-asg-full-menu-v2 a',
      '.gnk-asg-rescue-menu a'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(link => {
      if (isInstallDuplicate(link)) {
        link.remove();
        return;
      }

      if (isAutoEditor(link)) {
        link.href = isEnglish() ? '/auto-editor/?lang=en' : '/auto-editor/';
        link.textContent = 'Auto Editor';
        return;
      }

      if (isMediaKit(link)) {
        link.href = isEnglish() ? '/media-kit/?lang=en' : '/media-kit/';
        link.textContent = 'Media Kit';
      }
    });
  }

  let scheduled = false;
  function scheduleRepair() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      repairMenu();
    });
  }

  repairMenu();
  document.addEventListener('DOMContentLoaded', repairMenu, { once: true });
  window.addEventListener('load', repairMenu, { once: true });
  new MutationObserver(scheduleRepair).observe(document.documentElement, { childList: true, subtree: true });
  [250, 700, 1400, 2800].forEach(delay => setTimeout(repairMenu, delay));
})();
