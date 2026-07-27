// Dynamic Aktual Media technology radar. Edge-cached only: no KV, D1 or asset persistence.
export const VERSION='GNK_ASG_PUBLIC_TECH_RADAR_V1_20260727';
export const TECH_RADAR_PATH='/api/public-tech-radar';
export const REFRESH_SECONDS=7200;
export const MAX_ITEMS=200;

const TOPICS=[
 {query:'artificial intelligence OR generative AI OR LLM',category:'technology',subcategory:'AI i umjetna inteligencija'},
 {query:'cybersecurity OR security vulnerability OR privacy',category:'technology',subcategory:'Kibernetička sigurnost'},
 {query:'startup OR venture capital OR funding OR SaaS',category:'economy',subcategory:'Startupi i ulaganja'},
 {query:'open source OR GitHub OR Linux',category:'technology',subcategory:'Open source'},
 {query:'cloud computing OR data center OR DevOps OR Kubernetes',category:'technology',subcategory:'Cloud i infrastruktura'},
 {query:'semiconductor OR chip OR hardware OR GPU',category:'technology',subcategory:'Hardver i čipovi'},
 {query:'programming OR software development OR web development',category:'technology',subcategory:'Razvoj softvera'},
 {query:'robotics OR automation OR autonomous',category:'technology',subcategory:'Robotika i automatizacija'}
];

const clean=(value,max=500)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const safeUrl=value=>{try{const url=new URL(String(value||''));return /^https?:$/.test(url.protocol)?url.toString():'';}catch{return ''}};
const hostOf=value=>{try{return new URL(value).hostname.replace(/^www\./,'');}catch{return 'Hacker News'}};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${REFRESH_SECONDS}, stale-while-revalidate=${REFRESH_SECONDS}`,'x-content-type-options':'nosniff','x-gnk-tech-radar':VERSION}});

function normalize(hit,topic){
 const url=safeUrl(hit.url)||safeUrl(`https://news.ycombinator.com/item?id=${hit.objectID}`);
 const title=clean(hit.title||hit.story_title,260);
 if(!url||!title)return null;
 return {
  id:`hn-${clean(hit.objectID,40)}`,
  title,
  summary:clean(hit.story_text||`Međunarodna tehnološka vijest iz područja: ${topic.subcategory}.`,420),
  url,
  source:hostOf(url),
  published_at:hit.created_at||new Date((Number(hit.created_at_i)||0)*1000).toISOString(),
  group:topic.category,
  category:topic.category==='economy'?'Burza i biznis':'Tehnologija',
  subcategory:topic.subcategory,
  points:Number(hit.points)||0,
  comments:Number(hit.num_comments)||0,
  author:clean(hit.author,100),
  image:'https://gnk-asg.hr/assets/editorial/aktual-media-800.webp',
  external:true,
  provider:'Hacker News / Algolia'
 };
}

async function queryTopic(topic){
 const endpoint=new URL('https://hn.algolia.com/api/v1/search_by_date');
 endpoint.searchParams.set('query',topic.query);
 endpoint.searchParams.set('tags','story');
 endpoint.searchParams.set('hitsPerPage','40');
 const response=await fetch(endpoint,{headers:{accept:'application/json','user-agent':'GNK-ASG-Aktual-Tech-Radar/1.0'},cf:{cacheEverything:true,cacheTtl:REFRESH_SECONDS}});
 if(!response.ok)throw new Error(`hn_${response.status}`);
 const data=await response.json();
 return (data.hits||[]).map(hit=>normalize(hit,topic)).filter(Boolean);
}

export async function loadTechRadar(){
 const settled=await Promise.allSettled(TOPICS.map(queryTopic));
 const seen=new Set();
 const items=[];
 for(const result of settled){
  if(result.status!=='fulfilled')continue;
  for(const item of result.value){
   const key=(item.url||item.title).toLowerCase();
   if(seen.has(key))continue;
   seen.add(key);
   items.push(item);
  }
 }
 items.sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)||b.points-a.points);
 return items.slice(0,MAX_ITEMS);
}

function cacheRequest(){return new Request('https://cache.gnk-asg.internal/api/public-tech-radar',{method:'GET'});}
export async function warmTechRadarCache(){
 const items=await loadTechRadar();
 const payload={ok:true,source:'Hacker News / Algolia',generated_at:new Date().toISOString(),refresh_seconds:REFRESH_SECONDS,persistent_storage:false,total:items.length,items};
 const response=json(payload,items.length?200:503);
 if(typeof caches!=='undefined'&&caches.default)await caches.default.put(cacheRequest(),response.clone());
 return payload;
}

export async function servePublicTechRadar(request){
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method)||url.pathname.replace(/\/+$/,'')!==TECH_RADAR_PATH)return null;
 try{
  const cached=typeof caches!=='undefined'&&caches.default?await caches.default.match(cacheRequest()):null;
  if(cached){
   const headers=new Headers(cached.headers);headers.set('x-gnk-cache','hit');
   return new Response(request.method==='HEAD'?null:cached.body,{status:cached.status,headers});
  }
  const payload=await warmTechRadarCache();
  const response=json(payload,payload.items.length?200:503);const headers=new Headers(response.headers);headers.set('x-gnk-cache','miss');
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }catch(error){return json({ok:false,error:'tech_radar_unavailable',message:clean(error?.message,180),items:[]},502);}
}

export async function maybeWarmTechRadar(event){
 const scheduled=Number(event?.scheduledTime||Date.now());
 const hour=new Date(scheduled).getUTCHours();
 if(hour%2!==0)return {skipped:true,reason:'two_hour_window'};
 return warmTechRadarCache();
}
