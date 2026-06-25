(() => {
  'use strict';
  document.getElementById('gnk-live-market-chart')?.remove();
  document.querySelector('.feature-grid')?.classList.remove('gnk-market-chart-layout');
  if (window.__GNK_ASG_LIVE_MARKET_CHART_V2__ || document.querySelector('script[data-gnk-market-v2]')) return;
  const script = document.createElement('script');
  script.src = '/assets/index-live-market-chart-v2.js?v=20260625-v2';
  script.defer = true;
  script.dataset.gnkMarketV2 = '1';
  document.head.appendChild(script);
})();
