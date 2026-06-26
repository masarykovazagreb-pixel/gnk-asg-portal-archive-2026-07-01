#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.GNK_BASE_URL||'https://gnk-asg.hr';
const output=process.argv[2]||'/tmp/gnk-runtime-contract.json';
const failures=[];
const cb=Date.now();
const responses={};
let deployment={};
let news={};
let auto={};
let raw='';
let article=null;
let wordCountHr=0;
let wordCountEn=0;

fs.mkdirSync(path.dirname(output),{recursive:true});

const get=async endpoint=>{
  const response=await fetch(`${base}${endpoint}${endpoint.includes('?')?'&':'?'}cb=${cb}`,{headers:{'cache-control':'no-cache','user-agent':'GNK-ASG-Runtime-Contract/1.3'}});
  const text=await response.text();
  responses[endpoint]={status:response.status,contentType:response.headers.get('content-type')||'',bytes:text.length,headers:Object.fromEntries(response.headers)};
  return{response,text};
};
const parseJson=(name,result)=>{
  try{return JSON.parse(result.text)}
  catch(error){
    failures.push(`${name}_invalid_json`);
    responses[name]={...(responses[name]||{}),parseError:String(error?.message||error),preview:result.text.slice(0,240)};
    return{};
  }
};
const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
const expectedSchedule=['08:00','16:00','20:00'];

try{
  const [deploymentResult,newsResult,autoResult,rootResult]=await Promise.all([
    get('/data/deployment-status.json'),
    get('/data/news-automation-status.json'),
    get('/data/auto-editor.json'),
    get('/')
  ]);

  for(const [name,result] of Object.entries({deployment:deploymentResult,news:newsResult,autoEditor:autoResult,root:rootResult})){
    if(result.response.status!==200)failures.push(`${name}_http_${result.response.status}`);
  }

  deployment=parseJson('deployment',deploymentResult);
  news=parseJson('news',newsResult);
  auto=parseJson('autoEditor',autoResult);
  raw=rootResult.text;

  if(deployment.adminHub!=='GNK_ASG_ADMIN_HUB_V21_20260626_R11_RUNTIME_CONTRACTS')failures.push(`adminHub=${deployment.adminHub}`);
  if(deployment.publicVisual!=='GNK_ASG_PUBLIC_VISUAL_V30_CLEAN_POLISH_20260626')failures.push(`publicVisual=${deployment.publicVisual}`);
  if(deployment.indexStyle!=='INDEX_STABLE_POLISH_V30')failures.push(`indexStyle=${deployment.indexStyle}`);
  if(deployment.marketChart!=='index-live-market-chart-v4.js')failures.push(`marketChart=${deployment.marketChart}`);
  if(deployment.marketChartCompatibility!=='GNK_ASG_MARKET_CHART_V3_BLOCK_V1_20260626')failures.push(`marketCompat=${deployment.marketChartCompatibility}`);
  if(deployment.newsRuntime!=='GNK_ASG_NEWS_RUNTIME_CONTRACT_V1_20260626')failures.push(`newsRuntime=${deployment.newsRuntime}`);
  if(JSON.stringify(deployment.newsSchedule)!==JSON.stringify(expectedSchedule))failures.push(`deploymentSchedule=${JSON.stringify(deployment.newsSchedule)}`);
  if(deployment.newsActiveLimit!==100)failures.push(`deploymentActiveLimit=${deployment.newsActiveLimit}`);
  if(deployment.newsArchivePruneAt!==1000)failures.push(`deploymentArchivePruneAt=${deployment.newsArchivePruneAt}`);
  if(deployment.newsArchiveDeleteCount!==500)failures.push(`deploymentArchiveDeleteCount=${deployment.newsArchiveDeleteCount}`);
  if(deployment.articleSchedule!=='every 2 hours')failures.push(`articleSchedule=${deployment.articleSchedule}`);
  if(deployment.articleAutomationRuntime!=='GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R4_EDITORIAL_QA')failures.push(`articleRuntime=${deployment.articleAutomationRuntime}`);
  if(deployment.editorialQa!=='GNK_ASG_ARTICLE_EDITORIAL_QA_V1_20260626')failures.push(`editorialQa=${deployment.editorialQa}`);
  if(deployment.testSending!=='LOCKED'||deployment.productionSending!=='LOCKED')failures.push('mail_sending_not_locked');

  if(JSON.stringify(news.newsSchedule)!==JSON.stringify(expectedSchedule))failures.push(`newsSchedule=${JSON.stringify(news.newsSchedule)}`);
  if(news.newsRefreshesPerDay!==3)failures.push(`newsRefreshesPerDay=${news.newsRefreshesPerDay}`);
  if(news.activeNewsLimit!==100)failures.push(`activeNewsLimit=${news.activeNewsLimit}`);
  if(news.archivePruneAt!==1000)failures.push(`archivePruneAt=${news.archivePruneAt}`);
  if(news.archiveDeleteCount!==500)failures.push(`archiveDeleteCount=${news.archiveDeleteCount}`);
  if(news.autoEditorSchedule!=='every 2 hours')failures.push(`autoEditorSchedule=${news.autoEditorSchedule}`);
  if(news.runtimeContract!=='GNK_ASG_NEWS_RUNTIME_CONTRACT_V1_20260626')failures.push(`runtimeContract=${news.runtimeContract}`);

  const items=Array.isArray(auto.items)?auto.items:[];
  const publiclyInvalid=items.filter(item=>item?.kind==='article'&&(item?.status==='review_required'||item?.approvedForPublic===false));
  if(publiclyInvalid.length)failures.push(`review_required_public=${publiclyInvalid.length}`);
  article=items.find(item=>item?.kind==='article'&&item?.source==='GNK ASG Intelligence Desk')||items.find(item=>item?.kind==='article')||null;
  if(!article)failures.push('automated_article_missing');
  wordCountHr=Number(article?.wordCountHr||words(article?.bodyHr||article?.body));
  wordCountEn=Number(article?.wordCountEn||words(article?.bodyEn));
  if(wordCountHr<500)failures.push(`wordCountHr=${wordCountHr}`);
  if(wordCountEn<500)failures.push(`wordCountEn=${wordCountEn}`);
  if(!article?.seo?.titleHr||!article?.seo?.titleEn)failures.push('seo_titles_missing');
  if(!article?.seo?.descriptionHr||!article?.seo?.descriptionEn)failures.push('seo_descriptions_missing');
  if(!article?.seo?.canonical&&!article?.canonical)failures.push('canonical_missing');
  if(!article?.image)failures.push('article_image_missing');
  if(!article?.imageGenerated?.version)failures.push('generated_image_metadata_missing');
  if(article?.imageGenerated?.version&&article.imageGenerated.version!=='GNK_ASG_ARTICLE_VISUAL_V2_20260626')failures.push(`imageVersion=${article.imageGenerated.version}`);
  if(article?.editorialQa?.version!=='GNK_ASG_ARTICLE_EDITORIAL_QA_V1_20260626')failures.push(`editorialQaVersion=${article?.editorialQa?.version}`);
  if(article?.editorialQa?.ok!==true)failures.push(`editorialQaOk=${article?.editorialQa?.ok}`);
  if(article?.status!=='published'||article?.approvedForPublic!==true)failures.push(`articlePublicState=${article?.status}:${article?.approvedForPublic}`);

  if(/<script\b[^>]*index-live-market-chart-v3\.js/i.test(raw))failures.push('raw_v3_script_present');
  if(!raw.includes('gnk-market-v3-final-guard'))failures.push('market_guard_missing');
  if(!raw.includes('index-live-market-chart-v4.js'))failures.push('raw_v4_script_missing');
  if(!raw.includes('index-redesign-production.css?v=20260626-stable-v30'))failures.push('stable_v30_css_missing');
  if(raw.includes('/assets/index-polish-v1.css'))failures.push('legacy_index_polish_present');
  if(raw.includes('class="gnk-index-title"'))failures.push('legacy_hero_injector_present');
  if(!raw.includes('/assets/index-content-resilience-v1.js'))failures.push('content_resilience_missing');
  if(responses['/']?.headers?.['x-gnk-asg-public-visual']!=='GNK_ASG_PUBLIC_VISUAL_V30_CLEAN_POLISH_20260626')failures.push(`publicVisualHeader=${responses['/']?.headers?.['x-gnk-asg-public-visual']}`);
  if(responses['/']?.headers?.['x-gnk-asg-index-style']!=='INDEX_STABLE_POLISH_V30')failures.push(`indexStyleHeader=${responses['/']?.headers?.['x-gnk-asg-index-style']}`);
  for(const marker of ['Učitavanje najnovijih vijesti','Učitavanje mreže','Učitavanje objava','class="market-value">Učitavanje']){
    if(raw.includes(marker))failures.push(`raw_placeholder=${marker}`);
  }
}catch(error){
  failures.push(`validator_exception=${String(error?.message||error)}`);
}

const report={
  ok:failures.length===0,
  checkedAt:new Date().toISOString(),
  failures,
  responses,
  deployment:{adminHub:deployment.adminHub,publicVisual:deployment.publicVisual,indexStyle:deployment.indexStyle,marketChart:deployment.marketChart,marketChartCompatibility:deployment.marketChartCompatibility,newsRuntime:deployment.newsRuntime,newsSchedule:deployment.newsSchedule,newsActiveLimit:deployment.newsActiveLimit,newsArchivePruneAt:deployment.newsArchivePruneAt,newsArchiveDeleteCount:deployment.newsArchiveDeleteCount,articleSchedule:deployment.articleSchedule,articleAutomationRuntime:deployment.articleAutomationRuntime,editorialQa:deployment.editorialQa,testSending:deployment.testSending,productionSending:deployment.productionSending},
  newsStatus:{newsSchedule:news.newsSchedule,newsRefreshesPerDay:news.newsRefreshesPerDay,configuredNewsSources:news.configuredNewsSources,activeNewsLimit:news.activeNewsLimit,archiveCount:news.archiveCount,archivePruneAt:news.archivePruneAt,archiveDeleteCount:news.archiveDeleteCount,autoEditorSchedule:news.autoEditorSchedule,lastNewsRefresh:news.lastNewsRefresh,lastAutoEditor:news.lastAutoEditor},
  article:article?{id:article.id,titleHr:article.titleHr,titleEn:article.titleEn,status:article.status,approvedForPublic:article.approvedForPublic,wordCountHr,wordCountEn,image:article.image,imageGenerated:article.imageGenerated,editorialQa:article.editorialQa,seo:article.seo,publishedAt:article.publishedAt}:null,
  root:{bytes:raw.length}
};
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
