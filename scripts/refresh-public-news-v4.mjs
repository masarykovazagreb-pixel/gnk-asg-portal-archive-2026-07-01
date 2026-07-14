import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT=path.resolve('apps/portal/data');
const NEWS=path.join(ROOT,'news.json'),ARCHIVE=path.join(ROOT,'news_archive.json'),STATUS=path.join(ROOT,'update_status.json');
const SOURCES=[
 {name:'The Verge',url:'https://www.theverge.com/rss/index.xml',group:'technology'},
 {name:'European Central Bank',url:'https://www.ecb.europa.eu/rss/press.html',group:'international'},
 {name:'International Monetary Fund',url:'https://www.imf.org/en/News/RSS',group:'international'},
 {name:'OECD',url:'https://www.oecd.org/newsroom/rss.xml',group:'international'},
 {name:'European Commission',url:'https://ec.europa.eu/commission/presscorner/api/rss?language=en',group:'international'}
];
const clean=value=>String(value??'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const pick=(block,names)=>{for(const name of names){const match=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));if(match)return clean(match[1]);}return'';};
const href=block=>block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]||pick(block,['link','guid']);
const itemsFrom=(xml,source)=>{const blocks=[...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(match=>match[0]);return blocks.map(block=>{const title=pick(block,['title']),url=href(block),summary=pick(block,['description','summary','content']),published=pick(block,['pubDate','published','updated']);if(!title||!url)return null;const id=crypto.createHash('sha256').update(url).digest('hex').slice(0,18);const stamp=Number.isNaN(Date.parse(published))?new Date().toISOString():new Date(published).toISOString();return{id,title,url,summary:summary.slice(0,900),source:source.name,region:source.name,group:source.group,category:source.group,published_at:stamp,share_url:`/podijeli/vijest/${id}/`};}).filter(Boolean);};
async function fetchText(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{headers:{'user-agent':'GNK-ASG-News-Refresh/4.0','accept':'application/rss+xml,application/atom+xml,text/xml'},signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.text();}finally{clearTimeout(timer);}}
const previous=fs.existsSync(NEWS)?JSON.parse(fs.readFileSync(NEWS,'utf8')):[],archive=fs.existsSync(ARCHIVE)?JSON.parse(fs.readFileSync(ARCHIVE,'utf8')):[];
const fetched=[],errors=[];
for(const source of SOURCES){try{fetched.push(...itemsFrom(await fetchText(source.url),source));}catch(error){errors.push({source:source.name,error:String(error?.message||error)});}}
const seen=new Set(),merged=[...fetched,...previous].sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)).filter(item=>{const key=(item.url||item.title||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;});
const live=merged.slice(0,100),overflow=merged.slice(100),archiveSeen=new Set(),nextArchive=[...overflow,...archive].filter(item=>{const key=(item.url||item.title||'').toLowerCase();if(!key||archiveSeen.has(key))return false;archiveSeen.add(key);return true;}).slice(0,2000);
fs.writeFileSync(NEWS,JSON.stringify(live,null,2));fs.writeFileSync(ARCHIVE,JSON.stringify(nextArchive,null,2));
let status={};try{status=JSON.parse(fs.readFileSync(STATUS,'utf8'))}catch{}
status.updated_at=new Date().toISOString();status.news={updated_at:status.updated_at,status:fetched.length?'ok':'stale-safe',engine:'github_actions_rss_refresh_v4_official_and_technology_feeds',cadence:'every two hours plus manual',public_items:live.length,archive_items:nextArchive.length,fetched_candidates:fetched.length,errors,checked_at:status.updated_at,last_attempt_at:status.updated_at,stale_safe:true};
fs.writeFileSync(STATUS,JSON.stringify(status,null,2));console.log(JSON.stringify(status.news,null,2));
if(!fetched.length&&previous.length===0)process.exitCode=1;
