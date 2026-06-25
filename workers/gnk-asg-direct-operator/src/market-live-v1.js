const VERSION='GNK_ASG_MARKET_LIVE_V1_20260625';
const CACHE_KEY='data:market:live:v1';
const CACHE_MS=5*60*1000;
const now=()=>new Date().toISOString();
const number=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

async function readCache(env){
  const kv=store(env);
  if(!kv)return null;
  try{const raw=await kv.get(CACHE_KEY);return raw?JSON.parse(raw):null}catch{return null}
}

async function writeCache(env,value){
  const kv=store(env);
  if(!kv)return false;
  try{await kv.put(CACHE_KEY,JSON.stringify(value,null,2),{expirationTtl:1209600});return true}catch{return false}
}

function ageMs(value){
  const stamp=Date.parse(value?.updatedAt||'');
  return Number.isFinite(stamp)?Math.max(0,Date.now()-stamp):Infinity;
}

async function fetchJson(url,label){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json','user-agent':'GNK-ASG-Market-Live/1.0'}});
    const body=await response.text();
    if(!response.ok)throw new Error(`${label}_HTTP_${response.status}`);
    return JSON.parse(body);
  }finally{clearTimeout(timer)}
}

function series(rows,max=180){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const stamp=typeof row?.time==='number'?row.time:Date.parse(row?.time||row?.date||row?.timestamp||'');
    const value=number(row?.value??row?.close??row?.price);
    return Number.isFinite(stamp)&&value!==null?{time:new Date(stamp).toISOString(),value}:null;
  }).filter(Boolean).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-max);
}

async function bitcoin(){
  const [spot,chart]=await Promise.all([
    fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true&include_last_updated_at=true','bitcoin_spot'),
    fetchJson('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=1','bitcoin_chart')
  ]);
  const data=spot?.bitcoin||{};
  const price=number(data.eur);
  if(price===null)throw new Error('bitcoin_value_missing');
  return{
    price_eur:price,
    change_24h:number(data.eur_24h_change),
    status:'LIVE',
    source:'CoinGecko',
    updatedAt:data.last_updated_at?new Date(Number(data.last_updated_at)*1000).toISOString():now(),
    history:series((chart?.prices||[]).map(row=>({time:row?.[0],value:row?.[1]})))
  };
}

async function yahoo(symbol,label){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`;
  const data=await fetchJson(url,label);
  const result=data?.chart?.result?.[0];
  if(!result)throw new Error(`${label}_missing`);
  const timestamps=result.timestamp||[];
  const closes=result?.indicators?.quote?.[0]?.close||[];
  const history=series(timestamps.map((stamp,index)=>({time:Number(stamp)*1000,value:closes[index]})));
  const current=number(result?.meta?.regularMarketPrice)??history.at(-1)?.value??null;
  if(current===null)throw new Error(`${label}_value_missing`);
  return{current,history,updatedAt:result?.meta?.regularMarketTime?new Date(Number(result.meta.regularMarketTime)*1000).toISOString():now()};
}

async function fx(){
  try{
    const data=await yahoo('EURUSD=X','fx_yahoo');
    const invert=value=>{const n=number(value);return n&&n!==0?1/n:null};
    return{
      rate:invert(data.current),status:'DELAYED',source:'Yahoo Finance EURUSD=X',updatedAt:data.updatedAt,
      history:data.history.map(row=>({time:row.time,value:invert(row.value)})).filter(row=>row.value!==null)
    };
  }catch{
    const data=await fetchJson('https://api.frankfurter.app/latest?from=USD&to=EUR','fx_frankfurter');
    const rate=number(data?.rates?.EUR);
    if(rate===null)throw new Error('fx_value_missing');
    const updatedAt=data?.date?`${data.date}T16:00:00.000Z`:now();
    return{rate,status:'SNAPSHOT',source:'Frankfurter / ECB',updatedAt,history:[{time:updatedAt,value:rate}]};
  }
}

async function gold(rate){
  const data=await yahoo('GC=F','gold_yahoo');
  const convert=value=>number(value)!==null&&number(rate)!==null?number(value)*number(rate):number(value);
  return{
    value_eur:convert(data.current),value_usd:number(data.current),status:'DELAYED',source:'Yahoo Finance GC=F',updatedAt:data.updatedAt,
    history:data.history.map(row=>({time:row.time,value:convert(row.value)})).filter(row=>row.value!==null)
  };
}

async function brent(){
  const data=await yahoo('BZ=F','brent_yahoo');
  return{price_usd:number(data.current),status:'DELAYED',source:'Yahoo Finance BZ=F',updatedAt:data.updatedAt,history:data.history};
}

function fallback(previous,error){
  return previous?{...previous,status:'FALLBACK',error:String(error?.message||error),checkedAt:now()}:{status:'UNAVAILABLE',updatedAt:null,history:[],error:String(error?.message||error)};
}

export async function refreshLiveMarket(env){
  const previous=await readCache(env);
  const errors=[];
  let fxAsset;
  try{fxAsset=await fx()}catch(error){fxAsset=fallback(previous?.assets?.usd_eur,error);errors.push({module:'usd_eur',error:String(error?.message||error)})}
  const settled=await Promise.allSettled([bitcoin(),gold(fxAsset?.rate),brent()]);
  const keys=['bitcoin','asg_gold_reference','brent'];
  const assets={usd_eur:fxAsset};
  settled.forEach((result,index)=>{
    const key=keys[index];
    if(result.status==='fulfilled')assets[key]=result.value;
    else{assets[key]=fallback(previous?.assets?.[key],result.reason);errors.push({module:key,error:String(result.reason?.message||result.reason)})}
  });
  const states=Object.values(assets).map(asset=>asset?.status);
  const status=states.includes('LIVE')?(states.some(value=>['FALLBACK','UNAVAILABLE'].includes(value))?'DELAYED':'LIVE'):(states.some(value=>['DELAYED','SNAPSHOT'].includes(value))?'DELAYED':'FALLBACK');
  const payload={ok:states.some(value=>value!=='UNAVAILABLE'),version:VERSION,status,updatedAt:now(),checkedAt:now(),refreshSeconds:300,disclaimer:'Podaci su informativni, mogu kasniti i nisu financijski savjet.',assets,errors};
  payload.stored=await writeCache(env,payload);
  return payload;
}

export async function getLiveMarket(env,{force=false}={}){
  const cached=await readCache(env);
  if(!force&&cached&&ageMs(cached)<CACHE_MS)return{...cached,cache:'HIT',ageSeconds:Math.round(ageMs(cached)/1000),checkedAt:now()};
  return{...(await refreshLiveMarket(env)),cache:'REFRESHED',ageSeconds:0};
}

export{VERSION};
