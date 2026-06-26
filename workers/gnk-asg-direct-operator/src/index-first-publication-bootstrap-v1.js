import app from './index-publication-seo-v3.js';
import editorCore from './index-publication-news-hotfix.js';
import {editorialIssues,enforceEditorialQuality,VERSION as QA_VERSION} from './article-editorial-qa-v1.js';
import {repairArticle,VERSION as REPAIR_VERSION} from './article-editorial-repair-v1.js';
import {generateArticleVisual,removeArticleFromNews,VERSION as VISUAL_VERSION} from './article-visual-v2.js';

export const VERSION='GNK_ASG_FIRST_PUBLICATION_BOOTSTRAP_V1_20260626';
const KEY=`automation:first-publication:${QA_VERSION}:${VISUAL_VERSION}`;
const LAST='automation:first-publication:last';
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
async function read(env,key,fallback=null){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value){const kv=store(env);if(!kv)return false;await kv.put(key,JSON.stringify(value,null,2));return true}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-first-publication':VERSION}})}

async function generateCoreArticle(env,ctx){
  const request=new Request('https://gnk-asg.hr/operator/auto-editor/run',{method:'POST',headers:{'content-type':'application/json','x-gnk-internal-bootstrap':VERSION},body:'{}'});
  const response=await editorCore.fetch(request,env,ctx);
  let payload={};try{payload=await response.json()}catch{}
  return{response,payload,article:payload?.article||null};
}

async function bootstrap(env,ctx){
  const completed=await read(env,KEY,null);
  if(completed?.ok)return{ok:true,skipped:true,reason:'already_completed',version:VERSION,...completed};
  const startedAt=new Date().toISOString();
  const result={ok:false,version:VERSION,qaVersion:QA_VERSION,repairVersion:REPAIR_VERSION,visualVersion:VISUAL_VERSION,startedAt};
  try{
    const generated=await generateCoreArticle(env,ctx);
    result.generatorHttp=generated.response.status;
    result.generatorVersion=generated.payload?.version||null;
    if(!generated.article?.id)throw new Error(generated.payload?.error||'generated_article_missing');
    const initial=generated.article;
    result.initialArticle={id:initial.id,slug:initial.slug,titleHr:initial.titleHr,titleEn:initial.titleEn,category:initial.category};
    result.initialIssues=editorialIssues(initial);
    let candidate=initial;
    if(result.initialIssues.length){
      result.repair=await repairArticle(env,initial);
      if(!result.repair?.ok||!result.repair?.article?.id)throw new Error(result.repair?.error||'article_repair_failed');
      candidate=result.repair.article;
    }else result.repair={ok:true,skipped:true,version:REPAIR_VERSION};
    result.editorialQa=await enforceEditorialQuality(env,candidate);
    if(!result.editorialQa?.ok)throw new Error(`editorial_qa_failed:${(result.editorialQa?.issues||[]).join(',')}`);
    const approved=result.editorialQa.article||candidate;
    result.visual=approved.imageGenerated?.version===VISUAL_VERSION?{ok:true,skipped:true,version:VISUAL_VERSION,article:approved}:await generateArticleVisual(env,approved);
    if(!result.visual?.ok||!result.visual?.article?.id)throw new Error(result.visual?.error||'article_visual_failed');
    const article=result.visual.article;
    result.cleanedNews=await removeArticleFromNews(env,article);
    result.article={id:article.id,slug:article.slug,titleHr:article.titleHr,titleEn:article.titleEn,category:article.category,wordCountHr:article.wordCountHr,wordCountEn:article.wordCountEn,image:article.image,ogImage:article.ogImage,portraitImage:article.portraitImage,canonical:article.canonical,editorialQa:article.editorialQa,imageGenerated:article.imageGenerated};
    result.ok=true;
    result.finishedAt=new Date().toISOString();
    await write(env,'auto-editor:last',{...generated.payload,ok:true,article,articlePostProcess:{version:VERSION,editorialQa:result.editorialQa,repair:result.repair,visual:result.visual,cleanedNews:result.cleanedNews},finishedAt:result.finishedAt});
    await write(env,KEY,{ok:true,completedAt:result.finishedAt,articleId:article.id,slug:article.slug,qaVersion:QA_VERSION,visualVersion:VISUAL_VERSION});
  }catch(error){
    result.error=clean(error?.message||error);
    result.finishedAt=new Date().toISOString();
  }
  await write(env,LAST,result);
  return result;
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(request.method==='GET'&&path==='/data/first-publication-status.json'){
      return json({ok:true,version:VERSION,completed:await read(env,KEY,null),last:await read(env,LAST,null)});
    }
    return app.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{
      const baseResult=typeof app.scheduled==='function'?await app.scheduled(event,env,ctx):null;
      const firstPublication=await bootstrap(env,ctx);
      return{baseResult,firstPublication};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
