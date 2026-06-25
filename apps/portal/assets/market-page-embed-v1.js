(() => {
  'use strict';
  if (!/^\/trzista\/?$/.test(location.pathname)) return;
  const params = new URLSearchParams(location.search);
  if (params.get('embed') !== 'chart') return;
  if (window.__GNK_ASG_MARKET_PAGE_EMBED_V1__) return;
  window.__GNK_ASG_MARKET_PAGE_EMBED_V1__ = true;

  document.documentElement.classList.add('gnk-market-chart-embed');

  const style = document.createElement('style');
  style.id = 'gnk-market-chart-embed-style';
  style.textContent = `
    html.gnk-market-chart-embed,html.gnk-market-chart-embed body{margin:0!important;width:100%!important;min-height:100%!important;background:transparent!important;overflow:hidden!important;color-scheme:dark}
    html.gnk-market-chart-embed .site-header,
    html.gnk-market-chart-embed #gnk-asg-premium-header,
    html.gnk-market-chart-embed .hero,
    html.gnk-market-chart-embed .grid,
    html.gnk-market-chart-embed .notice,
    html.gnk-market-chart-embed .floating-home,
    html.gnk-market-chart-embed .floating-ai,
    html.gnk-market-chart-embed #gnk-ai-badge-v13,
    html.gnk-market-chart-embed #gnk-asg-float-home,
    html.gnk-market-chart-embed #gnk-asg-float-ai,
    html.gnk-market-chart-embed .gnk-v13-header{display:none!important}
    html.gnk-market-chart-embed main{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
    html.gnk-market-chart-embed .chartbox{margin:0!important;padding:8px!important;width:100%!important;height:100vh!important;min-height:240px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    html.gnk-market-chart-embed .chartbox h2,
    html.gnk-market-chart-embed .chartbox .muted{display:none!important}
    html.gnk-market-chart-embed .chart-wrap{height:100%!important;min-height:240px!important}
    html.gnk-market-chart-embed canvas{height:100%!important;border-radius:12px!important;background:linear-gradient(180deg,rgba(43,143,230,.08),rgba(2,8,18,.18))!important}
  `;
  document.head.appendChild(style);

  const notify = () => {
    try {
      parent.postMessage({ type:'GNK_ASG_MARKET_EMBED_READY', height:document.documentElement.scrollHeight }, location.origin);
    } catch (_) {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',notify,{once:true});
  else notify();
  window.addEventListener('load',notify,{once:true});
  window.addEventListener('resize',notify,{passive:true});
})();
