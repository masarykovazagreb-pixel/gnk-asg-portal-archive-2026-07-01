import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT=path.resolve('apps/portal/data');
const NEWS=path.join(ROOT,'news.json'),ARCHIVE=path.join(ROOT,'news_archive.json'),STATUS=path.join(ROOT,'update_status.json');
const FALLBACK_IMAGE='/assets/news-fallback.svg';
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
const attr=(text,name)=>{const match=text.match(new RegExp(`${name}=["']([^"']+)["']`,'i'));return match?clean(match[1]):'';};
const firstImage=block=>{
 const media=block.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/i)?.[0]||'';
 const mediaUrl=attr(media,'url');
 if(mediaUrl&&/^https?:\/\//i.test(mediaUrl))return mediaUrl;
 const html=block.match(/<(?:description|content:encoded)(?:\s[^>]*)?>([\s\S]*?)<\/(?:description|content:encoded)>/i)?.[1]||'';
 const img=html.match(/<img\b[^>]*>/i)?.[0]||'';
 const src=attr(img,'src');
 return src&&/^https?:\/\//i.test(src)?src:'';
};
const keyFor=item=>(item?.url||item?.title||'').toLowerCase();
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeIfChanged=(file,value)=>{const content=JSON.stringify(value,null,2),before=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;if(before===content)return false;fs.writeFileSync(file,content);return true;};
const itemsFrom=(xml,source,previousByKey)=>{const blocks=[...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(match=>match[0]);return blocks.map(block=>{const title=pick(block,['title']),url=href(block),summary=pick(block,['description','summary','content']),published=pick(block,['pubDate','published','updated']);if(!title||!url)return null;const id=crypto.createHash('sha256').update(url).digest('hex').slice(0,18),key=(url||title).toLowerCase(),prior=previousByKey.get(key);const parsed=Date.parse(published),stamp=Number.isNaN(parsed)?(prior?.published_at||new Date().toISOString()):new Date(parsed).toISOString();const image=firstImage(block)||prior?.image||FALLBACK_IMAGE;return{id,title,url,summary:summary.slice(0,900),source:source.name,region:source.name,group:source.group,category:source.group,published_at:stamp,share_url:`/podijeli/vijest/${id}/`,image,image_attribution:image===FALLBACK_IMAGE?'GNK ASG':source.name};}).filter(Boolean);};
async function fetchText(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{headers:{'user-agent':'GNK-ASG-News-Refresh/4.1','accept':'application/rss+xml,application/atom+xml,text/xml'},signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.text();}finally{clearTimeout(timer);}}
const previous=readJson(NEWS,[]),archive=readJson(ARCHIVE,[]),previousStatus=readJson(STATUS,{});
const previousByKey=new Map([...previous,...archive].map(item=>[keyFor(item),item]));
const fetched=[],errors=[];
for(const source of SOURCES){try{fetched.push(...itemsFrom(await fetchText(source.url),source,previousByKey));}catch(error){errors.push({source:source.name,error:String(error?.message||error)});}}
const seen=new Set(),merged=[...fetched,...previous].sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)).filter(item=>{const key=keyFor(item);if(!key||seen.has(key))return false;seen.add(key);return true;});
const live=merged.slice(0,100),overflow=merged.slice(100),archiveSeen=new Set(),nextArchive=[...overflow,...archive].filter(item=>{const key=keyFor(item);if(!key||archiveSeen.has(key))return false;archiveSeen.add(key);return true;}).slice(0,2000);
const newsChanged=writeIfChanged(NEWS,live),archiveChanged=writeIfChanged(ARCHIVE,nextArchive),contentChanged=newsChanged||archiveChanged;
const statusValue=fetched.length?'ok':'stale-safe';
const semantic={status:statusValue,engine:'github_actions_rss_refresh_v4_official_and_technology_feeds',cadence:'every two hours plus manual',public_items:live.length,archive_items:nextArchive.length,stale_safe:true};
const previousSemantic=previousStatus.news?{status:previousStatus.news.status,engine:previousStatus.news.engine,cadence:previousStatus.news.cadence,public_items:previousStatus.news.public_items,archive_items:previousStatus.news.archive_items,stale_safe:previousStatus.news.stale_safe}:null;
const statusChanged=JSON.stringify(previousSemantic)!==JSON.stringify(semantic);
const checkedAt=new Date().toISOString();
if(contentChanged||statusChanged){const status={...previousStatus,updated_at:checkedAt,news:{...semantic,errors,content_changed:contentChanged,updated_at:checkedAt,checked_at:checkedAt,last_attempt_at:checkedAt}};writeIfChanged(STATUS,status);}
console.log(JSON.stringify({...semantic,errors,content_changed:contentChanged,checked_at:checkedAt,fetched_candidates:fetched.length,persisted:contentChanged||statusChanged},null,2));
if(!fetched.length&&previous.length===0)process.exitCode=1;
