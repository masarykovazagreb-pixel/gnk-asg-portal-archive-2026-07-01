(() => {
  'use strict';
  if (window.__GNK_ASG_AI_BADGE_GUARD_V20__) return;
  window.__GNK_ASG_AI_BADGE_GUARD_V20__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V19__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V18__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V17__ = true;

  const path = location.pathname.toLowerCase().replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
  const privatePage = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
  if (privatePage) return;

  const params = new URLSearchParams(location.search);
  const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status') || ((path.startsWith('/visual-index') || path.startsWith('/app')) && params.get('lang') === 'en');
  const indexPage = path === '/' || path === '/en';

  function ensureMarketChart() {
    if (!indexPage || window.__GNK_ASG_LIVE_MARKET_CHART_V2__ || document.querySelector('script[data-gnk-market-v2]')) return;
    document.getElementById('gnk-live-market-chart')?.remove();
    document.querySelector('.feature-grid')?.classList.remove('gnk-market-chart-layout');
    const script = document.createElement('script');
    script.src = '/assets/index-live-market-chart-v2.js?v=20260625-v2';
    script.defer = true;
    script.dataset.gnkMarketV2 = '1';
    document.head.appendChild(script);
  }

  function ensureNewsRotation() {
    if (!indexPage || window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__ || document.querySelector('script[data-gnk-news-rotation]')) return;
    const script = document.createElement('script');
    script.src = '/assets/index-news-rotation-v1.js?v=20260625-v1';
    script.defer = true;
    script.dataset.gnkNewsRotation = '1';
    document.head.appendChild(script);
  }

  let running = false;
  function ensure() {
    if (running || !document.body) return;
    running = true;
    try {
      ensureMarketChart();
      ensureNewsRotation();
      let badge = document.getElementById('gnk-ai-badge-v13');
      if (!badge) {
        badge = document.createElement('a');
        badge.id = 'gnk-ai-badge-v13';
        badge.className = 'gnk-v13-ai-badge';
        document.body.appendChild(badge);
      }
      badge.classList.remove('gnk-asg-ai-hidden-duplicate','gnk-v13-legacy-hidden');
      badge.href = english ? '/en/assistant/' : '/assistant/';
      badge.innerHTML = `<i aria-hidden="true"></i><span>${english ? 'AI Help' : 'AI pomoć'}</span>`;
      badge.setAttribute('aria-label', english ? 'Open GNK ASG AI Help' : 'Otvori GNK ASG AI pomoć');
      badge.style.setProperty('display','inline-flex','important');
      badge.style.setProperty('visibility','visible','important');
      badge.style.setProperty('opacity','1','important');
      badge.style.setProperty('pointer-events','auto','important');
    } finally {
      running = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ensure,{once:true});
  else ensure();
  window.addEventListener('load',ensure,{once:true});
  [80,250,650,1400,3000,6000,10000].forEach(delay=>setTimeout(ensure,delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    const badge = document.getElementById('gnk-ai-badge-v13');
    const chartMissing = indexPage && !document.getElementById('gnk-live-market-chart-v2');
    const newsMissing = indexPage && !window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__ && !document.querySelector('script[data-gnk-news-rotation]');
    const needsRepair = chartMissing || newsMissing || !badge || badge.classList.contains('gnk-asg-ai-hidden-duplicate') || badge.classList.contains('gnk-v13-legacy-hidden') || (badge && (getComputedStyle(badge).display === 'none' || getComputedStyle(badge).visibility === 'hidden'));
    if (!needsRepair) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensure();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
})();
