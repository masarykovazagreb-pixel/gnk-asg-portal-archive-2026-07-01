export const VERSION='GNK_ASG_PUBLIC_WORLD_MARKETS_V1_20260719_INDICES_COMMODITIES';
export const PUBLIC_API_PATH='/api/public-world-markets';
export const API_PATHS=new Set([PUBLIC_API_PATH]);

const INDICES=[
 ['^spx','S&P 500','US'],
 ['^dji','Dow Jones Industrial','US'],
 ['^ndq','Nasdaq Composite','US'],
 ['^dax','DAX','DE'],
 ['^cac','CAC 40','FR'],
 ['^ftse','FTSE 100','GB'],
 ['^n225','Nikkei 225','JP'],
 ['^hsi','Hang Seng','HK']
];
const COMMODITIES=[
 ['xauusd','Zlato (Gold)'],
 ['xagusd','Srebro (Silver)'],
 ['cl.f','Sirova nafta (WTI Crude)'],
 ['ng.f','Prirodni plin (Natural Gas)']
];
const ALL=[...INDICES.map(([symbol,name,country])=>({symbol,name,country,kind:'index'})),...COMMODITIES.map(([symbol,name])=>({symbol,name,kind:'commodity'}))];
const MIN_QUOTES_OK=6;

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200,source='live')=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':source==='live'?'public, max-age=120, stale-while-revalidate=600':'no-store, max-age=0','x-content-type-options':'nosniff','x-gnk-world-markets':VERSION,'x-gnk-world-markets-source':source}});
const ageSeconds=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?Math.max(0,Math.floor((Date.now()-time)/1000)):null};
const finiteOrNull=value=>{const n=Number(value);return Number.isFinite(n)?n:null};

function parseStooqCsv(text){
 const lines=String(text||'').trim().split(/\r?\n/);
 if(lines.length<2)return[];
 const rows=[];
 for(let i=1;i<lines.length;i++){
  const cols=lines[i].split(',');
  if(cols.length<7)continue;
  const[symbolRaw,date,time,open,high,low,close]=cols;
  const symbol=String(symbolRaw||'').trim().toLowerCase();
  const openN=finiteOrNull(open),closeN=finiteOrNull(close);
  if(!symbol||openN==null||closeN==null||closeN<=0)continue;
  rows.push({symbol,date,time,open:openN,high:finiteOrNull(high),low:finiteOrNull(low),close:closeN,change_pct:openN>0?((closeN-openN)/openN)*100:null});
 }
 return rows;
}

async function stooqLive(){
 const symbols=ALL.map(item=>item.symbol).join(',');
 const url=`https://stooq.com/q/l/?s=${encodeURIComponent(symbols)}&f=sd2t2ohlc&h&e=csv`;
 const response=await fetch(url,{headers:{accept:'text/csv','user-agent':'GNK-ASG-Public-World-Markets/1.0'},cf:{cacheEverything:true,cacheTtl:120}});
 if(!response.ok)throw new Error(`Stooq ${response.status}`);
 const rows=parseStooqCsv(await response.text());
 const byySymbol=new Map(rows.map(row=>[row.symbol,row]));
 const indices=[],commodities=[];
 for(const item of ALL){
  const row=byySymbol.get(item.symbol);
  if(!row)continue;
  const entry={symbol:item.symbol,name:item.name,country:item.country||null,price:row.close,open:row.open,high:row.high,low:row.low,change_pct:row.change_pct,as_of_date:row.date||null};
  (item.kind==='index'?indices:commodities).push(entry);
 }
 if(indices.length+commodities.length<MIN_QUOTES_OK)throw new Error(`Stooq incomplete: ${indices.length+commodities.length}/${ALL.length}`);
 return{updated_at:new Date().toISOString(),source:'Stooq batch quote',upstream:'stooq-batch-quote',status:'ok',stale:false,age_seconds:0,indices,commodities};
}

const MARKET_CACHE_KEY='world-markets:live:cache',MARKET_CACHE_TTL_SECONDS=280;
const storeOf=env=>env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
async function cachedLive(env){
 const store=storeOf(env);
 if(store){
  try{
   const raw=await store.get(MARKET_CACHE_KEY);
   if(raw){
    const entry=JSON.parse(raw),age=ageSeconds(entry?.cachedAt);
    if(age!=null&&age<=MARKET_CACHE_TTL_SECONDS&&entry?.data)return entry.data;
   }
  }catch{}
 }
 const data=await stooqLive();
 if(store){try{await store.put(MARKET_CACHE_KEY,JSON.stringify({cachedAt:new Date().toISOString(),data}),{expirationTtl:MARKET_CACHE_TTL_SECONDS+120})}catch{}}
 return data;
}

async function fallback(env,reason=''){
 if(!env?.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request('https://assets.local/data/world-markets.json',{headers:{accept:'application/json'}}));
 if(!response.ok)return null;
 const data=await response.json();
 const age=ageSeconds(data?.updated_at);
 return{...data,upstream:'static-world-markets-json',status:'fallback',stale:age==null||age>3600*6,age_seconds:age,fallback_reason:String(reason||'World market data are temporarily unavailable.').slice(0,240)};
}

export async function servePublicWorldMarkets(request,env){
 const path=pathOf(request);
 if(!['GET','HEAD'].includes(request.method)||!API_PATHS.has(path))return null;
 try{
  const data=await cachedLive(env);
  return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'live').headers}):json(data,200,'live');
 }catch(error){
  const fallbackData=await fallback(env,error?.message);
  if(fallbackData)return request.method==='HEAD'?new Response(null,{status:200,headers:json(fallbackData,200,'fallback').headers}):json(fallbackData,200,'fallback');
  return json({ok:false,status:'unavailable',stale:true,upstream:'none',message:'World market data are temporarily unavailable.'},503,'unavailable');
 }
}
