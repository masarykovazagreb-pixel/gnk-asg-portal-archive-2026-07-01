(() => {
  'use strict';
  if (window.__GNK_ASG_AI_BADGE_GUARD_V22__) return;
  window.__GNK_ASG_AI_BADGE_GUARD_V22__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V21__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V19__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V18__ = true;
  window.__GNK_ASG_AI_BADGE_GUARD_V17__ = true;

  const path = location.pathname.toLowerCase().replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
  const privatePage = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
  if (privatePage) return;

  const params = new URLSearchParams(location.search);
  const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status') || ((path.startsWith('/visual-index') || path.startsWith('/app')) && params.get('lang') === 'en');
  const indexPage = path === '/' || path === '/en';
  const visualIndexPage = path === '/visual-index';
  const VERSION = '20260625-v22';

  function ensureStyle(href, marker) {
    if (document.querySelector(`link[data-${marker}]`) || [...document.styleSheets].some(sheet => String(sheet.href || '').includes(href.split('?')[0]))) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[marker] = '1';
    document.head.appendChild(link);
  }

  function ensureScript(src, marker) {
    return new Promise(resolve => {
      const existing = document.querySelector(`script[data-${marker}]`) || [...document.scripts].find(script => String(script.src || '').includes(src.split('?')[0]));
      if (existing) {
        if (existing.dataset.loaded === '1' || !existing.src) resolve();
        else {
          existing.addEventListener('load', resolve, { once:true });
          setTimeout(resolve, 1200);
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset[marker] = '1';
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        resolve();
      }, { once:true });
      script.addEventListener('error', resolve, { once:true });
      document.head.appendChild(script);
    });
  }

  async function ensureIndexModules() {
    if (!indexPage) return;
    ensureStyle(`/assets/index-group-network-v2.css?v=${VERSION}`, 'gnkNetworkCss');
    document.getElementById('gnk-live-market-chart')?.remove();
    document.getElementById('gnk-live-market-chart-v2')?.remove();
    document.querySelector('.feature-grid')?.classList.remove('gnk-market-chart-layout');
    await ensureScript(`/assets/index-group-network-en-bridge-v1.js?v=${VERSION}`, 'gnkNetworkBridge');
    await Promise.all([
      ensureScript(`/assets/index-group-network-v2.js?v=${VERSION}`, 'gnkNetworkV2'),
      ensureScript(`/assets/index-news-rotation-v1.js?v=${VERSION}`, 'gnkNewsRotation'),
      ensureScript(`/assets/index-live-market-chart-v3.js?v=${VERSION}`, 'gnkMarketV3')
    ]);
  }

  async function ensureVisualGallery() {
    if (!visualIndexPage) return;
    await ensureScript(`/assets/visual-index-verified-gallery-v2.js?v=${VERSION}`, 'gnkVerifiedGallery');
  }

  let running = false;
  async function ensure() {
    if (running || !document.body) return;
    running = true;
    try {
      await ensureIndexModules();
      await ensureVisualGallery();
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
  [80,250,650,1400,3000,6000,10000].forEach(delay => setTimeout(ensure,delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    const badge = document.getElementById('gnk-ai-badge-v13');
    const networkMissing = indexPage && !document.querySelector('#mreza-grupe .gnk-network-map');
    const chartMissing = indexPage && !document.getElementById('gnk-live-market-chart-v3');
    const newsMissing = indexPage && !window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__;
    const galleryMissing = visualIndexPage && !window.__GNK_ASG_VISUAL_INDEX_VERIFIED_V2__;
    const badgeMissing = !badge || badge.classList.contains('gnk-asg-ai-hidden-duplicate') || badge.classList.contains('gnk-v13-legacy-hidden') || (badge && (getComputedStyle(badge).display === 'none' || getComputedStyle(badge).visibility === 'hidden'));
    if (!networkMissing && !chartMissing && !newsMissing && !galleryMissing && !badgeMissing) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensure();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','id']});
})();
