export const VERSION='GNK_ASG_ARTICLE_EDITORIAL_QA_V3_BUSINESS_BILINGUAL_20260626';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const normalized=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback=[]){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value){const kv=store(env);if(!kv)return false;await kv.put(key,JSON.stringify(value,null,2));return true}
function repeatedSentences(value){const rows=String(value||'').split(/(?<=[.!?])\s+/).map(row=>normalized(row)).filter(row=>row.length>55);const seen=new Set();let duplicates=0;for(const row of rows){if(seen.has(row))duplicates++;else seen.add(row)}return duplicates}
function mojibake(value){return/[�]|(?:Ã.|Â.|Ä.|Å.)|Γö|├|Γò/.test(String(value||''))}
function validUrl(value){try{const url=new URL(String(value||''));return ['http:','https:'].includes(url.protocol)}catch{return false}}
function englishSignals(value){const sample=` ${normalized(value).slice(0,5000)} `;const matches=sample.match(/\b(the|a|an|and|or|of|to|for|in|on|with|from|as|by|after|before|new|market|business|technology|company|companies|growth|investment|energy|economy|digital|global|european|industry|policy|revenue|jobs|trade|finance)\b/g);return matches?.length||0}
function sameLanguageCopy(a,b){return normalized(a)===normalized(b)}
function nonBusinessSports(article){const corpus=normalized([article?.titleHr,article?.titleEn,article?.summaryHr,article?.summaryEn,article?.category,...(article?.sources||[]).map(source=>`${source?.title||''} ${source?.summary||''}`)].join(' '));const sports=/\b(nogomet|utakmic|reprezent|igrac|ozljed|liga|football|match|player|coach|team|tournament|cup|championship)\b/.test(corpus);const business=/\b(poslov|trzist|ulaganj|prihod|financ|tehnolog|infrastruktur|industr|politika|ekonom|kompan|korporativ|energet|digital|zaposl|business|market|investment|revenue|finance|technology|infrastructure|industry|policy|economy|company|corporate|energy|digital|employment|commercial)\b/.test(corpus);return sports&&!business}
function sourceIssues(article){const sources=Array.isArray(article?.sources)?article.sources:[];if(!sources.length)return['sources_missing'];const issues=[];if(!sources.some(source=>validUrl(source?.url)))issues.push('source_urls_missing');if(sources.some(source=>!clean(source?.source||source?.title)||!validUrl(source?.url)))issues.push('source_entry_invalid');return issues}
export function editorialIssues(article){
  const issues=[];
  const hr=String(article?.bodyHr||article?.body||''),en=String(article?.bodyEn||'');
  const titleHr=clean(article?.titleHr),titleEn=clean(article?.titleEn),summaryHr=clean(article?.summaryHr||article?.summary),summaryEn=clean(article?.summaryEn);
  if(words(hr)<500)issues.push(`hr_words_${words(hr)}`);
  if(words(en)<500)issues.push(`en_words_${words(en)}`);
  if(!titleHr)issues.push('hr_title_missing');
  if(!titleEn)issues.push('en_title_missing');
  if(titleHr&&titleEn&&sameLanguageCopy(titleHr,titleEn))issues.push('en_title_duplicates_hr');
  if(titleEn&&englishSignals(titleEn)<1)issues.push('en_title_not_english');
  if(summaryHr.length<120)issues.push('hr_summary_too_short');
  if(summaryEn.length<120)issues.push('en_summary_too_short');
  if(summaryHr&&summaryEn&&sameLanguageCopy(summaryHr,summaryEn))issues.push('en_summary_duplicates_hr');
  if(englishSignals(`${summaryEn} ${en}`)<12)issues.push('en_content_not_english');
  if(repeatedSentences(hr)>1)issues.push('hr_repeated_sentences');
  if(repeatedSentences(en)>1)issues.push('en_repeated_sentences');
  if(/\bmorati da\b|\bkako bi nastavio da\b/i.test(hr))issues.push('hr_nonstandard_language');
  if(mojibake(`${titleHr} ${titleEn} ${summaryHr} ${summaryEn} ${hr} ${en}`))issues.push('encoding_or_mojibake_detected');
  if(nonBusinessSports(article))issues.push('non_business_sports_topic');
  if(!clean(article?.image))issues.push('image_missing');
  if(clean(article?.image).includes('news-fallback.svg'))issues.push('fallback_image_forbidden');
  issues.push(...sourceIssues(article));
  if(!article?.seo?.titleHr||!article?.seo?.titleEn)issues.push('seo_titles_missing');
  if(article?.seo?.titleHr&&article?.seo?.titleEn&&sameLanguageCopy(article.seo.titleHr,article.seo.titleEn))issues.push('seo_title_translation_missing');
  if(!article?.seo?.descriptionHr||!article?.seo?.descriptionEn)issues.push('seo_descriptions_missing');
  if(!Array.isArray(article?.seo?.keywords)||article.seo.keywords.length<5)issues.push('seo_keywords_missing');
  if(!clean(article?.canonical)||!validUrl(article.canonical))issues.push('canonical_missing_or_invalid');
  return[...new Set(issues)];
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
