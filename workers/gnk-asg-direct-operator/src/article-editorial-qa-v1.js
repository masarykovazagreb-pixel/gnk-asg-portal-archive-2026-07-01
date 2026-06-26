export const VERSION='GNK_ASG_ARTICLE_EDITORIAL_QA_V1_20260626';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback=[]){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value){const kv=store(env);if(!kv)return false;await kv.put(key,JSON.stringify(value,null,2));return true}
function repeatedSentences(value){const rows=String(value||'').split(/(?<=[.!?])\s+/).map(row=>clean(row).toLocaleLowerCase('hr')).filter(row=>row.length>55);const seen=new Set();let duplicates=0;for(const row of rows){if(seen.has(row))duplicates++;else seen.add(row)}return duplicates}
function looksEnglish(value){return/\b(plans?|jobs?|report says|shut|up to|amid|after|before)\b/i.test(clean(value))}
export function editorialIssues(article){
  const issues=[];
  const hr=String(article?.bodyHr||article?.body||''),en=String(article?.bodyEn||'');
  if(words(hr)<500)issues.push(`hr_words_${words(hr)}`);
  if(words(en)<500)issues.push(`en_words_${words(en)}`);
  if(!clean(article?.titleHr))issues.push('hr_title_missing');
  if(!clean(article?.titleEn))issues.push('en_title_missing');
  if(clean(article?.titleHr)===clean(article?.titleEn)&&looksEnglish(article?.titleHr))issues.push('hr_title_not_localized');
  if(repeatedSentences(hr)>1)issues.push('hr_repeated_sentences');
  if(repeatedSentences(en)>1)issues.push('en_repeated_sentences');
  if(/\bmorati da\b|\bkako bi nastavio da\b/i.test(hr))issues.push('hr_nonstandard_language');
  if(!Array.isArray(article?.sources)||!article.sources.length)issues.push('sources_missing');
  if(!article?.seo?.titleHr||!article?.seo?.titleEn)issues.push('seo_titles_missing');
  if(!article?.seo?.descriptionHr||!article?.seo?.descriptionEn)issues.push('seo_descriptions_missing');
  return issues;
}
function removeArticle(list,article){return(Array.isArray(list)?list:[]).filter(item=>item?.id!==article.id&&item?.slug!==article.slug&&item?.url!==article.canonical&&item?.articleId!==article.id)}
export async function enforceEditorialQuality(env,article){
  if(!article?.id)return{ok:false,error:'article_missing',version:VERSION};
  if(article.editorialQa?.version===VERSION&&article.editorialQa?.ok)return{ok:true,skipped:true,version:VERSION,article,issues:[]};
  const issues=editorialIssues(article),checkedAt=new Date().toISOString();
  if(!issues.length){
    const approved={...article,editorialQa:{version:VERSION,ok:true,issues:[],checkedAt}};
    const approvedList=await read(env,'publish:approved');
    const articleList=await read(env,'data:articles:items');
    const replace=list=>[approved,...removeArticle(list,article)].slice(0,500);
    await Promise.all([write(env,'publish:approved',replace(approvedList)),write(env,'data:articles:items',replace(articleList)),write(env,`article:${article.id}`,approved)]);
    return{ok:true,version:VERSION,article:approved,issues:[]};
  }
  const quarantined={...article,status:'review_required',approvedForPublic:false,editorialQa:{version:VERSION,ok:false,issues,checkedAt}};
  const [approvedList,articleList,newsList,queue]=await Promise.all([read(env,'publish:approved'),read(env,'data:articles:items'),read(env,'data:news:items'),read(env,'auto-editor:quarantine')]);
  await Promise.all([
    write(env,'publish:approved',removeArticle(approvedList,article)),
    write(env,'data:articles:items',removeArticle(articleList,article)),
    write(env,'data:news:items',removeArticle(newsList,article)),
    write(env,'auto-editor:quarantine',[quarantined,...removeArticle(queue,article)].slice(0,100)),
    write(env,`article:${article.id}`,quarantined),
    write(env,'auto-editor:editorial-qa:last',{ok:false,version:VERSION,articleId:article.id,title:article.titleHr||article.title,issues,checkedAt})
  ]);
  return{ok:false,quarantined:true,version:VERSION,article:quarantined,issues};
}
