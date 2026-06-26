#!/usr/bin/env node
import fs from 'node:fs';

const base=process.env.GNK_BASE_URL||'https://gnk-asg.hr';
const output=process.argv[2]||'/tmp/gnk-runtime-contract.json';
const failures=[];
const cb=Date.now();
const get=async path=>{
  const response=await fetch(`${base}${path}${path.includes('?')?'&':'?'}cb=${cb}`,{headers:{'cache-control':'no-cache','user-agent':'GNK-ASG-Runtime-Contract/1.0'}});
  const text=await response.text();
  return{response,text,json:()=>JSON.parse(text)};
};
const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
const expectedSchedule=['08:00','16:00','20:00'];

const [deploymentResult,newsResult,autoResult,rootResult]=await Promise.all([
  get('/data/deployment-status.json'),
  get('/data/news-automation-status.json'),
  get('/data/auto-editor.json'),
  get('/')
]);

for(const [name,result] of Object.entries({deployment:deploymentResult,news:newsResult,autoEditor:autoResult,root:rootResult})){
  if(result.response.status!==200)failures.push(`${name}_http_${result.response.status}`);
}

const deployment=deploymentResult.json();
const news=newsResult.json();
const auto=autoResult.json();
const raw=rootResult.text;

if(deployment.adminHub!=='GNK_ASG_ADMIN_HUB_V21_20260626_R11_RUNTIME_CONTRACTS')failures.push(`adminHub=${deployment.adminHub}`);
if(deployment.marketChart!=='index-live-market-chart-v4.js')failures.push(`marketChart=${deployment.marketChart}`);
if(deployment.marketChartCompatibility!=='GNK_ASG_MARKET_CHART_V3_BLOCK_V1_20260626')failures.push(`marketCompat=${deployment.marketChartCompatibility}`);
if(deployment.newsRuntime!=='GNK_ASG_NEWS_RUNTIME_CONTRACT_V1_20260626')failures.push(`newsRuntime=${deployment.newsRuntime}`);
if(JSON.stringify(deployment.newsSchedule)!==JSON.stringify(expectedSchedule))failures.push(`deploymentSchedule=${JSON.stringify(deployment.newsSchedule)}`);
if(deployment.newsActiveLimit!==100)failures.push(`deploymentActiveLimit=${deployment.newsActiveLimit}`);
if(deployment.newsArchivePruneAt!==1000)failures.push(`deploymentArchivePruneAt=${deployment.newsArchivePruneAt}`);
if(deployment.newsArchiveDeleteCount!==500)failures.push(`deploymentArchiveDeleteCount=${deployment.newsArchiveDeleteCount}`);
if(deployment.articleSchedule!=='every 2 hours')failures.push(`articleSchedule=${deployment.articleSchedule}`);
if(deployment.testSending!=='LOCKED'||deployment.productionSending!=='LOCKED')failures.push('mail_sending_not_locked');

if(JSON.stringify(news.newsSchedule)!==JSON.stringify(expectedSchedule))failures.push(`newsSchedule=${JSON.stringify(news.newsSchedule)}`);
if(news.newsRefreshesPerDay!==3)failures.push(`newsRefreshesPerDay=${news.newsRefreshesPerDay}`);
if(news.activeNewsLimit!==100)failures.push(`activeNewsLimit=${news.activeNewsLimit}`);
if(news.archivePruneAt!==1000)failures.push(`archivePruneAt=${news.archivePruneAt}`);
if(news.archiveDeleteCount!==500)failures.push(`archiveDeleteCount=${news.archiveDeleteCount}`);
if(news.autoEditorSchedule!=='every 2 hours')failures.push(`autoEditorSchedule=${news.autoEditorSchedule}`);
if(news.runtimeContract!=='GNK_ASG_NEWS_RUNTIME_CONTRACT_V1_20260626')failures.push(`runtimeContract=${news.runtimeContract}`);

const items=Array.isArray(auto.items)?auto.items:[];
const article=items.find(item=>item?.kind==='article'&&item?.source==='GNK ASG Intelligence Desk')||items.find(item=>item?.kind==='article')||null;
if(!article)failures.push('automated_article_missing');
const wordCountHr=Number(article?.wordCountHr||words(article?.bodyHr||article?.body));
const wordCountEn=Number(article?.wordCountEn||words(article?.bodyEn));
if(wordCountHr<500)failures.push(`wordCountHr=${wordCountHr}`);
if(wordCountEn<500)failures.push(`wordCountEn=${wordCountEn}`);
if(!article?.seo?.titleHr||!article?.seo?.titleEn)failures.push('seo_titles_missing');
if(!article?.seo?.descriptionHr||!article?.seo?.descriptionEn)failures.push('seo_descriptions_missing');
if(!article?.seo?.canonical&&!article?.canonical)failures.push('canonical_missing');
if(!article?.image)failures.push('article_image_missing');
if(!article?.imageGenerated?.version)failures.push('generated_image_metadata_missing');
if(article?.imageGenerated?.version&&article.imageGenerated.version!=='GNK_ASG_ARTICLE_VISUAL_V2_20260626')failures.push(`imageVersion=${article.imageGenerated.version}`);

if(/<script\b[^>]*index-live-market-chart-v3\.js/i.test(raw))failures.push('raw_v3_script_present');
if(!raw.includes('gnk-market-v3-final-guard'))failures.push('market_guard_missing');
if(!raw.includes('index-live-market-chart-v4.js'))failures.push('raw_v4_script_missing');
for(const marker of ['Učitavanje najnovijih vijesti','Učitavanje mreže','Učitavanje objava','class="market-value">Učitavanje']){
  if(raw.includes(marker))failures.push(`raw_placeholder=${marker}`);
}

const report={
  ok:failures.length===0,
  checkedAt:new Date().toISOString(),
  failures,
  deployment:{adminHub:deployment.adminHub,marketChart:deployment.marketChart,marketChartCompatibility:deployment.marketChartCompatibility,newsRuntime:deployment.newsRuntime,newsSchedule:deployment.newsSchedule,newsActiveLimit:deployment.newsActiveLimit,newsArchivePruneAt:deployment.newsArchivePruneAt,newsArchiveDeleteCount:deployment.newsArchiveDeleteCount,articleSchedule:deployment.articleSchedule,testSending:deployment.testSending,productionSending:deployment.productionSending},
  newsStatus:{newsSchedule:news.newsSchedule,newsRefreshesPerDay:news.newsRefreshesPerDay,configuredNewsSources:news.configuredNewsSources,activeNewsLimit:news.activeNewsLimit,archiveCount:news.archiveCount,archivePruneAt:news.archivePruneAt,archiveDeleteCount:news.archiveDeleteCount,autoEditorSchedule:news.autoEditorSchedule,lastNewsRefresh:news.lastNewsRefresh,lastAutoEditor:news.lastAutoEditor},
  article:article?{id:article.id,titleHr:article.titleHr,titleEn:article.titleEn,wordCountHr,wordCountEn,image:article.image,imageGenerated:article.imageGenerated,seo:article.seo,publishedAt:article.publishedAt}:null,
  root:{bytes:raw.length,hydration:rootResult.response.headers.get('x-gnk-asg-index-hydration'),marketCompat:rootResult.response.headers.get('x-gnk-asg-market-chart-compat')}
};
fs.mkdirSync(new URL('.',`file://${output}`).pathname,{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
