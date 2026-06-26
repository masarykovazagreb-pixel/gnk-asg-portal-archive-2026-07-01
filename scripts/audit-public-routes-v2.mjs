import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE='https://gnk-asg.hr';
const VISUAL_VERSION='GNK_ASG_ARTICLE_VISUAL_V3_R2_CANONICAL_20260626';
const PUBLICATION_VERSION='GNK_ASG_PUBLICATION_SEO_V4_R2_VISUALS_20260626';
const MAX_ROUTES=200;
const PRIVATE_PREFIXES=['/operator','/admin','/mail-studio','/media-command-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/api/','/data/','/r2/'];
const ASSET_RE=/\.(?:avif|css|csv|docx?|gif|ico|jpe?g|js|json|map|mp3|mp4|pdf|png|pptx?|svg|txt|webm|webp|xlsx?|xml|zip)(?:[?#]|$)/i;
const REQUIRED=['/','/en/','/vijesti/','/news/','/objave/','/publications/','/visual-index/','/visual-index/?lang=en','/contact/','/legal/','/app/'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function normalize(value){
  try{
    const url=new URL(value,BASE);
    if(url.origin!==BASE)return null;
    if(PRIVATE_PREFIXES.some(prefix=>url.pathname.toLowerCase().startsWith(prefix)))return null;
    if(ASSET_RE.test(url.pathname))return null;
    url.hash='';
    for(const key of [...url.searchParams.keys()])if(!['lang'].includes(key))url.searchParams.delete(key);
    let path=url.pathname.replace(/\/{2,}/g,'/');
    if(!path.endsWith('/')&&!path.split('/').pop().includes('.'))path+='/';
    return `${path}${url.search}`;
  }catch{return null}
}
function links(html){const result=[];for(const match of String(html||'').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)){const value=normalize(match[1]);if(value)result.push(value)}return[...new Set(result)]}
function text(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function one(html,pattern){const match=String(html||'').match(pattern);return match?text(match[1]):''}
function attr(html,pattern){return(String(html||'').match(pattern)||[])[1]||''}
function validUrl(value){try{const url=new URL(String(value||''),BASE);return /^https?:$/.test(url.protocol)?url.href:''}catch{return''}}
async function get(path,timeout=60000){
  try{const response=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}audit=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache','user-agent':'GNK-ASG-Public-Audit/2.0'},signal:AbortSignal.timeout(timeout)});return{status:response.status,url:response.url,type:response.headers.get('content-type')||'',headers:Object.fromEntries(response.headers),body:await response.text()}}
  catch(error){return{status:0,url:`${BASE}${path}`,type:'',headers:{},body:'',error:String(error)}}
}
async function jsonGet(path,timeout=60000){const response=await get(path,timeout);let data=null;try{data=JSON.parse(response.body)}catch{}return{...response,data}}

// Wait for the first V3 publication and the scheduled backfill to complete.
let visualStatus=null;
const visualWait=[];
for(let attempt=1;attempt<=40;attempt++){
  const response=await jsonGet('/data/article-visual-status.json');
  visualStatus=response.data;
  const ready=response.status===200&&visualStatus?.visualVersion===VISUAL_VERSION&&visualStatus?.firstRun?.ok===true&&visualStatus?.lastAutoEditorVisualVersion===VISUAL_VERSION&&Number(visualStatus?.migrated||0)>=1;
  visualWait.push({attempt,checkedAt:new Date().toISOString(),status:response.status,ready,firstRun:visualStatus?.firstRun||null,lastAutoEditorVisualVersion:visualStatus?.lastAutoEditorVisualVersion||null,total:visualStatus?.total,pending:visualStatus?.pending,migrated:visualStatus?.migrated});
  if(ready)break;
  await sleep(15000);
}
const firstRunFailures=[];
if(!visualStatus)firstRunFailures.push('article_visual_status_missing');
else{
  if(visualStatus.visualVersion!==VISUAL_VERSION)firstRunFailures.push(`visual_version=${visualStatus.visualVersion||'missing'}`);
  if(visualStatus.firstRun?.ok!==true)firstRunFailures.push('first_run_not_complete');
  if(visualStatus.lastAutoEditorVisualVersion!==VISUAL_VERSION)firstRunFailures.push(`last_visual=${visualStatus.lastAutoEditorVisualVersion||'missing'}`);
  if(Number(visualStatus.migrated||0)<1)firstRunFailures.push(`migrated=${visualStatus.migrated||0}`);
}

// Validate publication data, R2 variants and HR/EN article metadata.
const publicationsResponse=await jsonGet('/data/publications.json');
const publicationItems=Array.isArray(publicationsResponse.data?.items)?publicationsResponse.data.items:[];
const publication=publicationItems.find(item=>item?.imageGenerated?.version===VISUAL_VERSION)||publicationItems[0]||null;
const publicationFailures=[];
if(publicationsResponse.status!==200)publicationFailures.push(`publications_http=${publicationsResponse.status}`);
if(publicationsResponse.data?.version!==PUBLICATION_VERSION)publicationFailures.push(`publication_version=${publicationsResponse.data?.version||'missing'}`);
if(!publication)publicationFailures.push('publication_missing');
let publicationEvidence=null;
if(publication){
  const cover=validUrl(publication.imageGenerated?.cover?.url||publication.image),social=validUrl(publication.imageGenerated?.social?.url||publication.ogImage),portrait=validUrl(publication.imageGenerated?.portrait?.url||publication.portraitImage),slug=String(publication.slug||'').trim();
  if(publication.imageGenerated?.version!==VISUAL_VERSION)publicationFailures.push(`article_visual_version=${publication.imageGenerated?.version||'missing'}`);
  if(!cover||publication.imageGenerated?.cover?.width!==2400||publication.imageGenerated?.cover?.height!==1350)publicationFailures.push('cover_contract');
  if(!social||publication.imageGenerated?.social?.width!==1200||publication.imageGenerated?.social?.height!==630)publicationFailures.push('social_contract');
  if(!portrait||publication.imageGenerated?.portrait?.width!==1600||publication.imageGenerated?.portrait?.height!==2000)publicationFailures.push('portrait_contract');
  if(!slug)publicationFailures.push('slug_missing');
  const [coverResponse,socialResponse,portraitResponse,hr,en]=await Promise.all([
    get(new URL(cover||BASE).pathname,45000),get(new URL(social||BASE).pathname,45000),get(new URL(portrait||BASE).pathname,45000),get(`/objave/${slug}/`),get(`/publications/${slug}/`)
  ]);
  for(const [name,response] of Object.entries({cover:coverResponse,social:socialResponse,portrait:portraitResponse,hr,en}))if(response.status!==200)publicationFailures.push(`${name}_http=${response.status}`);
  const hrCanonical=attr(hr.body,/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),enCanonical=attr(en.body,/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),hrOg=attr(hr.body,/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i),enOg=attr(en.body,/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if(hrCanonical!==`${BASE}/objave/${slug}/`)publicationFailures.push(`hr_canonical=${hrCanonical||'missing'}`);
  if(enCanonical!==`${BASE}/publications/${slug}/`)publicationFailures.push(`en_canonical=${enCanonical||'missing'}`);
  if(hrOg!==social||enOg!==social)publicationFailures.push('og_social_variant_mismatch');
  if(!hr.body.includes(cover)||!en.body.includes(cover))publicationFailures.push('cover_not_rendered');
  if(!hr.body.includes('NewsArticle')||!hr.body.includes('ImageObject')||!en.body.includes('NewsArticle')||!en.body.includes('ImageObject'))publicationFailures.push('structured_data_missing');
  publicationEvidence={id:publication.id,slug,cover,social,portrait,hrCanonical,enCanonical,hrOg,enOg,codes:{cover:coverResponse.status,social:socialResponse.status,portrait:portraitResponse.status,hr:hr.status,en:en.status}};
}

// Crawl sitemap and all discovered public internal links.
const queue=[...new Set(REQUIRED)],seen=new Set(),routes=[];
const sitemap=await get('/sitemap.xml');
for(const match of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gi)){const path=normalize(match[1]);if(path&&!queue.includes(path))queue.push(path)}
while(queue.length&&routes.length<MAX_ROUTES){
  const path=queue.shift();if(!path||seen.has(path))continue;seen.add(path);
  const response=await get(path),html=response.type.includes('text/html')?response.body:'',title=one(html,/<title[^>]*>([\s\S]*?)<\/title>/i),h1=one(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i),canonical=attr(html,/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),bodyText=text(html),failures=[];
  if(response.status<200||response.status>=400)failures.push(`http=${response.status}`);
  if(html){
    if(!title)failures.push('title_missing');
    if(bodyText.length<40)failures.push(`body_too_short=${bodyText.length}`);
    if(/Internal Server Error|Application error|Worker threw exception|Error 1101/i.test(bodyText))failures.push('server_error_text');
    if(!canonical&&['/','/en/','/vijesti/','/news/','/objave/','/publications/','/visual-index/'].includes(path.split('?')[0]))failures.push('canonical_missing');
    for(const href of links(html))if(!seen.has(href)&&!queue.includes(href)&&routes.length+queue.length<MAX_ROUTES)queue.push(href);
  }
  routes.push({path,status:response.status,finalUrl:response.url,title,h1,canonical,textLength:bodyText.length,discoveredLinks:html?links(html).length:0,failures});
}

const browserResults=[];
let browser;
try{
  browser=await chromium.launch({headless:true});
  const cases=[
    {kind:'news',name:'hr-news-desktop',path:'/vijesti/',viewport:{width:1440,height:1000}},
    {kind:'news',name:'hr-news-mobile',path:'/vijesti/',viewport:{width:390,height:844}},
    {kind:'news',name:'en-news-desktop',path:'/news/',viewport:{width:1440,height:1000}},
    {kind:'news',name:'en-news-mobile',path:'/news/',viewport:{width:390,height:844}},
    {kind:'visual',name:'hr-visual-desktop',path:'/visual-index/',viewport:{width:1440,height:1000}},
    {kind:'visual',name:'hr-visual-mobile',path:'/visual-index/',viewport:{width:390,height:844}},
    {kind:'visual',name:'en-visual-desktop',path:'/visual-index/?lang=en',viewport:{width:1440,height:1000}},
    {kind:'visual',name:'en-visual-mobile',path:'/visual-index/?lang=en',viewport:{width:390,height:844}}
  ];
  for(const item of cases){
    const page=await browser.newPage({viewport:item.viewport});
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    const failures=[];let status=0,audit=null;
    try{
      const response=await page.goto(`${BASE}${item.path}${item.path.includes('?')?'&':'?'}browserAudit=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});status=response?.status()||0;
      if(item.kind==='news')await page.waitForFunction(()=>document.querySelectorAll('.news-card[data-verified-news="1"]').length>=15,{timeout:180000});
      else await page.waitForFunction(()=>document.querySelectorAll('#visualGrid .item').length>=15,{timeout:180000});
      await page.waitForTimeout(5000);
      if(item.kind==='news')audit=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('.news-card[data-verified-news="1"]')];
        const invalid=cards.map((card,index)=>{const image=card.querySelector('img'),summary=(card.querySelector('p')?.innerText||'').trim(),source=(card.querySelector('small')?.innerText||'').trim(),link=card.querySelector('a'),title=(card.querySelector('h2')?.innerText||'').trim(),reasons=[];if(!image||!image.complete||image.naturalWidth<240||image.naturalHeight<120)reasons.push('image');if(!title)reasons.push('title');if(summary.length<60)reasons.push(`summary:${summary.length}`);if(!source||!/Izvor:|Source:/i.test(source))reasons.push('source');if(!link||!/^https?:\/\//i.test(link.href))reasons.push('link');return reasons.length?{index,reasons}:null}).filter(Boolean);
        return{count:cards.length,invalid,statusText:document.getElementById('newsStatus')?.innerText||'',horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),scriptLoaded:[...document.scripts].some(script=>script.src.includes('business-news-v16.js'))};
      });
      else audit=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('#visualGrid .item')],sources=cards.map(card=>card.querySelector('img')?.currentSrc||card.querySelector('img')?.src||'').filter(Boolean),duplicates=sources.filter((src,index)=>sources.indexOf(src)!==index),invalid=cards.map((card,index)=>{const image=card.querySelector('img'),title=(card.querySelector('h2')?.innerText||'').trim(),reasons=[];if(!image||!image.complete||image.naturalWidth<200||image.naturalHeight<100)reasons.push('image');if(!title)reasons.push('title');return reasons.length?{index,reasons}:null}).filter(Boolean),publicationLinks=[...document.querySelectorAll('.gnk-publication-gallery-item a[href]')].map(link=>link.getAttribute('href'));
        return{count:cards.length,invalid,duplicates:[...new Set(duplicates)],publicationLinks,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),scriptLoaded:[...document.scripts].some(script=>script.src.includes('visual-index-central-v8.js')),statusText:document.querySelector('[data-gallery-status]')?.innerText||''};
      });
      if(status!==200)failures.push(`http=${status}`);
      if(audit.horizontalOverflow>2)failures.push(`overflow=${audit.horizontalOverflow}`);
      if(!audit.scriptLoaded)failures.push('expected_runtime_missing');
      if(item.kind==='news'){
        if(audit.count<15||audit.count>100)failures.push(`count=${audit.count}`);
        if(audit.invalid.length)failures.push(`invalid=${JSON.stringify(audit.invalid.slice(0,10))}`);
        if(/Učitavanje|Loading verified/i.test(audit.statusText))failures.push('status_placeholder');
      }else{
        if(audit.count<15)failures.push(`count=${audit.count}`);
        if(audit.invalid.length)failures.push(`invalid=${JSON.stringify(audit.invalid.slice(0,10))}`);
        if(audit.duplicates.length)failures.push(`duplicates=${audit.duplicates.length}`);
        const english=item.path.includes('lang=en');
        if(english&&audit.publicationLinks.some(href=>String(href||'').startsWith('/objave/')))failures.push('english_publication_link_points_to_hr');
      }
      if(pageErrors.length)failures.push(...pageErrors.slice(0,5).map(error=>`pageerror:${error}`));
    }catch(error){failures.push(`browser_exception:${error.message}`)}
    try{await page.screenshot({path:`artifacts/${item.name}.png`,fullPage:true,timeout:60000})}catch(error){failures.push(`screenshot:${error.message}`)}
    browserResults.push({...item,status,audit,failures,pageErrors});
    await page.close().catch(()=>{});
  }
}finally{if(browser)await browser.close().catch(()=>{})}

const routeFailures=routes.filter(route=>route.failures.length),allFailures=[...firstRunFailures,...publicationFailures,...routeFailures.flatMap(route=>route.failures.map(failure=>`${route.path}:${failure}`)),...browserResults.flatMap(result=>result.failures.map(failure=>`${result.name}:${failure}`))];
const report={checkedAt:new Date().toISOString(),ok:allFailures.length===0,firstRun:{status:visualStatus,wait:visualWait,failures:firstRunFailures},publication:{evidence:publicationEvidence,failures:publicationFailures,count:publicationItems.length,version:publicationsResponse.data?.version},routeCount:routes.length,routeFailures,browserResults,allFailures,routes};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/public-route-audit-v2.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,checkedAt:report.checkedAt,firstRun:report.firstRun,publication:report.publication,routeCount:report.routeCount,routeFailures:report.routeFailures,browserResults:report.browserResults,allFailures:report.allFailures},null,2));
if(!report.ok)process.exitCode=1;
