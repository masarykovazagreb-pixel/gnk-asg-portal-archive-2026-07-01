import {
  generateScheduledDraft,
  publishDraft,
  refreshBusinessSources,
  monitorPublications,
  readJson,
  writeJson,
  readList,
  writeList
} from './editorial-core-v1.js';
import {rotateLatestArticleImage} from './gallery-rotation-v1.js';

export const AUTO_PUBLISH_VERSION='GNK_ASG_EDITORIAL_AUTO_PUBLISH_V3_APPROVED_BURST_IMAGE_20260627';
const AUTHOR='Nermin Sefić';
const SITE='https://gnk-asg.hr';
const MAX_SOURCE_AGE_MS=8*60*60*1000;
const APPROVED_BURST_IMAGE='/assets/gnk-asg-social-card.png';
const DEFAULT_BURST_END='2026-06-29T21:59:59.000Z';

const now=()=>new Date().toISOString();
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();

function burstActive(env){
  const end=Date.parse(env?.EDITORIAL_BURST_END||DEFAULT_BURST_END);
  return Number.isFinite(end)&&Date.now()<=end;
}

function sourceIsStale(payload){
  const stamp=Date.parse(payload?.updatedAt||payload?.updated_at||'');
  return !Number.isFinite(stamp)||Date.now()-stamp>MAX_SOURCE_AGE_MS||Number(payload?.count||0)<1;
}

function articleSchema(article){
  const canonical=article.canonical||`${SITE}/objave/${article.slug}/`;
  return{
    '@context':'https://schema.org',
    '@type':'NewsArticle',
    '@id':`${canonical}#article`,
    headline:article.titleHr||article.title,
    alternativeHeadline:article.titleEn||'',
    description:article.summaryHr||article.summary||'',
    image:[article.image],
    datePublished:article.publishedAt||article.published_at,
    dateModified:article.updatedAt||article.publishedAt||article.published_at,
    inLanguage:['hr','en'],
    mainEntityOfPage:canonical,
    author:{'@type':'Person',name:AUTHOR},
    publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:SITE},
    isBasedOn:(article.sources||[]).map(item=>item.url).filter(Boolean)
  };
}

function decorate(article){
  const canonical=article.canonical||`${SITE}/objave/${article.slug}/`;
  const titleHr=clean(article.titleHr||article.title);
  const titleEn=clean(article.titleEn||titleHr);
  const descriptionHr=clean(article.summaryHr||article.summary).slice(0,170);
  const descriptionEn=clean(article.summaryEn||descriptionHr).slice(0,170);
  const image=clean(article.image);
  const approvedBrandAsset=image===APPROVED_BURST_IMAGE;
  const keywords=Array.isArray(article?.seo?.keywords)?article.seo.keywords:[];
  return{
    ...article,
    canonical,
    author:AUTHOR,
    image,
    imageAlt:clean(article.imageAlt)||(approvedBrandAsset?`${titleHr} — GNK ASG`:`${titleHr} — GNK ASG Visual Index`),
    imageCredit:clean(article.imageCredit)||(approvedBrandAsset?'GNK ASG approved brand asset':'GNK ASG Visual Index'),
    imageRepository:approvedBrandAsset?'/assets/':'/visual-index/',
    imageCatalog:approvedBrandAsset?null:'/data/gallery.catalog.json',
    imageStorage:approvedBrandAsset?'/assets/':'/assets/gallery/',
    seo:{
      ...article.seo,
      titleHr:(article?.seo?.titleHr||titleHr).slice(0,75),
      titleEn:(article?.seo?.titleEn||titleEn).slice(0,75),
      descriptionHr,
      descriptionEn,
      canonical,
      robots:'index,follow,max-image-preview:large,max-snippet:-1',
      keywords,
      author:AUTHOR,
      og:{type:'article',siteName:'GNK ASG',url:canonical,titleHr,titleEn,descriptionHr,descriptionEn,image},
      twitter:{card:'summary_large_image',titleHr,titleEn,descriptionHr,descriptionEn,image},
      structuredData:articleSchema({...article,canonical,image})
    },
    publicationPolicy:{
      version:AUTO_PUBLISH_VERSION,
      cadence:'every 2 hours during temporary fill',
      requiresBilingualText:true,
      requiresSources:true,
      requiresApprovedImage:true,
      usesApprovedBrandAssetOnly:approvedBrandAsset,
      firstPublishedAfterValidation:true
    }
  };
}

async function replacePublished(env,article){
  const approved=await readList(env,'publish:approved');
  const articles=await readList(env,'data:articles:items');
  const news=await readList(env,'data:news:items');
  const match=item=>item?.id===article.id||item?.slug===article.slug;
  const replace=list=>(Array.isArray(list)?list:[]).map(item=>match(item)?{...item,...article}:item);
  await writeList(env,'publish:approved',replace(approved),500);
  await writeList(env,'data:articles:items',replace(articles),500);
  await writeList(env,'data:news:items',(Array.isArray(news)?news:[]).map(item=>item?.url===article.canonical||item?.slug===article.slug?{...item,articleId:article.id,slug:article.slug,image:article.image,imageAlt:article.imageAlt,imageCredit:article.imageCredit}:item),500);
  await writeJson(env,`article:${article.id}`,article);
}

export async function runAutomatedPublication(env,{forceSourceRefresh=false}={}){
  const startedAt=now();
  const temporaryBurst=burstActive(env);
  const result={ok:false,version:AUTO_PUBLISH_VERSION,temporaryBurst,startedAt,sourceRefresh:null,draft:null,publish:null,image:null,monitor:null};
  let sourceState=await readJson(env,'editorial:sources:last',null);
  if(forceSourceRefresh||sourceIsStale(sourceState)){
    result.sourceRefresh=await refreshBusinessSources(env);
    sourceState=result.sourceRefresh;
  }
  if(!sourceState?.ok&&Number(sourceState?.count||0)<1){
    result.error='editorial_sources_unavailable';
    result.finishedAt=now();
    await writeJson(env,'editorial:auto-publish:last',result);
    return result;
  }
  try{
    result.draft=await generateScheduledDraft(env);
    if(!result.draft?.ok){
      result.sourceRefresh=await refreshBusinessSources(env);
      result.draft=await generateScheduledDraft(env);
    }
    if(!result.draft?.ok||!result.draft?.draft?.id)throw new Error(result.draft?.error||'draft_generation_failed');
    result.publish=await publishDraft(env,result.draft.draft.id);
    if(!result.publish?.ok)throw new Error(result.publish?.error||'publication_failed');

    let approved=await readList(env,'publish:approved');
    let latest=approved.find(item=>item?.slug===result.publish.article.slug)||approved[0];
    if(!latest)throw new Error('published_article_missing');

    if(temporaryBurst){
      latest={...latest,image:APPROVED_BURST_IMAGE,imageAlt:`${clean(latest.titleHr||latest.title)} — GNK ASG`,imageCredit:'GNK ASG approved brand asset'};
      result.image={ok:true,mode:'approved-brand-asset-only',image:APPROVED_BURST_IMAGE};
    }else{
      result.image=await rotateLatestArticleImage(env,{force:true});
      if(!result.image?.ok)throw new Error(result.image?.error||'image_assignment_failed');
      approved=await readList(env,'publish:approved');
      latest=approved.find(item=>item?.slug===result.publish.article.slug)||approved[0];
    }

    if(!latest?.image)throw new Error('published_image_missing');
    const article=decorate(latest);
    await replacePublished(env,article);
    result.article={id:article.id,slug:article.slug,title:article.titleHr||article.title,canonical:article.canonical,image:article.image,publishedAt:article.publishedAt||article.published_at};
    result.monitor=await monitorPublications(env);
    result.ok=true;
  }catch(error){
    result.error=clean(error?.message||error);
  }
  result.finishedAt=now();
  await writeJson(env,'editorial:auto-publish:last',result);
  return result;
}
