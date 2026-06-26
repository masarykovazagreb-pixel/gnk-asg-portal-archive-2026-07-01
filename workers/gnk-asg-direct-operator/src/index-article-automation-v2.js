import app from './index-media-command-center-v21.js';
import { generateArticleVisual, removeArticleFromNews, VERSION as VISUAL_VERSION } from './article-visual-v2.js';
import { enforceEditorialQuality, VERSION as EDITORIAL_QA_VERSION } from './article-editorial-qa-v1.js';

export const VERSION = 'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R4_EDITORIAL_QA';
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;

async function read(env, key, fallback) {
  const kv = store(env);
  if (!kv) return fallback;
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function latestArticle(env) {
  const list = await read(env, 'publish:approved', []);
  return Array.isArray(list) ? list[0] : null;
}

async function processArticle(env, preferred) {
  const article = preferred?.id ? preferred : await latestArticle(env);
  if (!article?.id) return { ok:false, error:'article_missing', editorialQaVersion:EDITORIAL_QA_VERSION };
  const editorialQa = await enforceEditorialQuality(env, article);
  if (!editorialQa.ok) {
    const cleanedNews = await removeArticleFromNews(env, editorialQa.article || article);
    return {
      ok:false,
      quarantined:Boolean(editorialQa.quarantined),
      version:VERSION,
      editorialQaVersion:EDITORIAL_QA_VERSION,
      editorialQa,
      cleanedNews
    };
  }
  const approvedArticle = editorialQa.article || article;
  const visual = approvedArticle.imageGenerated?.version === VISUAL_VERSION
    ? { ok:true, skipped:true, article:approvedArticle }
    : await generateArticleVisual(env, approvedArticle);
  const cleanedNews = await removeArticleFromNews(env, visual.article || approvedArticle);
  return {
    ok:visual.ok,
    version:VERSION,
    visualVersion:VISUAL_VERSION,
    editorialQaVersion:EDITORIAL_QA_VERSION,
    editorialQa,
    visual,
    cleanedNews
  };
}

async function mergeGallery(response, env) {
  try {
    const payload = await response.clone().json();
    const generated = await read(env, 'visual-gallery:generated', []);
    const base = Array.isArray(payload?.items) ? payload.items : [];
    const seen = new Set();
    const items = [...generated, ...base].filter(item => {
      const key = String(item?.id || item?.src || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('x-gnk-asg-gallery-generated', String(generated.length));
    headers.set('x-gnk-asg-editorial-qa', EDITORIAL_QA_VERSION);
    return new Response(JSON.stringify({
      ...payload,
      items,
      audit:{ ...(payload.audit || {}), generatedCount:generated.length, visibleCount:items.length, editorialQaVersion:EDITORIAL_QA_VERSION }
    }, null, 2), { status:response.status, headers });
  } catch {
    return response;
  }
}

async function fetchHandler(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const response = await app.fetch(request, env, ctx);
  if (request.method === 'GET' && path === '/data/visual_gallery.json' && response.ok) return mergeGallery(response, env);
  if (request.method !== 'POST' || path !== '/operator/auto-editor/run' || !response.ok) return response;
  try {
    const payload = await response.clone().json();
    const articlePostProcess = await processArticle(env, payload.article);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('x-gnk-asg-article-automation', VERSION);
    headers.set('x-gnk-asg-editorial-qa', EDITORIAL_QA_VERSION);
    return new Response(JSON.stringify({
      ...payload,
      ok:payload.ok!==false && articlePostProcess.ok,
      article:articlePostProcess.visual?.article || articlePostProcess.editorialQa?.article || payload.article,
      articlePostProcess
    }, null, 2), { status:articlePostProcess.ok?response.status:422, headers });
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
      const result = typeof app.scheduled === 'function' ? await app.scheduled(event, env, ctx) : null;
      const articlePostProcess = await processArticle(env, null).catch(error => ({ ok:false, error:String(error?.message || error), editorialQaVersion:EDITORIAL_QA_VERSION }));
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
