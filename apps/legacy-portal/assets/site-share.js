(() => {
  'use strict';
  if (window.GNK_SITE_SHARE_READY) return;
  window.GNK_SITE_SHARE_READY = true;

  const ROOT = '/';
  const PUBLIC_ORIGIN = 'https://gnk-asg.hr';
  const COUNTER_START = new Date('2026-05-27T17:46:08+02:00');
  const COUNTER_BASE = 3056;
  const COUNTER_VERSION = 'v3056-20260527-174608';
  const STATE_KEY = 'gnk_asg_indicative_visits_' + COUNTER_VERSION;
  const ZONE = 'Europe/Zagreb';

  if (!document.querySelector('link[data-gnk-share-style]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.dataset.gnkShareStyle = '1';
    css.href = ROOT + 'assets/site-share.css?v=20260601-share-buttons02';
    document.head.appendChild(css);
  }

  const isEn = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname);
  const copy = () => isEn() ? {
    readers: 'Indicative readers',
    note: 'Indicative public activity model; not measured analytics.',
    share: 'Share publication',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    copyLink: 'Copy link',
    copied: 'Copied'
  } : {
    readers: 'Indikativni čitatelji',
    note: 'Indikativni javni model aktivnosti; nije mjerena analitika.',
    share: 'Podijeli objavu',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    copyLink: 'Kopiraj link',
    copied: 'Kopirano'
  };

  function localHour(date) {
    return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: ZONE }).format(date));
  }
  function hourlyRate(hour) {
    if (hour >= 7 && hour < 9) return 48;
    if (hour >= 9 && hour < 14) return 27;
    if (hour >= 14 && hour < 17) return 19;
    if (hour >= 17 && hour < 19) return 15;
    if (hour >= 19 && hour < 23) return 31;
    return hour % 2 === 0 ? 5 : 6;
  }
  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      return value && Number.isFinite(value.events) ? value : null;
    } catch (error) { return null; }
  }
  function saveState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (error) {}
  }
  function startPageVisit() {
    const previous = readState();
    if (!previous) {
      saveState({ events: 0, initializedAt: Date.now(), lastAction: 'initial-view' });
      return;
    }
    previous.events += 1;
    previous.lastAction = 'open-or-refresh';
    previous.updatedAt = Date.now();
    saveState(previous);
  }
  function timedVisits(now = new Date()) {
    if (now <= COUNTER_START) return COUNTER_BASE;
    let value = COUNTER_BASE;
    let cursor = new Date(COUNTER_START.getTime());
    while (cursor < now) {
      const hourEnd = new Date(cursor.getTime() + 3600000);
      const segmentEnd = hourEnd < now ? hourEnd : now;
      value += hourlyRate(localHour(cursor)) * ((segmentEnd.getTime() - cursor.getTime()) / 3600000);
      cursor = segmentEnd;
    }
    return Math.floor(value);
  }
  function indicativeVisits(now = new Date()) {
    const state = readState();
    return timedVisits(now) + (state ? state.events : 0);
  }
  function formatVisits() {
    return new Intl.NumberFormat(isEn() ? 'en-GB' : 'hr-HR').format(indicativeVisits());
  }
  function refreshVisits() {
    document.querySelectorAll('[data-gnk-indicative-visits]').forEach(node => { node.textContent = formatVisits(); });
  }
  function readerMarkup() {
    const t = copy();
    return '<div class="gnk-reader-fixed" title="' + t.note + '">' +
      '<span>' + t.readers + '</span>' +
      '<b data-gnk-indicative-visits>' + formatVisits() + '</b>' +
      '<small>' + t.note + '</small>' +
    '</div>';
  }
  function create(markupText) {
    const host = document.createElement('div');
    host.innerHTML = markupText;
    return host.firstElementChild;
  }
  function publicPathFrom(value) {
    const raw = value || document.querySelector('link[rel="canonical"]')?.href || location.href;
    try {
      const url = new URL(raw, location.href);
      let path = url.pathname || '/';
      if (url.hostname.endsWith('github.io')) path = path.replace(/^\/gnk-asg(?=\/|$)/, '') || '/';
      return path + (url.search || '');
    } catch (_) {
      return String(raw).startsWith('/') ? String(raw) : '/' + String(raw);
    }
  }
  function absoluteUrl(value) {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (!value && canonical) return canonical;
    return PUBLIC_ORIGIN + publicPathFrom(value);
  }
  function pageTitle() {
    const og = document.querySelector('meta[property="og:title"]')?.content;
    return og || document.querySelector('h1')?.textContent || document.title || 'GNK ASG';
  }
  function shareBlock(url, compact) {
    const t = copy();
    const abs = absoluteUrl(url);
    const encoded = encodeURIComponent(abs);
    const text = encodeURIComponent(pageTitle());
    return '<div class="gnk-share-inline' + (compact ? ' compact' : '') + '" data-gnk-share-url="' + abs + '">' +
      '<strong>' + t.share + '</strong>' +
      '<a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encoded + '">' + t.linkedin + '</a>' +
      '<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encoded + '">' + t.facebook + '</a>' +
      '<a target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=' + text + '%20' + encoded + '">' + t.whatsapp + '</a>' +
      '<button type="button" data-copy-share>' + t.copyLink + '</button>' +
    '</div>';
  }
  async function copyToClipboard(button, url) {
    const t = copy();
    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    const old = button.textContent;
    button.textContent = t.copied;
    button.classList.add('gnk-copy-ok');
    setTimeout(() => { button.textContent = old; button.classList.remove('gnk-copy-ok'); }, 1400);
  }
  function bindShareButtons(root) {
    (root || document).querySelectorAll('[data-copy-share]').forEach(button => {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const holder = button.closest('[data-gnk-share-url]');
        copyToClipboard(button, holder?.dataset.gnkShareUrl || absoluteUrl(location.href));
      });
    });
  }
  function mountArticleShare() {
    const article = document.querySelector('.article-card, .article-wrap');
    if (!article || article.querySelector('.gnk-share-inline')) return;
    const lead = article.querySelector('.article-lead, .article-subtitle, .byline, .article-meta');
    const block = create(shareBlock(null, false));
    if (lead) lead.insertAdjacentElement('afterend', block);
    else article.insertAdjacentElement('afterbegin', block);
    bindShareButtons(article);
  }
  function mountInsightCardShare() {
    document.querySelectorAll('.insight-card').forEach(card => {
      if (card.querySelector('.gnk-share-inline')) return;
      const link = card.querySelector('a[href]');
      if (!link) return;
      card.appendChild(create(shareBlock(link.getAttribute('href'), true)));
    });
    bindShareButtons(document);
  }
  function mountReader() {
    const heroActions = document.querySelector('.hero-actions');
    const heroContainer = document.querySelector('.hero .container') || document.querySelector('.hero') || document.querySelector('main');
    if (!document.querySelector('.gnk-reader-fixed') && !document.body.classList.contains('insights-page')) {
      const panel = create(readerMarkup());
      if (heroActions) heroActions.insertAdjacentElement('afterend', panel);
      else if (heroContainer) heroContainer.insertAdjacentElement('afterbegin', panel);
    }
  }
  function mount() {
    startPageVisit();
    document.querySelectorAll('.gnk-share-dock').forEach(node => node.remove());
    mountReader();
    mountArticleShare();
    mountInsightCardShare();
    refreshVisits();
    window.addEventListener('gnk-language-change', () => {
      const existing = document.querySelector('.gnk-reader-fixed');
      if (existing) existing.replaceWith(create(readerMarkup()));
      document.querySelectorAll('.gnk-share-inline').forEach(node => node.remove());
      mountArticleShare();
      mountInsightCardShare();
      refreshVisits();
    });
    window.setInterval(() => { mountInsightCardShare(); refreshVisits(); }, 3000);
    window.setInterval(refreshVisits, 60000);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
