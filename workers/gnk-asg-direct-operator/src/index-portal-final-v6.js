import privateCore from './index-ui-harmonizer.js';
import qualityCore from './index-news-quality-v6.js';

const QUALITY_PATHS = new Set([
  '/data/content-quality-status.json',
  '/data/news.json',
  '/data/auto-editor.json',
  '/data/market.json',
  '/data/digital-assets.json',
  '/data/market-indices.json',
  '/data/exchanges.json',
  '/data/stablecoins.json',
  '/data/daily-market-brief.json',
  '/data/status.json',
  '/sitemap-objave.xml',
  '/image-sitemap-objave.xml',
  '/operator/content-quality/run'
]);

export default {
  fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (QUALITY_PATHS.has(path)) return qualityCore.fetch(request, env, ctx);
    return privateCore.fetch(request, env, ctx);
  },
  scheduled(event, env, ctx) {
    return qualityCore.scheduled(event, env, ctx);
  },
  email(message, env, ctx) {
    if (typeof privateCore.email === 'function') return privateCore.email(message, env, ctx);
  }
};
