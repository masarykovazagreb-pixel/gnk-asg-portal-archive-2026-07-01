#!/usr/bin/env node
/**
 * Original-source headline aggregator. Never republishes article bodies.
 * External URLs are validated to avoid SSRF; failures are reported, not hidden.
 * A successfully completed refresh updates a timestamped JSON cache. Build
 * consumes that cache; the presence of a schedule does not prove it ran.
 */
import fs from 'node:fs';
import { safeUrl, fetchFeedXml } from './lib/aktual-world-feed-http-v1.mjs';
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
  const xml=await fetchFeedXml(url);
  return extract(xml,now);
}

// The configured source language is provenance, not automatic language detection.
// Preserve original titles; never translate or call an English fallback local-language.
const languageKey=x=>String(x||'').toLowerCase().replace(/_/g,'-').split('-')[0].replace(/^srp$/,'sr');
const matchesLanguage=(source,edition)=>Boolean(languageKey(source)&&languageKey(source)===languageKey(edition));
const isDiscovery=url=>new URL(url).hostname==='news.google.com';
function countryTargets(country){
  const editionLanguage=country.language;
  return (country.sourcesList||[]).filter(s=>s.rss&&safeUrl(s.rss))
    .map(s=>({country:country.slug,source:s.name,url:s.rss,sourceLanguage:s.language||null,editionLanguage,
      localLanguageConfigured:matchesLanguage(s.language,editionLanguage),discoveryOnly:isDiscovery(s.rss)}))
    .sort((a,b)=>Number(b.localLanguageConfigured)-Number(a.localLanguageConfigured)||Number(a.discoveryOnly)-Number(b.discoveryOnly))
    .slice(0,feedLimit);
}
function cityTarget(city,country){
  if(!country)throw Error('Missing city-country registry mapping: '+city.slug);
  const configured=countryTargets(country).find(s=>s.discoveryOnly&&s.localLanguageConfigured);
  const locale=configured?new URL(configured.url):null;
  const lang=locale?.searchParams.get('hl')||languageKey(country.language);
  const region=locale?.searchParams.get('gl')||country.code;
  const u=new URL('https://news.google.com/rss/search');
  u.searchParams.set('q',city.nameLocal||city.nameEn);
  u.searchParams.set('hl',lang);u.searchParams.set('gl',region);u.searchParams.set('ceid',locale?.searchParams.get('ceid')||region+':'+lang);
  return {city:city.slug,source:'Google News',url:u.href,sourceLanguage:lang,editionLanguage:country.language,
    localLanguageConfigured:matchesLanguage(lang,country.language),discoveryOnly:true};
}
function rankHeadlines(rows){
  return rows.sort((a,b)=>Number(b.localLanguageConfigured)-Number(a.localLanguageConfigured)||
    Number(a.discoveryOnly)-Number(b.discoveryOnly)||b.publishedAt.localeCompare(a.publishedAt));
}
const now=Date.now();
const countryBySlug=new Map(data.countries.map(c=>[c.slug,c]));
if(process.argv.includes('--self-test')){
  const hr=countryBySlug.get('hrvatska');
  const t=countryTargets(hr);
  const city=cityTarget(data.cities.find(c=>c.slug==='zagreb'),hr);
  const loc=new URL(city.url);
  if(!t.length||!t[0].localLanguageConfigured||t[0].discoveryOnly||loc.searchParams.get('hl')!=='hr'||loc.searchParams.get('gl')!=='HR'||!matchesLanguage('sr','srp')||matchesLanguage('en','hr'))throw Error('Local language contract failed');
  if(rankHeadlines([{localLanguageConfigured:false,discoveryOnly:false,publishedAt:'2026-11-25'},{localLanguageConfigured:true,discoveryOnly:true,publishedAt:'2026-11-24'}])[0].localLanguageConfigured!==true)throw Error('Local priority failed');
  console.log('Local-language source priority and city locale self-test passed');process.exit(0);
}
const countries=data.countries.slice(0,limitCountries);
const targets=countries.flatMap(countryTargets);
targets.sort((a,b)=>Number(b.country==='hrvatska')-Number(a.country==='hrvatska'));
const cityTargets=data.cities.map(city=>cityTarget(city,countryBySlug.get(city.country)));
targets.unshift(...cityTargets.filter(c=>c.city==='zagreb'));
targets.push(...cityTargets.filter(c=>c.city!=='zagreb'));
const items={}, cityItems={};const errors=[], sourceChecks=[];
let idx=0;
async function worker(){while(idx<targets.length){const target=targets[idx++];const scope=target.city || target.country, kind=target.city ? 'city' : 'country';try{
  const headlines=await fetchFeed(target.url,now);
  ((target.city ? cityItems : items)[scope] ||= []).push(...headlines.map(x=>({...x,source:target.source,sourceLanguage:target.sourceLanguage,editionLanguage:target.editionLanguage,localLanguageConfigured:target.localLanguageConfigured,discoveryOnly:target.discoveryOnly})));
  sourceChecks.push({kind,scope,source:target.source,sourceLanguage:target.sourceLanguage,editionLanguage:target.editionLanguage,localLanguageConfigured:target.localLanguageConfigured,discoveryOnly:target.discoveryOnly,status:headlines.length ? 'headlines' : 'no-eligible-headlines',acceptedHeadlines:headlines.length});
}catch(e){const error=String(e.message).slice(0,120);errors.push({scope,source:target.source,error});sourceChecks.push({kind,scope,source:target.source,status:'failed',error});}}}
await Promise.all(Array.from({length:Math.max(1,Math.min(10,concurrency))},worker));
for(const records of [items,cityItems])for(const [country,rows] of Object.entries(records)){const seen=new Set();records[country]=rankHeadlines(rows).filter(x=>{let key=x.url.split('?')[0];if(seen.has(key))return false;seen.add(key);return true;}).slice(0,maxItems);}
sourceChecks.sort((a,b)=>`${a.kind}:${a.scope}:${a.source}`.localeCompare(`${b.kind}:${b.scope}:${b.source}`));
const report={version:'AKTUAL_WORLD_HEADLINE_CACHE_V1',updatedAt:new Date(now).toISOString(),origin:'external article titles and canonical links only; no republished bodies',countries:items,cities:cityItems,feedAttempts:targets.length,feedFailures:errors.length,errors,sourceChecks};
if((strict&&errors.length)||!([...Object.values(items),...Object.values(cityItems)].some(x=>x.length))){console.error(JSON.stringify({error:'No acceptable updates; previous cache retained',feedAttempts:targets.length,feedFailures:errors.length},null,2));process.exit(1);}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({updatedAt:report.updatedAt,feeds:targets.length,failures:errors.length,countriesWithHeadlines:Object.keys(items).length,headlines:[...Object.values(items),...Object.values(cityItems)].reduce((s,a)=>s+a.length,0)}));
