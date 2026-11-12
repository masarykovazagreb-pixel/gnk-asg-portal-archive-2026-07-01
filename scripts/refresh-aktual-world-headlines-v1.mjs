#!/usr/bin/env node
/**
 * Original-source headline aggregator. Never republishes article bodies.
 * External URLs are validated to avoid SSRF; failures are reported, not hidden.
 * A successfully completed refresh updates a timestamped JSON cache. Build
 * consumes that cache; the presence of a schedule does not prove it ran.
 */
import fs from 'node:fs';
import { URL } from 'node:url';
const input='apps/portal/data/world-countries-v1.json';
const output=process.env.AKTUAL_WORLD_CACHE_OUT || 'apps/portal/data/aktual-world-headlines-v1.json';
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const limitCountries=Number(process.env.AKTUAL_COUNTRY_LIMIT || data.countries.length);
const feedLimit=Number(process.env.AKTUAL_FEEDS_PER_COUNTRY || 2);
const maxAgeHours=Number(process.env.AKTUAL_MAX_NEWS_AGE_HOURS || 72);
const concurrency=Number(process.env.AKTUAL_FETCH_CONCURRENCY || 5);
const maxItems=Number(process.env.AKTUAL_ITEMS_PER_COUNTRY || 10);
const strict=process.argv.includes('--strict');
const unescapeXml=(s)=>String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi,m=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m.toLowerCase()]??(m[2]==='x'?String.fromCodePoint(parseInt(m.slice(3,-1),16)):String.fromCodePoint(Number(m.slice(2,-1)))))).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const field=(s,t)=>s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`,'i'))?.[1]||'';
function safeUrl(value){
  try { const u=new URL(value); if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.port&&u.port!=='443') return '';
    const host=u.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.invalid')||host.endsWith('.onion')||host.endsWith('.example')||host.endsWith('.home.arpa'))return '';
    if(/^\d+\.\d+\.\d+\.\d+$/.test(host)||host.includes(':')||host==='0')return '';
    return u.href;
  }catch{return '';}
}
function extract(xml,now){
  const chunks=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>|<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)];
  return chunks.slice(0,50).map(m=>{
    const raw=m[1]||m[2], title=unescapeXml(field(raw,'title')).slice(0,240);
    let link=unescapeXml(field(raw,'link'));
    if(!link){let tag=raw.match(/<link\b[^>]*\b(?:rel=["']alternate["'][^>]*\b)?href=["']([^"']+)["']/i);link=unescapeXml(tag?.[1]||'');}
    let date=unescapeXml(field(raw,'pubDate')||field(raw,'published')||field(raw,'updated'));
    const ts=Date.parse(date),age=now-ts;
    if(!title||!safeUrl(link)||!Number.isFinite(ts)||age< -3600000||age>maxAgeHours*3600000)return null;
    return {title,url:safeUrl(link),publishedAt:new Date(ts).toISOString()};
  }).filter(Boolean);
}
async function fetchFeed(url,now){
  const valid=safeUrl(url);if(!valid)throw Error('unsafe feed URL');
  const res=await fetch(valid,{signal:AbortSignal.timeout(9000),redirect:'manual',headers:{'User-Agent':'AKTUAL-MEDIA-source-index/1.0','Accept':'application/rss+xml, application/atom+xml, text/xml, application/xml'}});
  if(!res.ok)throw Error(`HTTP ${res.status}`);
  const size=Number(res.headers.get('content-length')||0);if(size>800000)throw Error('feed over 800 KB');
  const text=await res.text();if(text.length>800000)throw Error('feed over 800 KB');
  if(!/<(?:rss|feed|rdf:RDF)\b/i.test(text))throw Error('not RSS or Atom');
  return extract(text,now);
}
const now=Date.now();
const targets=data.countries.slice(0,limitCountries).flatMap(c=>(c.sourcesList||[]).filter(s=>s.rss&&safeUrl(s.rss)).slice(0,feedLimit).map(s=>({country:c.slug,source:s.name,url:s.rss})));
const cityTargets = data.cities.map(city=>({city:city.slug,source:'Google News',url:`https://news.google.com/rss/search?q=${encodeURIComponent(city.nameEn)}&hl=en&gl=US&ceid=US:en`}));
targets.push(...cityTargets);
const items={}, cityItems={};const errors=[], sourceChecks=[];
let idx=0;
async function worker(){while(idx<targets.length){const target=targets[idx++];const scope=target.city || target.country, kind=target.city ? 'city' : 'country';try{
  const headlines=await fetchFeed(target.url,now);
  ((target.city ? cityItems : items)[scope] ||= []).push(...headlines.map(x=>({...x,source:target.source})));
  sourceChecks.push({kind,scope,source:target.source,status:headlines.length ? 'headlines' : 'no-eligible-headlines',acceptedHeadlines:headlines.length});
}catch(e){const error=String(e.message).slice(0,120);errors.push({scope,source:target.source,error});sourceChecks.push({kind,scope,source:target.source,status:'failed',error});}}}
await Promise.all(Array.from({length:Math.max(1,Math.min(10,concurrency))},worker));
for(const records of [items,cityItems])for(const [country,rows] of Object.entries(records)){const seen=new Set();records[country]=rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).filter(x=>{let key=x.url.split('?')[0];if(seen.has(key))return false;seen.add(key);return true;}).slice(0,maxItems);}
sourceChecks.sort((a,b)=>`${a.kind}:${a.scope}:${a.source}`.localeCompare(`${b.kind}:${b.scope}:${b.source}`));
const report={version:'AKTUAL_WORLD_HEADLINE_CACHE_V1',updatedAt:new Date(now).toISOString(),origin:'external article titles and canonical links only; no republished bodies',countries:items,cities:cityItems,feedAttempts:targets.length,feedFailures:errors.length,errors,sourceChecks};
if((strict&&errors.length)||!([...Object.values(items),...Object.values(cityItems)].some(x=>x.length))){console.error(JSON.stringify({error:'No acceptable updates; previous cache retained',feedAttempts:targets.length,feedFailures:errors.length},null,2));process.exit(1);}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({updatedAt:report.updatedAt,feeds:targets.length,failures:errors.length,countriesWithHeadlines:Object.keys(items).length,headlines:[...Object.values(items),...Object.values(cityItems)].reduce((s,a)=>s+a.length,0)}));
