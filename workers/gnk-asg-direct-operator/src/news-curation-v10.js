export const VERSION='GNK_ASG_NEWS_CURATION_V11_20260625';
export const NEWS_MINIMUM=30;
export const NEWS_HOURS_ZAGREB=new Set([9,15,21]);
export const FEEDS=[
['BBC Business','business','world',100,'https://feeds.bbci.co.uk/news/business/rss.xml'],
['BBC Technology','technology','world',96,'https://feeds.bbci.co.uk/news/technology/rss.xml'],
['The Guardian Business','business','world',94,'https://www.theguardian.com/uk/business/rss'],
['The Guardian Technology','technology','world',90,'https://www.theguardian.com/uk/technology/rss'],
['The New York Times Business','business','world',94,'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml'],
['The New York Times Technology','technology','world',90,'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'],
['CNBC World','markets','world',92,'https://www.cnbc.com/id/100727362/device/rss/rss.html'],
['CNBC Technology','technology','world',88,'https://www.cnbc.com/id/19854910/device/rss/rss.html'],
['TechCrunch','technology','world',88,'https://techcrunch.com/feed/'],
['WIRED Business','technology','world',84,'https://www.wired.com/feed/category/business/latest/rss'],
['MIT Technology Review','technology','world',91,'https://www.technologyreview.com/feed/'],
['VentureBeat','technology','world',82,'https://venturebeat.com/feed/'],
['EURACTIV','europe','Europe',96,'https://www.euractiv.com/feed/'],
['POLITICO Europe','europe','Europe',94,'https://www.politico.eu/feed/'],
['EU-Startups','investment','Europe',84,'https://www.eu-startups.com/feed/'],
['Sifted','investment','Europe',86,'https://sifted.eu/feed'],
['Emerging Europe','investment','Europe',82,'https://emerging-europe.com/feed/'],
['Balkan Green Energy News','energy','Southeast Europe',88,'https://balkangreenenergynews.com/feed/'],
['World Economic Forum','business','world',86,'https://www.weforum.org/agenda/rss.xml'],
['IMF Blog','economy','world',92,'https://www.imf.org/en/Blogs/rss'],
['World Bank Blogs','investment','world',91,'https://blogs.worldbank.org/en/rss'],
['OECD Newsroom','economy','world',90,'https://www.oecd.org/newsroom/rss.xml'],
['CoinDesk','digital-assets','world',78,'https://www.coindesk.com/arc/outboundfeeds/rss/'],
['Decrypt','digital-assets','world',74,'https://decrypt.co/feed']
];
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const slug=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'news';
const now=()=>new Date().toISOString();
function decode(v){return String(v||'').replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function tag(block,name){const m=String(block||'').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decode(m[1]):''}
function itemLink(block){const direct=tag(block,'link');if(/^https?:\/\//i.test(direct))return direct;const m=String(block||'').match(/<link[^>]+href=["']([^"']+)["']/i);return m?decode(m[1]):''}
function parse(xml,f){const blocks=String(xml||'').match(/<item[\s\S]*?<\/item>/gi)||String(xml||'').match(/<entry[\s\S]*?<\/entry>/gi)||[];return blocks.slice(0,12).map((b,i)=>{const title=clean(tag(b,'title')),url=itemLink(b),raw=tag(b,'pubDate')||tag(b,'published')||tag(b,'updated')||tag(b,'dc:date'),ts=Date.parse(raw||''),publishedAt=Number.isFinite(ts)?new Date(ts).toISOString():now(),summary=clean(tag(b,'description')||tag(b,'summary')||tag(b,'content')).slice(0,700),relevance=/invest|market|business|econom|financ|technology|artificial intelligence|energy|startup|trade|company|corporate|sport/i.test(`${title} ${summary}`)?18:0,age=Number.isFinite(ts)?Math.max(0,(Date.now()-ts)/36e5):9999;return{id:`external-${slug(`${f[0]}-${i}-${title}`)}`,title,summary,url,sourceUrl:url,source:f[0],category:f[1],group:f[1],region:f[2],publishedAt,published_at:publishedAt,language:'en',external:true,score:f[3]+relevance+Math.max(0,36-age)}}).filter(x=>x.title&&/^https?:\/\//i.test(x.url))}
async function fetchFeed(f){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(f[4],{headers:{'user-agent':'GNK-ASG-Intelligence-Desk/11.0',accept:'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'},signal:controller.signal});const body=await r.text();if(!r.ok)throw new Error(`HTTP_${r.status}`);return parse(body,f)}finally{clearTimeout(timer)}}
function diverse(items,limit=120){const seen=new Set(),unique=items.filter(x=>{const k=String(x.url||'').toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(b.score||0)-(a.score||0));const first=[],sources=new Set();for(const x of unique)if(!sources.has(x.source)){first.push(x);sources.add(x.source)}const used=new Set(first.map(x=>x.url));return [...first,...unique.filter(x=>!used.has(x.url))].slice(0,limit).sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0))}
export async function refreshCuratedNews({read,write}){const startedAt=now(),settled=await Promise.allSettled(FEEDS.map(fetchFeed)),items=[],errors=[],successful=[];settled.forEach((r,i)=>{if(r.status==='fulfilled'){successful.push(FEEDS[i][0]);items.push(...r.value)}else errors.push({source:FEEDS[i][0],url:FEEDS[i][4],error:String(r.reason?.message||r.reason)})});const fresh=diverse(items),previous=await read('data:news:external',{items:[]}),merged=diverse([...fresh,...(Array.isArray(previous?.items)?previous.items:[])]),status=fresh.length>=NEWS_MINIMUM?'LIVE':fresh.length?'DELAYED':merged.length?'FALLBACK':'UNAVAILABLE',payload={ok:merged.length>0,version:VERSION,status,updatedAt:now(),startedAt,schedule:'09:00, 15:00 and 21:00 Europe/Zagreb',minimumLinks:NEWS_MINIMUM,count:merged.length,freshCount:fresh.length,configuredSourceCount:FEEDS.length,successfulSourceCount:successful.length,sources:FEEDS.map(f=>({name:f[0],category:f[1],region:f[2],url:f[4]})),successfulSources:successful,errors,items:merged};await write('data:news:external',payload);await write('automation:news-refresh:last',{ok:payload.ok,status,updatedAt:payload.updatedAt,count:payload.count,freshCount:payload.freshCount,successfulSourceCount:successful.length,configuredSourceCount:FEEDS.length,errorCount:errors.length,schedule:payload.schedule});return payload}
