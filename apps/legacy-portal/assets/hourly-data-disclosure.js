(() => {
  'use strict';
  const isEnglish = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  async function loadStatus() {
    try {
      const response = await fetch('/data/update_status.json?v=' + Date.now(), {cache: 'no-store'});
      return response.ok ? await response.json() : null;
    } catch (_) { return null; }
  }
  function reviseSources() {
    const section = document.getElementById('publicSources');
    if (!section) return;
    section.querySelectorAll('strong, span, p').forEach(node => {
      const current = node.textContent.trim();
      if (/^(Osvježava se svakih 5 minuta|Javni podatci generiraju se satno)$/.test(current)) {
        node.textContent = 'Tržišta svakih 5 minuta · vijesti svakih 15 minuta';
      }
      if (/^(Refreshes every 5 minutes|Public data generated hourly)$/.test(current)) {
        node.textContent = 'Markets every 5 minutes · news every 15 minutes';
      }
    });
  }
  function cleanNewsStatus() {
    const newsBadge = document.getElementById('newsBadge');
    const automationBadge = document.getElementById('automationBadge');
    if (!newsBadge) return;
    const original = newsBadge.textContent || '';
    const cleaned = original
      .replace(/\s*·\s*\d+\s+izvor(?:a)?\s+privremeno\s+nedostup(?:an|na|no|ni).*$/i, '')
      .replace(/\s*·\s*\d+\s+source(?:s)?\s+temporarily\s+unavailable.*$/i, '')
      .trim();
    if (cleaned && cleaned !== original) newsBadge.textContent = cleaned;
    const hasNews = /Poslovne vijesti:\s*\d+\s+stavki/i.test(cleaned) || /Business News:\s*\d+\s+items/i.test(cleaned);
    if (hasNews) {
      newsBadge.classList.remove('warning', 'waiting');
      newsBadge.classList.add('ok');
      if (automationBadge && /izvor|source|kasn|delayed|privremeno|temporarily/i.test(automationBadge.textContent || '')) {
        automationBadge.textContent = isEnglish() ? 'Automated public monitor active' : 'Automatski javni pregled aktivan';
        automationBadge.classList.remove('warning', 'waiting');
        automationBadge.classList.add('ok');
      }
    }
  }
  async function renderArchiveNotice() {
    const tabs = document.getElementById('newsTabs');
    if (!tabs) return;
    let notice = document.getElementById('newsArchiveNotice');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'newsArchiveNotice';
      notice.style.cssText = 'margin:10px 0 18px;font-size:.76rem;color:#64768b;letter-spacing:.02em;';
      tabs.insertAdjacentElement('afterend', notice);
    }
    const data = await loadStatus();
    const news = data && data.news;
    const publicItems = news && Number.isFinite(Number(news.public_items)) ? Number(news.public_items) : 500;
    const archiveItems = news && Number.isFinite(Number(news.archive_items)) ? Number(news.archive_items) : 0;
    notice.textContent = isEnglish()
      ? 'Public window: ' + publicItems + ' newest items · Active archive: ' + archiveItems + ' older items (maximum 400).'
      : 'Javni prozor: ' + publicItems + ' najnovijih stavki · Aktivna arhiva: ' + archiveItems + ' starijih stavki (najviše 400).';
    cleanNewsStatus();
  }
  function refresh() {
    reviseSources();
    renderArchiveNotice();
    cleanNewsStatus();
  }
  function init() {
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.addEventListener('gnk-language-change', refresh);
    window.setInterval(refresh, 1500);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();