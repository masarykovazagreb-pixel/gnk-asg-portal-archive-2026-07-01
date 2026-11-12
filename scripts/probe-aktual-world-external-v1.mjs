#!/usr/bin/env node
/**
 * AKTUAL MEDIA: guarded read-only probe for the user-nominated global news preview.
 * Does not scrape, mirror, download images, publish posts, or write source data.
 * Default invocation is offline --check; --probe performs a single HTTPS GET.
 */
import fs from 'node:fs';

const config=JSON.parse(fs.readFileSync('apps/portal/data/aktual-world-external-source-v1.json','utf8'));
const EXPECTED='j1hex9qg03f0-d.space-z.ai';
const homepage=new URL(config.homepage);
if(homepage.protocol!=='https:'||homepage.hostname!==EXPECTED||homepage.username||homepage.password||homepage.port)
  throw new Error('World preview host is not approved');
if(config.allowArticleBodyCopy!==false||config.allowRemoteImageCopy!==false||
   config.ingestionStatus!=='pending_external_verification')
  throw new Error('Unverified source cannot publish article bodies or remote images');
if(!process.argv.includes('--probe')){
  console.log(JSON.stringify({ok:true,mode:'offline-check',source:config.id,host:homepage.hostname,ingest:false,images:false}));
  process.exit(0);
}

const safeSameHost=(value)=>{
  try{
    const u=new URL(value,homepage);
    if(u.protocol!=='https:'||u.hostname!==EXPECTED||u.username||u.password||u.port)return null;
    if(u.pathname.length>256||u.search.length>512)return null;
    return u.href;
  }catch{return null}
};
const getAttr=(tag,key)=>new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i').exec(tag)?.slice(1).find(Boolean)||'';
const status={ok:false,source:config.id,homepage:homepage.href,checkedAt:new Date().toISOString(),
  reachable:false,feedCandidates:[],imagePreviewPresent:false,rights:'not verified',ingest:false};
try{
  const res=await fetch(homepage,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{
    Accept:'text/html,application/xhtml+xml','User-Agent':'AKTUAL-MEDIA-source-probe/1.0'}});
  status.http=res.status;
  const type=String(res.headers.get('content-type')||'').toLowerCase();
  const len=Number(res.headers.get('content-length')||0);
  if(res.status!==200||!type.includes('text/html')||len>600000)throw new Error('HTML endpoint not usable');
  const html=await res.text();
  if(html.length>600000)throw new Error('HTML exceeds limit');
  status.reachable=true;
  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    const rel=getAttr(tag,'rel').toLowerCase();
    const format=getAttr(tag,'type').toLowerCase();
    if(!rel.split(/\s+/).includes('alternate')||!/(rss\+xml|atom\+xml|application\/feed\+json)/.test(format))continue;
    const url=safeSameHost(getAttr(tag,'href'));if(url&&!status.feedCandidates.includes(url))status.feedCandidates.push(url);
    if(status.feedCandidates.length>=10)break;
  }
  status.imagePreviewPresent=/(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["']/i.test(html);
  status.ok=true;
}catch(e){
  status.error=String(e?.message||e).slice(0,160);
}
console.log(JSON.stringify(status,null,2));
// Return a success code even for network downtime: the world source is optional,
// and outage must not stop the existing 435 configured sources.
