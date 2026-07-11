(() => {
  'use strict';
  let newsData = null;
  let marketStatus = null;
  let marketPublished = null;
  let liveMarket = null;
  const NEWS_MAX_AGE_MINUTES = 75;
  const MARKET_MAX_AGE_MINUTES = 20;
  const STATUS_POLL_INTERVAL_MS = 60000;
  const english = () => document.documentElement.lang === 'en' || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const minutesOld = value => value ? Math.max(0, (Date.now() - new Date(value).getTime()) / 60000) : Infinity;
  const dateLabel = value => value ? new Date(value).toLocaleString(english() ? 'en-GB' : 'hr-HR') : (english() ? 'not available' : 'nije dostupno');

  function installStyle() {
    if (document.getElementById('gnk-live-status-style')) return;
    const style = document.createElement('style');
    style.id = 'gnk-live-status-style';
    style.textContent = [
      '.live-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:17px}',
      '.live-badge{display:inline-flex;align-items:center;gap:7px;min-height:27px;padding:0 10px;border:1px solid #e1e7ef;border-radius:999px;background:rgba(255,255,255,.82);color:#64768b;font:750 .62rem/1 Arial,sans-serif;letter-spacing:.045em}',
      '.live-badge:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#b9c4d1}',
      '.live-badge.ok{border-color:#d8ebdf;color:#3c6753;background:#f7fbf8}',
      '.live-badge.ok:before{background:#26a269}',
      '.live-badge.warning{border-color:#f0d2d1;color:#8d302e;background:#fff7f7}',
      '.live-badge.warning:before{background:#cf3b37}',
      '.automation-status{font-weight:850;text-transform:uppercase;letter-spacing:.095em}',
      '@media(max-width:680px){.live-row{gap:6px;margin-top:13px}.live-badge{font-size:.57rem;min-height:25px;padding:0 8px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setBadge(id, text, state) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text;
    node.classList.remove('waiting', 'ok', 'warning');
    node.classList.add(state);
  }

  function marketSource() {
    const statusTime = marketStatus && marketStatus.updated_at;
    const publishedTime = marketPublished && marketPublished.updated_at;
    const statusFresh = statusTime && minutesOld(statusTime) <= MARKET_MAX_AGE_MINUTES;
    const publishedFresh = publishedTime && minutesOld(publishedTime) <= MARKET_MAX_AGE_MINUTES;
    if (publishedFresh && (!statusFresh || new Date(publishedTime).getTime() >= new Date(statusTime).getTime())) {
      return {
        updated_at: publishedTime,
        coins: Array.isArray(marketPublished.coins) ? marketPublished.coins.length : 12,
        ok: marketPublished.status === 'ok' || Array.isArray(marketPublished.coins),
        label: 'published'
      };
    }
    if (marketStatus) {
      return {
        updated_at: statusTime,
        coins: marketStatus.digital_assets && marketStatus.digital_assets.coins ? marketStatus.digital_assets.coins : 12,
        ok: marketStatus.status === 'ok' && Array.isArray(marketStatus.errors) && marketStatus.errors.length === 0,
        label: 'status'
      };
    }
    return null;
  }

  function render() {
    const en = english();
    const news = newsData && newsData.news;
    const newsSourceIssues = news && Array.isArray(news.errors) ? news.errors.length : 0;
    const newsFresh = Boolean(news && (news.status === 'ok' || news.status === 'degraded') && Number(news.public_items) > 0 && minutesOld(news.updated_at) <= NEWS_MAX_AGE_MINUTES);
    const storedMarket = marketSource();
    const storedMarketFresh = Boolean(storedMarket && storedMarket.ok && minutesOld(storedMarket.updated_at) <= MARKET_MAX_AGE_MINUTES);
    const appMarketFresh = Boolean(liveMarket && liveMarket.ok && minutesOld(liveMarket.updated_at) <= MARKET_MAX_AGE_MINUTES);
    const marketFresh = appMarketFresh || storedMarketFresh;

    if (news && news.public_items != null) {
      const sourceNote = newsSourceIssues ? (en ? ' · ' + newsSourceIssues + ' source temporarily unavailable' : ' · ' + newsSourceIssues + ' izvor privremeno nedostupan') : '';
      const newsText = en ? 'Business News: ' + news.public_items + ' items · Updated: ' + dateLabel(news.updated_at) + sourceNote : 'Poslovne vijesti: ' + news.public_items + ' stavki · Ažurirano: ' + dateLabel(news.updated_at) + sourceNote;
      setBadge('newsBadge', newsText, newsFresh ? 'ok' : 'warning');
    }

    if (appMarketFresh) {
      const coins = storedMarket && storedMarket.coins ? storedMarket.coins : 12;
      const text = en ? 'Digital Assets: ' + coins + ' assets · Live: ' + dateLabel(liveMarket.updated_at) : 'Digitalna imovina: ' + coins + ' stavki · Uživo: ' + dateLabel(liveMarket.updated_at);
      setBadge('marketBadge', text, 'ok');
    } else if (storedMarket) {
      const text = en ? 'Digital Assets: ' + storedMarket.coins + ' assets · Updated: ' + dateLabel(storedMarket.updated_at) : 'Digitalna imovina: ' + storedMarket.coins + ' stavki · Ažurirano: ' + dateLabel(storedMarket.updated_at);
      setBadge('marketBadge', text, storedMarketFresh ? 'ok' : 'warning');
    }

    if (newsFresh && marketFresh) {
      setBadge('automationBadge', en ? 'Automated updates active' : 'Automatsko ažuriranje aktivno', 'ok');
    } else if (!newsFresh && !marketFresh) {
      setBadge('automationBadge', en ? 'News and market updates delayed' : 'Kasne vijesti i tržišni podatci', 'warning');
    } else if (!newsFresh) {
      setBadge('automationBadge', en ? 'News publication delayed' : 'Kasni objava vijesti', 'warning');
    } else {
      setBadge('automationBadge', en ? 'Market data checked, waiting for live app refresh' : 'Tržišni podatci provjereni, čeka se prikaz uživo', storedMarketFresh ? 'ok' : 'warning');
    }
  }

  async function read(path) {
    try {
      const response = await fetch(path + '?v=' + Date.now(), {cache:'no-store'});
      return response.ok ? await response.json() : null;
    } catch (_) { return null; }
  }

  async function refresh() {
    const results = await Promise.all([
      read('/data/update_status.json'),
      read('/data/fast_market_status.json'),
      read('/data/market.json')
    ]);
    newsData = results[0];
    marketStatus = results[1];
    marketPublished = results[2];
    render();
  }

  async function init() {
    const hero = document.querySelector('.hero-actions');
    if (!hero || document.getElementById('automationBadge')) return;
    installStyle();
    const row = document.createElement('div');
    row.className = 'live-row';
    row.innerHTML = '<span class="live-badge waiting" id="newsBadge">Poslovne vijesti: provjera</span><span class="live-badge waiting" id="marketBadge">Digitalna imovina: provjera</span><span class="live-badge waiting automation-status" id="automationBadge">Provjera ažuriranja</span>';
    hero.insertAdjacentElement('afterend', row);
    window.addEventListener('gnk-live-market-refresh', (event) => { liveMarket = event.detail || null; render(); });
    await refresh();
    window.addEventListener('gnk-language-change', render);
    window.setInterval(refresh, STATUS_POLL_INTERVAL_MS);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
