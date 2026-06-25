(() => {
  'use strict';
  if (window.__GNK_ASG_INDEX_CRITICAL_MODULES_V1__) return;
  window.__GNK_ASG_INDEX_CRITICAL_MODULES_V1__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/en'].includes(route)) return;

  const VERSION = '20260625-stable01';
  const scripts = [
    ['/assets/index-group-network-en-bridge-v1.js', 'gnkCriticalBridge'],
    ['/assets/index-group-network-v2.js', 'gnkCriticalNetwork'],
    ['/assets/index-news-rotation-v1.js', 'gnkCriticalNews'],
    ['/assets/index-live-market-chart-v3.js', 'gnkCriticalMarket'],
    ['/assets/index-group-brand-rotator-v1.js', 'gnkCriticalBrandRotator']
  ];

  function ensureStyle() {
    const href = '/assets/index-group-network-v2.css';
    if ([...document.styleSheets].some(sheet => String(sheet.href || '').includes(href))) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=${VERSION}`;
    link.dataset.gnkCriticalNetworkCss = '1';
    document.head.appendChild(link);
  }

  function loadScript(src, marker) {
    return new Promise(resolve => {
      const existing = [...document.scripts].find(script => String(script.src || '').includes(src));
      if (existing) {
        if (existing.dataset.gnkCriticalReady === '1') return resolve();
        existing.addEventListener('load', resolve, { once:true });
        setTimeout(resolve, 900);
        return;
      }
      const script = document.createElement('script');
      script.src = `${src}?v=${VERSION}`;
      script.defer = true;
      script.dataset[marker] = '1';
      script.addEventListener('load', () => {
        script.dataset.gnkCriticalReady = '1';
        resolve();
      }, { once:true });
      script.addEventListener('error', resolve, { once:true });
      document.head.appendChild(script);
    });
  }

  function normalizeTargets() {
    const enSection = document.getElementById('group-network');
    if (enSection && !document.getElementById('mreza-grupe')) enSection.id = 'mreza-grupe';
    const section = document.getElementById('mreza-grupe');
    if (!section) return;
    section.hidden = false;
    section.style.removeProperty('display');
    section.style.setProperty('visibility', 'visible', 'important');
    section.style.setProperty('opacity', '1', 'important');
    section.querySelector('.map-card')?.style.removeProperty('display');
    section.querySelector('.locations')?.style.removeProperty('display');
  }

  async function install() {
    normalizeTargets();
    ensureStyle();
    for (const [src, marker] of scripts) await loadScript(src, marker);
    normalizeTargets();
  }

  function missingCriticalModule() {
    const section = document.getElementById('mreza-grupe') || document.getElementById('group-network');
    if (!section) return false;
    return !section.querySelector('.gnk-network-map') ||
      !document.getElementById('gnk-live-market-chart-v3') ||
      !document.getElementById('gnk-group-brand-rotator') ||
      !window.__GNK_ASG_INDEX_NEWS_ROTATION_V1__;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();

  window.addEventListener('load', install, { once:true });
  [250, 800, 1800, 3500, 7000].forEach(delay => setTimeout(() => {
    if (missingCriticalModule()) install();
  }, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || !missingCriticalModule()) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      install();
    });
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
