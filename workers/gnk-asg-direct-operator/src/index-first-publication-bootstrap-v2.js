import app from './index-publication-seo-v3.js';
import {editorialIssues,enforceEditorialQuality,VERSION as QA} from './article-editorial-qa-v1.js';
import {repairArticle,VERSION as REPAIR} from './article-editorial-repair-v1.js';
import {generateArticleVisual,removeArticleFromNews,VERSION as VISUAL} from './article-visual-v2.js';

export const VERSION='GNK_ASG_FIRST_PUBLICATION_BOOTSTRAP_V2_20260626';
const DONE=`first-publication:${QA}:${VISUAL}`,LAST='first-publication:last';
const kv=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function read(env,key,fallback=null){try{const raw=await kv(env)?.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value){const target=kv(env);if(!target)return false;await target.put(key,JSON.stringify(value,null,2));return true}
const same=(a,b)=>a?.id===b?.id||a?.slug===b?.slug||a?.articleId===b?.id;
const approved=item=>item?.editorialQa?.version===QA&&item?.editorialQa?.ok===true&&item?.approvedForPublic!==false;

async function cleanLegacy(env,preserve){
  const [publications,articles,news,queue]=await Promise.all([read(env,'publish:approved',[]),read(env,'data:articles:items',[]),read(env,'data:news:items',[]),read(env,'auto-editor:quarantine',[])]);
  const invalid=(publications||[]).filter(item=>!approved(item)&&!same(item,preserve));
  const ids=new Set(invalid.map(item=>item?.id).filter(Boolean)),slugs=new Set(invalid.map(item=>item?.slug).filter(Boolean));
  const keep=item=>!ids.has(item?.id)&&!ids.has(item?.articleId)&&!slugs.has(item?.slug);
  const marked=invalid.map(item=>({...item,status:'review_required',approvedForPublic:false,editorialQa:{version:QA,ok:false,issues:['legacy_without_qa_v3'],checkedAt:new Date().toISOString()}}));
  await Promise.all([
    write(env,'publish:approved',(publications||[]).filter(keep)),
    write(env,'data:articles:items',(articles||[]).filter(keep)),
    write(env,'data:news:items',(news||[]).filter(keep)),
    write(env,'auto-editor:quarantine',[...marked,...(queue||[])].slice(0,500))
  ]);
  return{removed:invalid.length,remaining:(publications||[]).filter(keep).length};
}

async function run(env){
  const done=await read(env,DONE,null);if(done?.ok)return{ok:true,skipped:true,...done};
  const result={ok:false,version:VERSION,qaVersion:QA,repairVersion:REPAIR,visualVersion:VISUAL,startedAt:new Date().toISOString()};
  try{
    const generated=await read(env,'auto-editor:last',null);
    const initial=generated?.article||generated?.articlePostProcess?.visual?.article||generated?.articlePostProcess?.editorialQa?.article;
    if(!initial?.id)throw new Error(generated?.error||'cron_article_missing');
    result.initial={id:initial.id,slug:initial.slug,titleHr:initial.titleHr,titleEn:initial.titleEn,category:initial.category};
    result.cleanup=await cleanLegacy(env,initial);
    result.initialIssues=editorialIssues(initial);
    let candidate=initial;
    if(result.initialIssues.length){
      result.repair=await repairArticle(env,initial);
      if(!result.repair?.ok)throw new Error(result.repair?.error||'repair_failed');
      candidate=result.repair.article;
    }
    result.qa=await enforceEditorialQuality(env,candidate);
    if(!result.qa?.ok)throw new Error(`qa_failed:${(result.qa?.issues||[]).join(',')}`);
    const checked=result.qa.article||candidate;
    result.visual=checked.imageGenerated?.version===VISUAL?{ok:true,article:checked}:await generateArticleVisual(env,checked);
    if(!result.visual?.ok)throw new Error(result.visual?.error||'visual_failed');
    const article=result.visual.article;
    await removeArticleFromNews(env,article);
    result.article={id:article.id,slug:article.slug,titleHr:article.titleHr,titleEn:article.titleEn,category:article.category,wordCountHr:article.wordCountHr,wordCountEn:article.wordCountEn,canonical:article.canonical,imageGenerated:article.imageGenerated,editorialQa:article.editorialQa};
    result.ok=true;result.finishedAt=new Date().toISOString();
    await write(env,'auto-editor:last',{...generated,ok:true,article,articlePostProcess:{version:VERSION,qa:result.qa,repair:result.repair,visual:result.visual,cleanup:result.cleanup},finishedAt:result.finishedAt});
    await write(env,DONE,{ok:true,completedAt:result.finishedAt,articleId:article.id,slug:article.slug,qaVersion:QA,visualVersion:VISUAL});
  }catch(error){result.error=String(error?.message||error);result.finishedAt=new Date().toISOString()}
  await write(env,LAST,result);return result;
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(request.method==='GET'&&path==='/data/first-publication-status.json')return new Response(JSON.stringify({ok:true,version:VERSION,completed:await read(env,DONE,null),last:await read(env,LAST,null)},null,2),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    return app.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{const base=typeof app.scheduled==='function'?await app.scheduled(event,env,ctx):null;await pause(8000);return{base,firstPublication:await run(env)}})();
    if(ctx?.waitUntil){ctx.waitUntil(task);return}return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
