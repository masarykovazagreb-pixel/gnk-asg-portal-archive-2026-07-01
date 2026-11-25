import {safeUrl} from './aktual-world-feed-http-v1.mjs';

// Registry language is configuration, not evidence of the language of every item.
// Prefer direct local-language publishers; aggregator feeds remain a fallback.
export function selectCountryFeeds(country, limit = 10) {
 const language=String(country.language||'').toLowerCase();
 const seen=new Set();
 return (country.sourcesList||[]).filter(source=>{
  const url=safeUrl(source.rss);const sourceLanguage=String(source.language||'').toLowerCase();
  if(!url||!source.name||!language||sourceLanguage!==language||seen.has(url))return false;
  seen.add(url);return true;
 }).map((source,index)=>({source,index,aggregator:new URL(source.rss).hostname.toLowerCase().replace(/^www\./,'')==='news.google.com'}))
   .sort((a,b)=>Number(a.aggregator)-Number(b.aggregator)||a.index-b.index)
   .slice(0,limit).map(x=>x.source);
}

// Draw one headline per source per round so a high-volume feed cannot crowd
// out every other outlet; final presentation remains chronological.
export function diversifyHeadlines(rows, limit=30) {
 const bySource=new Map();
 for(const row of [...rows].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))){
  const key=row.source; if(!bySource.has(key))bySource.set(key,[]);bySource.get(key).push(row);
 }
 const queues=[...bySource.values()], selected=[],seen=new Set();
 while(selected.length<limit && queues.some(q=>q.length)){
  for(const q of queues){
   while(q.length && selected.length<limit){
    const row=q.shift(),key=row.url.split('?')[0];
    if(seen.has(key))continue;
    seen.add(key);selected.push(row);break;
   }
   if(selected.length>=limit)break;
  }
 }
 return selected.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
}
