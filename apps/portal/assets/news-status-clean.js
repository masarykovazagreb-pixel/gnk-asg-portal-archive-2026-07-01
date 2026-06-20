(() => {
  'use strict';

  function cleanPublicNewsStatus() {
    const newsBadge = document.getElementById('newsBadge');
    const automationBadge = document.getElementById('automationBadge');
    if (!newsBadge) return;

    const text = newsBadge.textContent || '';
    const cleaned = text
      .replace(/\s*·\s*\d+\s+izvor(?:a)?\s+privremeno\s+nedostup(?:an|na|no|ni).*$/i, '')
      .replace(/\s*·\s*\d+\s+source(?:s)?\s+temporarily\s+unavailable.*$/i, '')
      .trim();

    if (cleaned && cleaned !== text) newsBadge.textContent = cleaned;

    const hasNews = /Poslovne vijesti:\s*\d+\s+stavki/i.test(cleaned) || /Business News:\s*\d+\s+items/i.test(cleaned);
    if (hasNews) {
      newsBadge.classList.remove('warning', 'waiting');
      newsBadge.classList.add('ok');
      if (automationBadge && /izvor|source|kasn|delayed|privremeno|temporarily/i.test(automationBadge.textContent || '')) {
        const en = document.documentElement.lang === 'en' || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
        automationBadge.textContent = en ? 'Automated public monitor active' : 'Automatski javni pregled aktivan';
        automationBadge.classList.remove('warning', 'waiting');
        automationBadge.classList.add('ok');
      }
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', cleanPublicNewsStatus) : cleanPublicNewsStatus();
  window.addEventListener('gnk-language-change', () => setTimeout(cleanPublicNewsStatus, 40));
  window.setInterval(cleanPublicNewsStatus, 1500);
})();
