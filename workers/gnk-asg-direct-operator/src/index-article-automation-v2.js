import app from './index-portal-final-v13.js';
import { generateArticleVisual, removeArticleFromNews, VERSION as VISUAL_VERSION } from './article-visual-v2.js';

export const VERSION = 'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626';
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;

async function latestArticle(env) {
  const kv = store(env);
  if (!kv) return null;
  try {
    const raw = await kv.get('publish:approved');
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list[0] : null;
  } catch {
    return null;
  }
}

async function processArticle(env, preferred) {
  const article = preferred?.id ? preferred : await latestArticle(env);
  if (!article?.id) return { ok:false, error:'article_missing' };
  const visual = await generateArticleVisual(env, article);
  const cleanedNews = await removeArticleFromNews(env, visual.article || article);
  return { ok:visual.ok, version:VERSION, visualVersion:VISUAL_VERSION, visual, cleanedNews };
}

async function fetchHandler(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const response = await app.fetch(request, env, ctx);
  if (request.method !== 'POST' || path !== '/operator/auto-editor/run' || !response.ok) return response;
  try {
    const payload = await response.clone().json();
    const articlePostProcess = await processArticle(env, payload.article);
    const headers = new Headers(response.headers);
    headers.set('x-gnk-asg-article-automation', VERSION);
    return new Response(JSON.stringify({
      ...payload,
      article:articlePostProcess.visual?.article || payload.article,
      articlePostProcess
    }, null, 2), { status:response.status, headers });
  } catch (error) {
    const headers = new Headers(response.headers);
    headers.set('x-gnk-asg-article-postprocess-error', String(error?.message || error).slice(0, 160));
    return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
  }
}

export default {
  fetch:fetchHandler,
  async scheduled(event, env, ctx) {
    const task = (async () => {
      const result = typeof app.scheduled === 'function' ? await app.scheduled(event, env, {}) : null;
      const articlePostProcess = await processArticle(env, null).catch(error => ({ ok:false, error:String(error?.message || error) }));
      return { result, articlePostProcess };
    })();
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },
  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
