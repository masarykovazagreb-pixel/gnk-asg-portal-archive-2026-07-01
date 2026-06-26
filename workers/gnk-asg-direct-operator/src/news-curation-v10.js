export const VERSION='GNK_ASG_NEWS_LIFECYCLE_V15_20260626';
export const NEWS_MINIMUM=25;
export const NEWS_HOURS_ZAGREB=new Set([9,16,21]);
export const NEWS_SCHEDULE=['09:00','16:00','21:00'];
export const ACTIVE_NEWS_LIMIT=100;
export const ARCHIVE_PRUNE_AT=1000;
export const ARCHIVE_DELETE_COUNT=500;
export const ARCHIVE_RETAIN_AFTER_PRUNE=500;
export const FALLBACK_IMAGE='/assets/news-fallback.svg';

// name, category, region, score, RSS/Atom URL, language
// 13 global + 9 European/regional + 4 Croatian sources.
export const FEEDS=[
['BBC Business','business','world',100,'https://feeds.bbci.co.uk/news/business/rss.xml','en'],
['The Guardian Business','business','world',96,'https://www.theguardian.com/business/rss','en'],
['The New York Times Business','business','world',95,'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml','en'],
['CNBC World','markets','world',94,'https://www.cnbc.com/id/100727362/device/rss/rss.html','en'],
['TechCrunch','technology','world',92,'https://techcrunch.com/feed/','en'],
['MIT Technology Review','technology','world',91,'https://www.technologyreview.com/feed/','en'],
['Wired','technology','world',90,'https://www.wired.com/feed/rss','en'],
['CoinDesk','digital-assets','world',88,'https://www.coindesk.com/arc/outboundfeeds/rss/','en'],
['World Economic Forum','business','world',87,'https://www.weforum.org/agenda/rss.xml','en'],
['IMF Blog','economy','world',86,'https://www.imf.org/en/Blogs/rss','en'],
['Ars Technica','technology','world',91,'https://feeds.arstechnica.com/arstechnica/index','en'],
['The Verge','technology','world',90,'https://www.theverge.com/rss/index.xml','en'],
['VentureBeat','technology','world',89,'https://venturebeat.com/feed/','en'],
['European Central Bank','economy','Europe',96,'https://www.ecb.europa.eu/rss/press.html','en'],
['European Commission Press Corner','economy','Europe',94,'https://ec.europa.eu/commission/presscorner/api/rss?language=en','en'],
['Balkan Green Energy News','energy','Southeast Europe',95,'https://balkangreenenergynews.com/feed/','en'],
['The Slovenia Times','business','Slovenia',91,'https://sloveniatimes.com/feed/','en'],
['Sarajevo Times','business','Bosnia and Herzegovina',91,'https://sarajevotimes.com/feed/','en'],
['Capital.ba','business','Bosnia and Herzegovina',90,'https://capital.ba/feed/','bs'],
['BiznisInfo.ba','business','Bosnia and Herzegovina',89,'https://www.biznisinfo.ba/feed/','bs'],
['Biznis.rs','business','Serbia',91,'https://biznis.rs/feed/','sr'],
['SEEbiz','business','Southeast Europe',90,'https://www.seebiz.eu/rss/','hr'],
['Poslovni dnevnik','business','Croatia',100,'https://www.poslovni.hr/feed','hr'],
['Lider Media','business','Croatia',98,'https://lidermedia.hr/feed/','hr'],
['Tportal Hrvatska','domestic','Croatia',95,'https://www.tportal.hr/rss','hr'],
['Netokracija','technology','Croatia',94,'https://www.netokracija.com/feed','hr']
];

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const now=()=>new Date().toISOString();
const slug=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)||'news';

function decode(value){return String(value||'').replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function rawTag(block,name){const match=String(block||'').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));return match?String(match[1]||''):''}
function tag(block,name){return decode(rawTag(block,name))}
function attr(block,name,attribute){const match=String(block||'').match(new RegExp(`<${name}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,'i'));return match?decode(match[1]):''}
function itemLink(block){const direct=tag(block,'link');if(/^https?:\/\//i.test(direct))return direct;const match=String(block||'').match(/<link[^>]+href=["']([^"']+)["']/i);return match?decode(match[1]):''}
function validHttpUrl(value,base=''){
  const raw=String(value||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw,base||undefined);
    return /^https?:$/.test(url.protocol)?url.href:'';
  }catch{return''}
}
function itemImage(block,itemUrl){
  const enclosure=String(block||'').match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  const htmlBody=[rawTag(block,'description'),rawTag(block,'content:encoded'),rawTag(block,'content'),rawTag(block,'summary')].join(' ');
  const htmlImage=htmlBody.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  const candidates=[
    attr(block,'media:content','url'),
    attr(block,'media:thumbnail','url'),
    attr(block,'image','href'),
    enclosure?decode(enclosure[1]):'',
    htmlImage?decode(htmlImage[1]):''
  ];
  for(const candidate of candidates){const url=validHttpUrl(candidate,itemUrl);if(url)return url}
  return FALLBACK_IMAGE;
}

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
  return blocks.slice(0,30).map(block=>{
    const title=clean(tag(block,'title')),
      url=itemLink(block),
      rawDate=tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')||tag(block,'dc:date'),
      timestamp=Date.parse(rawDate||''),
      publishedAt=Number.isFinite(timestamp)?new Date(timestamp).toISOString():now(),
      summary=clean(tag(block,'description')||tag(block,'summary')||tag(block,'content:encoded')||tag(block,'content')).slice(0,900),
      image=itemImage(block,url),
      relevance=/hrvats|croat|zagreb|invest|market|business|econom|financ|technology|artificial intelligence|energy|startup|trade|company|corporate|sport/i.test(`${title} ${summary}`)?18:0,
      ageHours=Number.isFinite(timestamp)?Math.max(0,(Date.now()-timestamp)/36e5):9999;
    return{id:`external-${slug(`${feed[0]}-${title}-${url}`)}`,title,summary,url,sourceUrl:url,source:feed[0],category:feed[1],group:feed[1],region:feed[2],publishedAt,published_at:publishedAt,language:feed[5]||'en',external:true,image,imageAlt:title,imageCredit:feed[0],hasSourceImage:image!==FALLBACK_IMAGE,score:feed[3]+relevance+Math.max(0,48-ageHours),collectedAt:now()};
  }).filter(item=>item.title&&/^https?:\/\//i.test(item.url));
}

async function fetchFeed(feed){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(feed[4],{headers:{'user-agent':'GNK-ASG-Intelligence-Desk/15.0',accept:'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'},signal:controller.signal});
    const body=await response.text();
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    return parse(body,feed);
  }finally{clearTimeout(timer)}
}

function uniqueSorted(items,limit=3000){
  const seen=new Set();
  return (Array.isArray(items)?items:[]).filter(item=>item&&clean(item.title)&&(item.url||item.sourceUrl)).map(item=>({...item,image:item.image||FALLBACK_IMAGE,imageAlt:item.imageAlt||item.title,imageCredit:item.imageCredit||item.source||'Izvor'})).sort((a,b)=>publishedTime(b)-publishedTime(a)||((b.score||0)-(a.score||0))).filter(item=>{const key=itemKey(item);if(!key||seen.has(key))return false;seen.add(key);return true}).slice(0,limit);
}

function selectActive(items){return uniqueSorted(items,ACTIVE_NEWS_LIMIT)}

export async function refreshCuratedNews({read,write}){
  const startedAt=now(),settled=await Promise.allSettled(FEEDS.map(fetchFeed)),fresh=[],errors=[],successful=[];
  settled.forEach((result,index)=>{if(result.status==='fulfilled'){successful.push(FEEDS[index][0]);fresh.push(...result.value)}else errors.push({source:FEEDS[index][0],url:FEEDS[index][4],error:String(result.reason?.message||result.reason)})});

  const previousPayload=await read('data:news:external',{items:[]}),previousActive=Array.isArray(previousPayload?.items)?previousPayload.items:[],archivePayload=await read('data:news:archive',{items:[]}),previousArchive=Array.isArray(archivePayload?.items)?archivePayload.items:[];
  const combined=uniqueSorted([...fresh,...previousActive]),active=selectActive(combined),activeKeys=new Set(active.map(itemKey)),overflow=combined.filter(item=>!activeKeys.has(itemKey(item)));
  let archive=uniqueSorted([...overflow,...previousArchive],3000),deletedFromArchive=0;
  if(archive.length>=ARCHIVE_PRUNE_AT){deletedFromArchive=archive.length-ARCHIVE_RETAIN_AFTER_PRUNE;archive=archive.slice(0,ARCHIVE_RETAIN_AFTER_PRUNE)}

  const status=fresh.length>=NEWS_MINIMUM?'LIVE':fresh.length?'DELAYED':active.length?'FALLBACK':'UNAVAILABLE',updatedAt=now();
  const payload={ok:active.length>0,version:VERSION,status,updatedAt,startedAt,schedule:'09:00, 16:00 and 21:00 Europe/Zagreb',scheduleSlots:NEWS_SCHEDULE,minimumLinks:NEWS_MINIMUM,activeLimit:ACTIVE_NEWS_LIMIT,count:active.length,freshCount:fresh.length,croatianCount:active.filter(item=>item.region==='Croatia').length,regionalCount:active.filter(item=>['Europe','Serbia','Slovenia','Bosnia and Herzegovina','Southeast Europe'].includes(item.region)).length,globalCount:active.filter(item=>item.region==='world').length,withSourceImageCount:active.filter(item=>item.hasSourceImage).length,archiveCount:archive.length,archivePruneAt:ARCHIVE_PRUNE_AT,archiveDeleteCount:ARCHIVE_DELETE_COUNT,archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,deletedFromArchive,configuredSourceCount:FEEDS.length,sourceMix:{global:13,regional:9,croatian:4},successfulSourceCount:successful.length,sources:FEEDS.map(feed=>({name:feed[0],category:feed[1],region:feed[2],url:feed[4],language:feed[5]})),successfulSources:successful,errors,items:active};
  await write('data:news:external',payload);
  await write('data:news:archive',{ok:true,version:VERSION,updatedAt,count:archive.length,pruneAt:ARCHIVE_PRUNE_AT,deleteCount:ARCHIVE_DELETE_COUNT,retainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,lastDeletedCount:deletedFromArchive,items:archive});
  await write('automation:news-refresh:last',{ok:payload.ok,status,updatedAt,count:payload.count,freshCount:payload.freshCount,croatianCount:payload.croatianCount,regionalCount:payload.regionalCount,globalCount:payload.globalCount,withSourceImageCount:payload.withSourceImageCount,archiveCount:payload.archiveCount,deletedFromArchive,successfulSourceCount:successful.length,configuredSourceCount:FEEDS.length,errorCount:errors.length,schedule:payload.schedule});
  return payload;
}
