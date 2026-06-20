(() => {
  'use strict';

  const BASE_COUNT = 6887;
  const BASE_TIME = Date.parse('2026-05-31T22:05:00+02:00');
  const REFRESH_KEY = 'gnk_asg_indicative_activity_refresh_bonus_v2';
  const LAST_TICK_KEY = 'gnk_asg_indicative_activity_last_tick_v2';
  const VIEW_COOLDOWN_MS = 900;

  function isHome() {
    const path = location.pathname.replace(/\/+$/, '/');
    return path === '/' || path === '/index.html' || path === '/en/' || path === '/en/index.html';
  }

  function isEnglish() {
    return /\/en\/?$/.test(location.pathname) || /\/en\//.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  }

  function storageGet(key) {
    try {
      return Math.max(0, Number(localStorage.getItem(key) || 0));
    } catch (_) {
      return 0;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, String(Math.max(0, Number(value) || 0)));
    } catch (_) {}
  }

  function registerView(reason) {
    if (!isHome()) return;
    const now = Date.now();
    const last = storageGet(LAST_TICK_KEY);
    if (last && now - last < VIEW_COOLDOWN_MS) return;
    storageSet(LAST_TICK_KEY, now);
    storageSet(REFRESH_KEY, storageGet(REFRESH_KEY) + 1);
    window.__gnkActivityLastReason = reason || 'load';
  }

  function zagrebHour(time) {
    return Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zagreb',
      hour: '2-digit',
      hour12: false
    }).format(new Date(time)));
  }

  function growthForHour(hour, index) {
    if (hour >= 0 && hour < 7) return index % 2 === 0 ? 6 : 5;
    if (hour >= 7 && hour < 9) return 48;
    if (hour >= 9 && hour < 14) return 27;
    if (hour >= 14 && hour < 17) return 19;
    if (hour >= 17 && hour < 19) return 22;
    if (hour >= 19 && hour < 23) return 31;
    return 6;
  }

  function algorithmGrowth() {
    const now = Date.now();
    if (!BASE_TIME || now <= BASE_TIME) return 0;

    const elapsed = now - BASE_TIME;
    const fullHours = Math.floor(elapsed / 3600000);
    let total = 0;

    for (let i = 1; i <= fullHours; i += 1) {
      total += growthForHour(zagrebHour(BASE_TIME + i * 3600000), i);
    }

    const currentGrowth = growthForHour(zagrebHour(now), fullHours + 1);
    total += Math.floor(((elapsed % 3600000) / 3600000) * currentGrowth);
    return total;
  }

  function activityValue() {
    return BASE_COUNT + algorithmGrowth() + storageGet(REFRESH_KEY);
  }

  function ensureStyle() {
    if (document.getElementById('homeActivityModelStyle')) return;
    const style = document.createElement('style');
    style.id = 'homeActivityModelStyle';
    style.textContent = [
      '.reader-counter{margin-top:14px;background:rgba(255,255,255,.92);border:1px solid rgba(212,175,55,.34);border-radius:18px;padding:14px;box-shadow:0 10px 26px rgba(7,22,45,.08);display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}',
      '.reader-counter .reader-icon{width:42px;height:42px;border-radius:14px;background:var(--navy,#07162d);color:var(--gold,#d4af37);display:grid;place-items:center;font-weight:900}',
      '.reader-counter small{display:block;color:var(--muted,#64748b);font-size:.66rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}',
      '.reader-counter strong{display:block;color:var(--navy,#07162d);font-size:1.42rem;line-height:1.1;margin:3px 0}',
      '.reader-counter span{color:var(--muted,#64748b);font-size:.78rem;line-height:1.35}',
      '@media(max-width:720px){.reader-counter{grid-template-columns:1fr}.reader-counter .reader-icon{display:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function update() {
    const node = document.getElementById('readerCounterValue');
    if (!node) return;
    node.textContent = new Intl.NumberFormat(isEnglish() ? 'en-US' : 'hr-HR').format(activityValue());
  }

  function removeDuplicates() {
    const counters = Array.from(document.querySelectorAll('.reader-counter'));
    counters.slice(1).forEach(node => node.remove());
  }

  function render() {
    if (!isHome()) return;
    ensureStyle();
    removeDuplicates();

    let box = document.getElementById('readerCounter');
    const en = isEnglish();

    if (!box) {
      const anchor = document.querySelector('.profile-board .quick-data') || document.querySelector('.hero .hero-actions') || document.querySelector('.hero .container');
      if (!anchor) return;
      box = document.createElement('div');
      box.className = 'reader-counter';
      box.id = 'readerCounter';
      anchor.insertAdjacentElement(anchor.classList && anchor.classList.contains('quick-data') ? 'afterend' : 'beforeend', box);
    }

    box.innerHTML = '<div class="reader-icon">◎</div><div><small>' + (en ? 'Public activity model' : 'Javni model aktivnosti') + '</small><strong id="readerCounterValue">—</strong><span>' + (en ? 'Indicative display; not measured analytics. Every refresh or app reopen adds one view.' : 'Indikativni prikaz; nije mjerena analitika. Svaki refresh ili ponovno otvaranje aplikacije dodaje jedan prikaz.') + '</span></div>';
    update();
  }

  function boot() {
    registerView('load');
    render();
    update();
    window.setInterval(update, 15000);
  }

  window.addEventListener('pageshow', function (event) {
    if (event.persisted || document.visibilityState === 'visible') {
      registerView('pageshow');
      render();
      update();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      registerView('visible');
      update();
    }
  });

  window.addEventListener('focus', function () {
    registerView('focus');
    update();
  });

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
  window.addEventListener('gnk-language-change', render);
})();
