import app from './index-media-command-center-v21.js';
import { generateArticleVisual, removeArticleFromNews, VERSION as VISUAL_VERSION } from './article-visual-v2.js';
import { enforceEditorialQuality, editorialIssues, VERSION as EDITORIAL_QA_VERSION } from './article-editorial-qa-v1.js';
import { repairArticle, VERSION as EDITORIAL_REPAIR_VERSION } from './article-editorial-repair-v1.js';

export const VERSION = 'GNK_ASG_ARTICLE_AUTOMATION_V4_R2_FIRST_RUN_20260626';
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

async function write(env,key,value){
  const kv=store(env);
  if(!kv)return false;
  await kv.put(key,JSON.stringify(value,null,2));
  return true;
}

async function articleCandidates(env, limit=6) {
  const list = await read(env, 'publish:approved', []);
  if (!Array.isArray(list)) return [];
  const pending = list.filter(article => article?.id && article?.imageGenerated?.version !== VISUAL_VERSION);
  const current = list.filter(article => article?.id && article?.imageGenerated?.version === VISUAL_VERSION);
  return [...pending, ...current].slice(0, Math.max(1, limit));
}

async function processArticle(env, preferred) {
  const article = preferred?.id ? preferred : (await articleCandidates(env,1))[0];
  if (!article?.id) return { ok:false, error:'article_missing', editorialQaVersion:EDITORIAL_QA_VERSION, editorialRepairVersion:EDITORIAL_REPAIR_VERSION };
  const initialIssues = editorialIssues(article);
  let repair = { ok:true, skipped:true, article };
  let candidate = article;
  if (initialIssues.length) {
    repair = await repairArticle(env, article).catch(error => ({ ok:false, error:String(error?.message || error), version:EDITORIAL_REPAIR_VERSION }));
    if (repair.ok && repair.article?.id) candidate = repair.article;
  }
  const editorialQa = await enforceEditorialQuality(env, candidate);
  if (!editorialQa.ok) {
    const cleanedNews = await removeArticleFromNews(env, editorialQa.article || candidate);
    return {ok:false,quarantined:Boolean(editorialQa.quarantined),version:VERSION,editorialQaVersion:EDITORIAL_QA_VERSION,editorialRepairVersion:EDITORIAL_REPAIR_VERSION,initialIssues,repair,editorialQa,cleanedNews,articleId:article.id};
  }
  const approvedArticle = editorialQa.article || candidate;
  const visual = approvedArticle.imageGenerated?.version === VISUAL_VERSION
    ? { ok:true, skipped:true, article:approvedArticle, version:VISUAL_VERSION }
    : await generateArticleVisual(env, approvedArticle);
  const cleanedNews = await removeArticleFromNews(env, visual.article || approvedArticle);
  return {ok:visual.ok,version:VERSION,visualVersion:VISUAL_VERSION,editorialQaVersion:EDITORIAL_QA_VERSION,editorialRepairVersion:EDITORIAL_REPAIR_VERSION,initialIssues,repair,editorialQa,visual,cleanedNews,articleId:article.id};
}

async function processSweep(env, preferred=null, limit=6) {
  if (preferred?.id) {
    const result = await processArticle(env, preferred);
    return {...result,sweep:{ok:Boolean(result.ok),attempts:[{articleId:preferred.id,title:preferred.titleHr||preferred.title||'',ok:Boolean(result.ok),quarantined:Boolean(result.quarantined),visualVersion:result.visualVersion||''}],processed:1,migrated:result.visual?.skipped?0:Number(Boolean(result.ok)),limit:1}};
  }
  const candidates = await articleCandidates(env,limit);
  if (!candidates.length) return {ok:true,version:VERSION,visualVersion:VISUAL_VERSION,skipped:true,error:null,sweep:{ok:true,attempts:[],processed:0,migrated:0,limit}};
  const attempts=[];
  let migrated=0,successful=0,lastResult=null;
  for (const article of candidates) {
    const needed = article?.imageGenerated?.version !== VISUAL_VERSION;
    const result = await processArticle(env,article).catch(error=>({ok:false,error:String(error?.message||error),articleId:article.id}));
    lastResult=result;
    if(result.ok){successful+=1;if(needed&&!result.visual?.skipped)migrated+=1;}
    attempts.push({articleId:article.id,title:article.titleHr||article.title||'',ok:Boolean(result.ok),quarantined:Boolean(result.quarantined),neededMigration:needed,migrated:Boolean(needed&&result.ok&&!result.visual?.skipped),error:result.error||result.repair?.error||''});
  }
  return {...(lastResult||{}),ok:successful>0||candidates.length===0,version:VERSION,visualVersion:VISUAL_VERSION,sweep:{ok:successful>0||candidates.length===0,attempts,processed:attempts.length,successful,migrated,remainingEstimate:Math.max(0,(await articleCandidates(env,500)).filter(article=>article?.imageGenerated?.version!==VISUAL_VERSION).length),limit}};
}

async function mergeGallery(response, env) {
  try {
    const payload = await response.clone().json();
    const generated = await read(env, 'visual-gallery:generated', []);
    const base = Array.isArray(payload?.items) ? payload.items : [];
    const seen = new Set();
    const items = [...(Array.isArray(generated)?generated:[]), ...base].filter(item => {
      const key = String(item?.id || item?.src || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('x-gnk-asg-gallery-generated', String(Array.isArray(generated)?generated.length:0));
    headers.set('x-gnk-asg-editorial-qa', EDITORIAL_QA_VERSION);
    headers.set('x-gnk-asg-editorial-repair', EDITORIAL_REPAIR_VERSION);
    headers.set('x-gnk-asg-article-visual', VISUAL_VERSION);
    return new Response(JSON.stringify({...payload,items,audit:{...(payload.audit||{}),generatedCount:Array.isArray(generated)?generated.length:0,visibleCount:items.length,editorialQaVersion:EDITORIAL_QA_VERSION,editorialRepairVersion:EDITORIAL_REPAIR_VERSION,articleVisualVersion:VISUAL_VERSION}},null,2),{status:response.status,headers});
  } catch {
    return response;
  }
}

async function fetchHandler(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const response = await app.fetch(request, env, ctx);
  if (request.method === 'GET' && path === '/data/visual_gallery.json' && response.ok) return mergeGallery(response, env);
  if (request.method === 'GET' && path === '/data/article-visual-status.json') {
    const candidates=await articleCandidates(env,500),pending=candidates.filter(article=>article?.imageGenerated?.version!==VISUAL_VERSION);
    const lastAutoEditor=await read(env,'auto-editor:last',null);
    return new Response(JSON.stringify({ok:true,version:VERSION,visualVersion:VISUAL_VERSION,total:candidates.length,pending:pending.length,migrated:candidates.length-pending.length,storage:'R2 GNK_ASG_MEDIA_ASSETS',prefix:'generated-articles/YYYY/MM/article-id',lastAutoEditorVisualVersion:lastAutoEditor?.article?.imageGenerated?.version||null,lastAutoEditorArticleId:lastAutoEditor?.article?.id||null},null,2),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  if (request.method !== 'POST' || path !== '/operator/auto-editor/run' || !response.ok) return response;
  try {
    const payload = await response.clone().json();
    const articlePostProcess = await processSweep(env, payload.article,1);
    const article=articlePostProcess.visual?.article||articlePostProcess.editorialQa?.article||payload.article;
    const output={...payload,ok:payload.ok!==false&&articlePostProcess.ok,version:payload.version||VERSION,article,articlePostProcess,articleAutomationVersion:VERSION,visualVersion:VISUAL_VERSION,finishedAt:payload.finishedAt||new Date().toISOString()};
    if(output.ok&&article?.id)await write(env,'auto-editor:last',output);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('x-gnk-asg-article-automation', VERSION);
    headers.set('x-gnk-asg-article-visual', VISUAL_VERSION);
    headers.set('x-gnk-asg-editorial-qa', EDITORIAL_QA_VERSION);
    headers.set('x-gnk-asg-editorial-repair', EDITORIAL_REPAIR_VERSION);
    return new Response(JSON.stringify(output,null,2),{status:articlePostProcess.ok?response.status:422,headers});
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
      const articlePostProcess = await processSweep(env,null,6).catch(error=>({ok:false,error:String(error?.message||error),editorialQaVersion:EDITORIAL_QA_VERSION,editorialRepairVersion:EDITORIAL_REPAIR_VERSION,visualVersion:VISUAL_VERSION}));
      return { result, articlePostProcess };
    })();
    if (ctx?.waitUntil) { ctx.waitUntil(task); return; }
    return task;
  },
  async email(message, env, ctx) { if (typeof app.email === 'function') return app.email(message, env, ctx); }
};
