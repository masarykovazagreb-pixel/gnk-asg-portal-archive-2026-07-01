export const VERSION='GNK_ASG_NEWS_LIFECYCLE_V12_20260626';
export const NEWS_MINIMUM=25;
export const NEWS_HOURS_ZAGREB=new Set([8,16,20]);
export const ACTIVE_NEWS_LIMIT=100;
export const ARCHIVE_PRUNE_AT=1000;
export const ARCHIVE_DELETE_COUNT=500;

// name, category, region, score, RSS/Atom URL, language
export const FEEDS=[
['BBC Business','business','world',100,'https://feeds.bbci.co.uk/news/business/rss.xml','en'],
['BBC Technology','technology','world',96,'https://feeds.bbci.co.uk/news/technology/rss.xml','en'],
['The Guardian Business','business','world',94,'https://www.theguardian.com/uk/business/rss','en'],
['The Guardian Technology','technology','world',90,'https://www.theguardian.com/uk/technology/rss','en'],
['The New York Times Business','business','world',94,'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml','en'],
['The New York Times Technology','technology','world',90,'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml','en'],
['CNBC World','markets','world',92,'https://www.cnbc.com/id/100727362/device/rss/rss.html','en'],
['CNBC Technology','technology','world',88,'https://www.cnbc.com/id/19854910/device/rss/rss.html','en'],
['TechCrunch','technology','world',88,'https://techcrunch.com/feed/','en'],
['MIT Technology Review','technology','world',91,'https://www.technologyreview.com/feed/','en'],
['EURACTIV','europe','Europe',96,'https://www.euractiv.com/feed/','en'],
['POLITICO Europe','europe','Europe',94,'https://www.politico.eu/feed/','en'],
['EU-Startups','investment','Europe',84,'https://www.eu-startups.com/feed/','en'],
['Balkan Green Energy News','energy','Southeast Europe',88,'https://balkangreenenergynews.com/feed/','en'],
['World Economic Forum','business','world',86,'https://www.weforum.org/agenda/rss.xml','en'],
['IMF Blog','economy','world',92,'https://www.imf.org/en/Blogs/rss','en'],
['World Bank Blogs','investment','world',91,'https://blogs.worldbank.org/en/rss','en'],
['OECD Newsroom','economy','world',90,'https://www.oecd.org/newsroom/rss.xml','en'],
['CoinDesk','digital-assets','world',78,'https://www.coindesk.com/arc/outboundfeeds/rss/','en'],
['N1 Hrvatska','domestic','Croatia',99,'https://n1info.hr/feed/','hr'],
['Poslovni dnevnik','business','Croatia',100,'https://www.poslovni.hr/feed','hr'],
['Tportal Hrvatska','domestic','Croatia',94,'https://www.tportal.hr/rss','hr'],
['Večernji list','domestic','Croatia',92,'https://www.vecernji.hr/rss','hr'],
['Index.hr','domestic','Croatia',91,'https://www.index.hr/rss','hr'],
['Lider Media','business','Croatia',98,'https://lidermedia.hr/rss','hr']
];

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const now=()=>new Date().toISOString();
const slug=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'news';

function decode(value){return String(value||'').replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function tag(block,name){const match=String(block||'').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));return match?decode(match[1]):''}
function itemLink(block){const direct=tag(block,'link');if(/^https?:\/\//i.test(direct))return direct;const match=String(block||'').match(/<link[^>]+href=["']([^"']+)["']/i);return match?decode(match[1]):''}

function canonicalUrl(value){
  try{
    const url=new URL(String(value||''));
    url.hash='';
    for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid','mc_cid','mc_eid'].includes(key.toLowerCase()))url.searchParams.delete(key);
    url.hostname=url.hostname.toLowerCase();
    url.pathname=url.pathname.replace(/\/+$/,'')||'/';
    return url.toString().toLowerCase();
  }catch{return clean(value).toLowerCase()}
}
function itemKey(item){return canonicalUrl(item?.url||item?.sourceUrl)||`${clean(item?.source).toLowerCase()}|${clean(item?.title).toLowerCase()}`}
function publishedTime(item){const value=Date.parse(item?.publishedAt||item?.published_at||'');return Number.isFinite(value)?value:0}

function parse(xml,feed){
  const blocks=String(xml||'').match(/<item[\s\S]*?<\/item>/gi)||String(xml||'').match(/<entry[\s\S]*?<\/entry>/gi)||[];
  return blocks.slice(0,20).map(block=>{
    const title=clean(tag(block,'title')),url=itemLink(block),rawDate=tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')||tag(block,'dc:date'),timestamp=Date.parse(rawDate||''),publishedAt=Number.isFinite(timestamp)?new Date(timestamp).toISOString():now(),summary=clean(tag(block,'description')||tag(block,'summary')||tag(block,'content')).slice(0,900),relevance=/hrvats|croat|zagreb|invest|market|business|econom|financ|technology|artificial intelligence|energy|startup|trade|company|corporate|sport/i.test(`${title} ${summary}`)?18:0,ageHours=Number.isFinite(timestamp)?Math.max(0,(Date.now()-timestamp)/36e5):9999;
    return{id:`external-${slug(`${feed[0]}-${title}-${url}`)}`,title,summary,url,sourceUrl:url,source:feed[0],category:feed[1],group:feed[1],region:feed[2],publishedAt,published_at:publishedAt,language:feed[5]||'en',external:true,score:feed[3]+relevance+Math.max(0,48-ageHours),collectedAt:now()};
  }).filter(item=>item.title&&/^https?:\/\//i.test(item.url));
}

async function fetchFeed(feed){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(feed[4],{headers:{'user-agent':'GNK-ASG-Intelligence-Desk/12.0',accept:'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'},signal:controller.signal});
    const body=await response.text();
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    return parse(body,feed);
  }finally{clearTimeout(timer)}
}

function uniqueSorted(items,limit=3000){
  const seen=new Set();
  return (Array.isArray(items)?items:[]).filter(item=>item&&clean(item.title)&&(item.url||item.sourceUrl)).sort((a,b)=>publishedTime(b)-publishedTime(a)||((b.score||0)-(a.score||0))).filter(item=>{const key=itemKey(item);if(!key||seen.has(key))return false;seen.add(key);return true}).slice(0,limit);
}

function selectActive(items){
  const all=uniqueSorted(items),domestic=all.filter(item=>item.region==='Croatia'||item.language==='hr'),international=all.filter(item=>!(item.region==='Croatia'||item.language==='hr'));
  const selected=[...domestic.slice(0,35),...international.slice(0,65)],used=new Set(selected.map(itemKey));
  for(const item of all){if(selected.length>=ACTIVE_NEWS_LIMIT)break;if(!used.has(itemKey(item))){selected.push(item);used.add(itemKey(item))}}
  return uniqueSorted(selected,ACTIVE_NEWS_LIMIT);
}

export async function refreshCuratedNews({read,write}){
  const startedAt=now(),settled=await Promise.allSettled(FEEDS.map(fetchFeed)),fresh=[],errors=[],successful=[];
  settled.forEach((result,index)=>{if(result.status==='fulfilled'){successful.push(FEEDS[index][0]);fresh.push(...result.value)}else errors.push({source:FEEDS[index][0],url:FEEDS[index][4],error:String(result.reason?.message||result.reason)})});

  const previousPayload=await read('data:news:external',{items:[]}),previousActive=Array.isArray(previousPayload?.items)?previousPayload.items:[],archivePayload=await read('data:news:archive',{items:[]}),previousArchive=Array.isArray(archivePayload?.items)?archivePayload.items:[];
  const combined=uniqueSorted([...fresh,...previousActive]),active=selectActive(combined),activeKeys=new Set(active.map(itemKey)),overflow=combined.filter(item=>!activeKeys.has(itemKey(item)));
  let archive=uniqueSorted([...overflow,...previousArchive],3000),deletedFromArchive=0;
  if(archive.length>=ARCHIVE_PRUNE_AT){const keep=Math.max(0,archive.length-ARCHIVE_DELETE_COUNT);deletedFromArchive=archive.length-keep;archive=archive.slice(0,keep)}

  const status=fresh.length>=NEWS_MINIMUM?'LIVE':fresh.length?'DELAYED':active.length?'FALLBACK':'UNAVAILABLE',updatedAt=now();
  const payload={ok:active.length>0,version:VERSION,status,updatedAt,startedAt,schedule:'08:00, 16:00 and 20:00 Europe/Zagreb',minimumLinks:NEWS_MINIMUM,activeLimit:ACTIVE_NEWS_LIMIT,count:active.length,freshCount:fresh.length,domesticCount:active.filter(item=>item.region==='Croatia'||item.language==='hr').length,internationalCount:active.filter(item=>!(item.region==='Croatia'||item.language==='hr')).length,archiveCount:archive.length,archivePruneAt:ARCHIVE_PRUNE_AT,archiveDeleteCount:ARCHIVE_DELETE_COUNT,deletedFromArchive,configuredSourceCount:FEEDS.length,successfulSourceCount:successful.length,sources:FEEDS.map(feed=>({name:feed[0],category:feed[1],region:feed[2],url:feed[4],language:feed[5]})),successfulSources:successful,errors,items:active};
  await write('data:news:external',payload);
  await write('data:news:archive',{ok:true,version:VERSION,updatedAt,count:archive.length,pruneAt:ARCHIVE_PRUNE_AT,deleteCount:ARCHIVE_DELETE_COUNT,lastDeletedCount:deletedFromArchive,items:archive});
  await write('automation:news-refresh:last',{ok:payload.ok,status,updatedAt,count:payload.count,freshCount:payload.freshCount,domesticCount:payload.domesticCount,internationalCount:payload.internationalCount,archiveCount:payload.archiveCount,deletedFromArchive,successfulSourceCount:successful.length,configuredSourceCount:FEEDS.length,errorCount:errors.length,schedule:payload.schedule});
  return payload;
}
