import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE='https://gnk-asg.hr';
const MAX_ROUTES=180;
const PRIVATE_PREFIXES=['/operator','/admin','/mail-studio','/media-command-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/api/','/data/','/r2/'];
const ASSET_RE=/\.(?:avif|css|csv|docx?|gif|ico|jpe?g|js|json|map|mp3|mp4|pdf|png|pptx?|svg|txt|webm|webp|xlsx?|xml|zip)(?:[?#]|$)/i;
const REQUIRED=['/','/en/','/vijesti/','/news/','/objave/','/publications/','/visual-index/','/visual-index/?lang=en','/contact/','/legal/','/app/'];

function normalize(value){
  try{
    const url=new URL(value,BASE);
    if(url.origin!==BASE)return null;
    if(PRIVATE_PREFIXES.some(prefix=>url.pathname.toLowerCase().startsWith(prefix)))return null;
    if(ASSET_RE.test(url.pathname))return null;
    url.hash='';
    for(const key of [...url.searchParams.keys()])if(!['lang'].includes(key))url.searchParams.delete(key);
    let path=url.pathname.replace(/\/{2,}/g,'/');
    if(!path.endsWith('/')&&!path.split('/').pop().includes('.'))path+='/'
    return `${path}${url.search}`;
  }catch{return null}
}
function links(html){
  const result=[];
  for(const match of String(html||'').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)){
    const value=normalize(match[1]);if(value)result.push(value);
  }
  return [...new Set(result)];
}
function text(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function one(html,pattern){const match=String(html||'').match(pattern);return match?text(match[1]):''}
async function get(path,timeout=45000){
  try{
    const response=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}audit=${Date.now()}`,{redirect:'follow',headers:{'cache-control':'no-cache','user-agent':'GNK-ASG-Public-Audit/1.0'},signal:AbortSignal.timeout(timeout)});
    return{status:response.status,url:response.url,type:response.headers.get('content-type')||'',body:await response.text()};
  }catch(error){return{status:0,url:`${BASE}${path}`,type:'',body:'',error:String(error)}}
}

const queue=[...new Set(REQUIRED)],seen=new Set(),routes=[];
const sitemap=await get('/sitemap.xml');
for(const match of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gi)){const path=normalize(match[1]);if(path&&!queue.includes(path))queue.push(path)}
while(queue.length&&routes.length<MAX_ROUTES){
  const path=queue.shift();
  if(!path||seen.has(path))continue;
  seen.add(path);
  const response=await get(path);
  const html=response.type.includes('text/html')?response.body:'';
  const title=one(html,/<title[^>]*>([\s\S]*?)<\/title>/i),h1=one(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i),canonical=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)||[])[1]||'',bodyText=text(html),failures=[];
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
  for(const item of [
    {name:'hr-news-desktop',path:'/vijesti/',viewport:{width:1440,height:1000}},
    {name:'hr-news-mobile',path:'/vijesti/',viewport:{width:390,height:844}},
    {name:'en-news-desktop',path:'/news/',viewport:{width:1440,height:1000}},
    {name:'en-news-mobile',path:'/news/',viewport:{width:390,height:844}}
  ]){
    const page=await browser.newPage({viewport:item.viewport});
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    const failures=[];
    let status=0,audit=null;
    try{
      const response=await page.goto(`${BASE}${item.path}?browserAudit=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});status=response?.status()||0;
      await page.waitForFunction(()=>document.querySelectorAll('.news-card[data-verified-news="1"]').length>=15,{timeout:180000});
      await page.waitForTimeout(5000);
      audit=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('.news-card[data-verified-news="1"]')];
        const invalid=cards.map((card,index)=>{
          const image=card.querySelector('img'),summary=(card.querySelector('p')?.innerText||'').trim(),source=(card.querySelector('small')?.innerText||'').trim(),link=card.querySelector('a'),title=(card.querySelector('h2')?.innerText||'').trim(),reasons=[];
          if(!image||!image.complete||image.naturalWidth<240||image.naturalHeight<120)reasons.push('image');
          if(!title)reasons.push('title');
          if(summary.length<60)reasons.push(`summary:${summary.length}`);
          if(!source||!/Izvor:|Source:/i.test(source))reasons.push('source');
          if(!link||!/^https?:\/\//i.test(link.href))reasons.push('link');
          return reasons.length?{index,reasons}:null;
        }).filter(Boolean);
        return{count:cards.length,invalid,statusText:document.getElementById('newsStatus')?.innerText||'',horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),scriptLoaded:[...document.scripts].some(script=>script.src.includes('business-news-v16.js'))};
      });
      if(status!==200)failures.push(`http=${status}`);
      if(audit.count<15||audit.count>100)failures.push(`count=${audit.count}`);
      if(audit.invalid.length)failures.push(`invalid=${JSON.stringify(audit.invalid.slice(0,10))}`);
      if(audit.horizontalOverflow>2)failures.push(`overflow=${audit.horizontalOverflow}`);
      if(!audit.scriptLoaded)failures.push('renderer_v16_missing');
      if(/Učitavanje|Loading verified/i.test(audit.statusText))failures.push('status_placeholder');
      if(pageErrors.length)failures.push(...pageErrors.slice(0,5).map(error=>`pageerror:${error}`));
    }catch(error){failures.push(`browser_exception:${error.message}`)}
    try{await page.screenshot({path:`artifacts/${item.name}.png`,fullPage:true,timeout:60000})}catch(error){failures.push(`screenshot:${error.message}`)}
    browserResults.push({...item,status,audit,failures,pageErrors});
    await page.close().catch(()=>{});
  }
}finally{if(browser)await browser.close().catch(()=>{})}

const report={checkedAt:new Date().toISOString(),routeCount:routes.length,routeFailures:routes.filter(route=>route.failures.length),browserResults,ok:routes.every(route=>!route.failures.length)&&browserResults.every(result=>!result.failures.length),routes};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/public-route-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:report.ok,checkedAt:report.checkedAt,routeCount:report.routeCount,routeFailures:report.routeFailures,browserResults},null,2));
if(!report.ok)process.exitCode=1;
