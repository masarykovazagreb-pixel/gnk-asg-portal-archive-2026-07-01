#!/usr/bin/env node
/**
 * Original-source headline aggregator. Never republishes article bodies.
 * External URLs are validated to avoid SSRF; failures are reported, not hidden.
 * A successfully completed refresh updates a timestamped JSON cache. Build
 * consumes that cache; the presence of a schedule does not prove it ran.
 */
import fs from 'node:fs';
import { safeUrl, fetchFeedXml } from './lib/aktual-world-feed-http-v1.mjs';
import {selectCountryFeeds, diversifyHeadlines} from './lib/aktual-world-selection-v1.mjs';
import {countryAgent} from '../apps/agents/world201/coordinator-v1.mjs';
const input='apps/portal/data/world-countries-v1.json';
const output=process.env.AKTUAL_WORLD_CACHE_OUT || 'apps/portal/data/aktual-world-headlines-v1.json';
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const bounded=(name,fallback,min,max)=>{const n=Number(process.env[name]||fallback);if(!Number.isInteger(n)||n<min||n>max)throw Error(`Invalid ${name}`);return n;};
const limitCountries=bounded('AKTUAL_COUNTRY_LIMIT',data.countries.length,1,data.countries.length);
const feedLimit=bounded('AKTUAL_FEEDS_PER_COUNTRY',10,1,30);
const maxAgeHours=bounded('AKTUAL_MAX_NEWS_AGE_HOURS',72,1,168);
const concurrency=bounded('AKTUAL_FETCH_CONCURRENCY',8,1,16);
const maxItems=bounded('AKTUAL_ITEMS_PER_COUNTRY',30,1,100);
const strict=process.argv.includes('--strict');
const countryIndex=process.argv.indexOf('--country');
const countrySlug=countryIndex>=0 ? process.argv[countryIndex+1] : null;
if(countryIndex>=0 && (!countrySlug || !data.countries.some(c=>c.slug===countrySlug))) throw Error('Unknown --country slug');
const unescapeXml=(s)=>String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi,m=>{
  const named={ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m.toLowerCase()];
  if(named!==undefined)return named;
  const value=m[2].toLowerCase()==='x'?parseInt(m.slice(3,-1),16):Number(m.slice(2,-1));
  // A malformed XML entity must not crash the entire feed or emit invalid Unicode.
  return Number.isInteger(value)&&value>0&&value<=0x10ffff&&!(value>=0xd800&&value<=0xdfff)?String.fromCodePoint(value):' ';
}).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const field=(s,t)=>s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`,'i'))?.[1]||'';
function extract(xml,now){
  const chunks=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>|<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)];
  return chunks.slice(0,50).map(m=>{
    const raw=m[1]||m[2], title=unescapeXml(field(raw,'title')).slice(0,240);
    let link=unescapeXml(field(raw,'link'));
    if(!link){let tag=raw.match(/<link\b[^>]*\b(?:rel=["']alternate["'][^>]*\b)?href=["']([^"']+)["']/i);link=unescapeXml(tag?.[1]||'');}
    let date=unescapeXml(field(raw,'pubDate')||field(raw,'published')||field(raw,'updated'));
    const ts=Date.parse(date),age=now-ts;
    if(!title||!safeUrl(link)||!Number.isFinite(ts)||age<0||age>maxAgeHours*3600000)return null;
    return {title,url:safeUrl(link),publishedAt:new Date(ts).toISOString()};
  }).filter(Boolean);
}
async function fetchFeed(url,now){
  const xml=await fetchFeedXml(url);
  return extract(xml,now);
}

const now=Date.now();
const selectedCountries=countrySlug ? data.countries.filter(c=>c.slug===countrySlug) : data.countries.slice(0,limitCountries);
const targets=selectedCountries.flatMap(c=>selectCountryFeeds(c,feedLimit).map(s=>({country:c.slug,source:s.name,url:s.rss})));
// Use the configured country edition of Google News for city search rather
// than imposing US English; query parameters are not proof of item language.
const cityTargets = countrySlug ? [] : data.cities.flatMap(city=>{
 const country=data.countries.find(c=>c.slug===city.country);
 const google=(country?.sourcesList||[]).find(s=>{try{return new URL(s.rss).hostname==='news.google.com'}catch{return false}});
 if(!google)return [];
 const params=new URL(google.rss).searchParams;
 const query=new URLSearchParams({q:city.nameLocal,hl:params.get('hl')||country.language,gl:params.get('gl')||country.code,ceid:params.get('ceid')||`${country.code}:${country.language}`});
 return [{city:city.slug,source:'Google News',url:`https://news.google.com/rss/search?${query}`}];
});
targets.push(...cityTargets);
const items={}, cityItems={};const errors=[], sourceChecks=[];
// Limit simultaneous requests to each configured host, notably aggregators
// shared by many countries; redirects remain validated by fetchFeedXml.
const hostSlots=new Map();
async function limitedFetch(url){
 const host=new URL(url).hostname.toLowerCase();let state=hostSlots.get(host);
 if(!state){state={active:0,waiting:[]};hostSlots.set(host,state);}
 if(state.active>=3) await new Promise(resolve=>state.waiting.push(resolve));
 else state.active++;
 try{return await fetchFeed(url,now)}finally{
  const next=state.waiting.shift();if(next)next();else state.active--;
 }
}
let idx=0;
async function worker(){while(idx<targets.length){const target=targets[idx++];const scope=target.city || target.country, kind=target.city ? 'city' : 'country';try{
  const headlines=await limitedFetch(target.url);
  ((target.city ? cityItems : items)[scope] ||= []).push(...headlines.map(x=>({...x,source:target.source})));
  sourceChecks.push({kind,scope,source:target.source,status:headlines.length ? 'headlines' : 'no-eligible-headlines',acceptedHeadlines:headlines.length});
}catch(e){const error=String(e.message).slice(0,120);errors.push({scope,source:target.source,error});sourceChecks.push({kind,scope,source:target.source,status:'failed',error});}}}
await Promise.all(Array.from({length:concurrency},worker));
for(const [scope,rows] of Object.entries(items)){
 const country=selectedCountries.find(c=>c.slug===scope);
 items[scope]=countryAgent(country,rows,{now,maxAgeHours,limit:maxItems}).selected;
}
for(const [scope,rows] of Object.entries(cityItems))cityItems[scope]=diversifyHeadlines(rows,maxItems);
const refreshedAt=new Date(now).toISOString();
const hasUpdates=[...Object.values(items),...Object.values(cityItems)].some(x=>x.length);
const failureReason=strict&&errors.length?'strict-source-failure':!hasUpdates?'no-acceptable-updates':null;
// Optional run diagnostics are independent of the cache and survive a failed
// refresh. Do not store error strings or URLs, which may contain credentials.
if(process.env.AKTUAL_WORLD_RUN_REPORT){
 const runReport={version:'AKTUAL_WORLD_REFRESH_RUN_V1',startedAt:refreshedAt,
  scope:countrySlug?'single-country':limitCountries<data.countries.length?'partial':'all',
  country:countrySlug,feedAttempts:targets.length,feedFailures:errors.length,
  outcome:failureReason||'candidates-available-cache-write-not-confirmed',
  sourceChecks:sourceChecks.map(({kind,scope,source,status,acceptedHeadlines})=>({kind,scope,source,status,...(Number.isInteger(acceptedHeadlines)?{acceptedHeadlines}:{})}))};
 const file=process.env.AKTUAL_WORLD_RUN_REPORT,temp=file+'.tmp-'+process.pid;
 try{fs.writeFileSync(temp,JSON.stringify(runReport,null,2)+'\n');fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
if(failureReason){console.error(JSON.stringify({error:failureReason,detail:'Previous cache retained',feedAttempts:targets.length,feedFailures:errors.length},null,2));process.exit(1);}
// Partial refreshes preserve other scopes with their own original timestamps.
// A fresh timestamp for one country must never make another stale country fresh.
let previous=null;
if(fs.existsSync(output)){try{previous=JSON.parse(fs.readFileSync(output,'utf8'));}catch{throw Error('Existing cache is invalid; refusing to overwrite');}}
const partial=Boolean(countrySlug)||limitCountries<data.countries.length;
const selected=new Set(selectedCountries.map(c=>c.slug));
const oldCountries=partial ? previous?.countries||{} : {};
const oldCities=countrySlug ? previous?.cities||{} : {};
const oldStamps=previous?.scopeUpdatedAt||{};
const previousTime=previous?.updatedAt||null;
const scopeUpdatedAt={countries:{},cities:{}};
for(const slug of Object.keys(oldCountries))if(!selected.has(slug))scopeUpdatedAt.countries[slug]=previous?.scopeUpdatedAt ? oldStamps.countries?.[slug]||null : previousTime;
for(const slug of Object.keys(oldCities))scopeUpdatedAt.cities[slug]=previous?.scopeUpdatedAt ? oldStamps.cities?.[slug]||null : previousTime;
const countryResults={...oldCountries}, cityResults={...oldCities};
// If an edition has no new headlines and at least one failed source, retain the
// prior snapshot with its original timestamp. A failure must not erase history
// or make old headlines appear fresh; the builder still hides stale snapshots.
function applyScope(kind,slug,rows,results){
 const failed=sourceChecks.some(x=>x.kind===kind&&x.scope===slug&&x.status==='failed');
 const prior=previous?.[kind==='country'?'countries':'cities']?.[slug];
 const stamp=previous?.scopeUpdatedAt ? oldStamps[kind==='country'?'countries':'cities']?.[slug]||null : previousTime;
 const stamps=scopeUpdatedAt[kind==='country'?'countries':'cities'];
 delete results[slug];
 if(!rows?.length&&failed){
  if(Array.isArray(prior)){results[slug]=prior;stamps[slug]=stamp;}
 }else{
  if(rows?.length)results[slug]=rows;
  stamps[slug]=refreshedAt;
 }
}
for(const slug of selected)applyScope('country',slug,items[slug],countryResults);
for(const city of cityTargets)applyScope('city',city.city,cityItems[city.city],cityResults);
const priorChecks=partial && Array.isArray(previous?.sourceChecks) ? previous.sourceChecks.filter(x=>x.kind==='country'?!selected.has(x.scope):Boolean(countrySlug)) : [];
const checks=[...priorChecks,...sourceChecks].sort((a,b)=>`${a.kind}:${a.scope}:${a.source}`.localeCompare(`${b.kind}:${b.scope}:${b.source}`));
const report={version:'AKTUAL_WORLD_HEADLINE_CACHE_V1',updatedAt:refreshedAt,scopeUpdatedAt,origin:'external article titles and links only; no republished bodies',countries:countryResults,cities:cityResults,feedAttempts:targets.length,feedFailures:errors.length,errors,sourceChecks:checks};
const temp=output+'.tmp-'+process.pid;
try{fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n');fs.renameSync(temp,output);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
console.log(JSON.stringify({updatedAt:report.updatedAt,feeds:targets.length,failures:errors.length,countriesWithHeadlines:Object.keys(items).length,headlines:[...Object.values(items),...Object.values(cityItems)].reduce((s,a)=>s+a.length,0),mode:partial?'partial':'all'}));
