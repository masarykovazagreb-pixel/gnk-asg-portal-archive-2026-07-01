#!/usr/bin/env node
/**
 * AKTUAL HR NEWS: original publisher RSS titles and links only.
 * No image download, article-body copy, LLM assertions, or automatic publication.
 * Source failures reported transparently. One canonical writer executes this script.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { safeUrl, fetchFeedXml } from './lib/aktual-world-feed-http-v1.mjs';

const ROOT='apps/portal/data/';
const REG=JSON.parse(fs.readFileSync(ROOT+'hr-news-sources-v1.json','utf8'));
const OUT=process.env.HR_NEWS_OUT||ROOT+'hr-news-feed-v1.json';
const QUEUE=process.env.HR_NEWS_QUEUE_OUT||'artifacts/hr-news-editorial-queue-v1.json';
const MAX=200, PITCHES=30, now=Date.now(), MAX_AGE=(REG.maxAgeHours||168)*3600000;
const enabled=REG.sources.filter(s=>s.enabled);
const publisher=hostname=>enabled.find(s=>hostname===s.domain||hostname.endsWith('.'+s.domain));
const esc=s=>String(s||'')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(full,k)=>{
    const m={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    const lower=k.toLowerCase();
    if(m[lower])return m[lower];
    try{return String.fromCodePoint(lower.startsWith('#x')?parseInt(lower.slice(2),16):Number(lower.slice(1)))}catch{return '';}
  })
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const tag=(xml,name)=>(xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]||'';
const normalize=value=>{
 const url=safeUrl(value);
 if(!url)return null;
 const u=new URL(url);u.hash='';
 for(const k of [...u.searchParams.keys()])if(/^(utm_.*|fbclid|gclid|mc_cid|mc_eid)$/i.test(k))u.searchParams.delete(k);
 u.searchParams.sort();
 if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');
 return u.href;
};
function parse(xml,source) {
 const chunks=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>|<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].slice(0,90);
 const items=[];
 for(const m of chunks){
  const body=m[1]||m[2];
  const title=esc(tag(body,'title')).slice(0,240);
  let href=esc(tag(body,'link'));
  if(!href)href=esc((body.match(/<link\b[^>]*\bhref=['"]([^'"]+)['"]/i)||[])[1]);
  const url=normalize(href);
  let date=Date.parse(esc(tag(body,'pubDate')||tag(body,'published')||tag(body,'updated')||tag(body,'dc:date')));
  if(!title||title.length<9||!url||!Number.isFinite(date)||date>now+3600000||now-date>MAX_AGE)continue;
  const host=new URL(url).hostname.toLowerCase();
  if(!(host===source.domain||host.endsWith('.'+source.domain)))continue;
  items.push({title,source:source.name,url,publishedAt:new Date(date).toISOString(),publisherDomain:source.domain,contentType:'external_headline_link',image:null,sourceRights:'link_only_no_body_or_photograph'});
 }
 return items;
}
function retainedExisting(){
 const result=[];
 for(const path of [ROOT+'news.json',ROOT+'news_archive.json']){
  if(!fs.existsSync(path))continue;
  let body;try{body=JSON.parse(fs.readFileSync(path,'utf8'));}catch{continue;}
  const rows=Array.isArray(body)?body:body.items||[];
  for(const r of rows){
   if(!r||!r.title||!r.url||!r.source)continue;
   const url=normalize(r.url),date=Date.parse(r.published_at||r.publishedAt||'');
   if(!url||!Number.isFinite(date)||date>now+3600000||now-date>MAX_AGE)continue;
   const source=publisher(new URL(url).hostname.toLowerCase());
   if(!source)continue;
   result.push({title:String(r.title).slice(0,240),source:source.name,url,publishedAt:new Date(date).toISOString(),publisherDomain:source.domain,contentType:'external_headline_link',image:null,sourceRights:'link_only_no_body_or_photograph'});
  }
 }
 return result;
}
let pos=0,attempts=[],all=retainedExisting();
async function worker(){
 while(pos<enabled.length){
  const source=enabled[pos++];
  try{
   const xml=await fetchFeedXml(source.feed);
   const items=parse(xml,source);
   attempts.push({source:source.name,status:items.length?'ok':'no_recent_items',accepted:items.length});
   all.push(...items);
  }catch(e){
   attempts.push({source:source.name,status:'failed',reason:String(e.message).slice(0,110),accepted:0});
  }
 }
}
await Promise.all(Array.from({length:Math.min(5,enabled.length)},worker));
const seen=new Set(),perSource=new Map();
const result=all.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).filter(item=>{
 const key=item.url;if(seen.has(key))return false;
 const n=perSource.get(item.publisherDomain)||0;
 if(n>=65)return false;
 seen.add(key);perSource.set(item.publisherDomain,n+1);return true;
}).slice(0,MAX);
if(!result.length) {
 console.error(JSON.stringify({error:'No valid source-linked HR headlines; preserving previous cache',attempts}));
 process.exit(1);
}
const rows=result.map(item=>({...item,id:crypto.createHash('sha256').update(item.url).digest('hex').slice(0,20)}));
const stats={fetchedAt:new Date(now).toISOString(),total:rows.length,target:MAX,minimumDesiredExternalLinks:100,externalLinkTargetMet:rows.length>=100,shortfallTo100:Math.max(0,100-rows.length),sourceFeedsConfigured:enabled.length,successfulFeeds:attempts.filter(x=>x.status==='ok').length,failedFeeds:attempts.filter(x=>x.status==='failed').length,verifiedIndependentReporting:0,originalArticlesPublished:0};
const publication={version:1,scope:'HR NEWS',policy:'external publisher title and direct link only; no third-party body or photographs',...stats,sourceChecks:attempts.sort((a,b)=>a.source.localeCompare(b.source)),items:rows};
const pitches=rows.slice(0,PITCHES).map((x,i)=>({pitchId:'hr-'+x.id,source:x.source,sourceUrl:x.url,sourcePublishedAt:x.publishedAt,topicPrompt:x.title,originalArticleBody:null,independentFactCheck:false,editorApproved:false,imageRightsVerified:false,publicationStatus:'research_queue_only',agentLane:(i%10)+1}));
const queue={version:1,day:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)),targetOriginalReports:30,actualApprovedReports:0,totalPitches:pitches.length,releaseGate:'human_edit_and_source_verification_required',pitches};
fs.writeFileSync(OUT,JSON.stringify(publication,null,2)+'\n');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(QUEUE,JSON.stringify(queue,null,2)+'\n');
console.log(JSON.stringify({...stats,pitches:pitches.length}));
