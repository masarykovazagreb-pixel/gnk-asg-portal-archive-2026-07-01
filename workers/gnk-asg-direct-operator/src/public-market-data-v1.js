export const VERSION='GNK_ASG_PUBLIC_MARKET_DATA_V2_20260718_PRIMARY_ALIAS';
export const PRIMARY_API_PATH='/api/market';
export const PUBLIC_API_PATH='/api/public-market';
export const API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH]);
const IDS=['bitcoin','ethereum','solana','ripple','binancecoin','cardano','chainlink','avalanche-2','tether','usd-coin','dai','euro-coin'];
const SYMBOLS={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',ripple:'XRP',binancecoin:'BNB',cardano:'ADA',chainlink:'LINK','avalanche-2':'AVAX',tether:'USDT','usd-coin':'USDC',dai:'DAI','euro-coin':'EURC'};
const FIATS=['eur','usd','gbp','chf','jpy'];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200,source='live',path=PUBLIC_API_PATH)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0','x-content-type-options':'nosniff','x-gnk-market-data':VERSION,'x-gnk-market-source':source,'x-gnk-market-route':path}});
const ageSeconds=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?Math.max(0,Math.floor((Date.now()-time)/1000)):null};
async function live(){
 const params=new URLSearchParams({ids:IDS.join(','),vs_currencies:FIATS.join(','),include_24hr_change:'true',include_last_updated_at:'true'});
 const response=await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`,{headers:{accept:'application/json','user-agent':'GNK-ASG-Public-Market/2.0'},cf:{cacheEverything:true,cacheTtl:60}});
 if(!response.ok)throw new Error(`CoinGecko ${response.status}`);
 const raw=await response.json(),coins=[];
 for(const id of IDS){const item=raw?.[id];if(!item)continue;coins.push({id,symbol:SYMBOLS[id],prices:Object.fromEntries(FIATS.map(code=>[code,item[code]])),changes_24h:Object.fromEntries(FIATS.map(code=>[code,item[`${code}_24h_change`]])),last_updated_at:item.last_updated_at||null});}
 if(!coins.length)throw new Error('CoinGecko empty response');
 return{updated_at:new Date().toISOString(),source:'CoinGecko public market data',status:'ok',stale:false,age_seconds:0,coins};
}
async function fallback(env){
 if(!env?.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request('https://assets.local/data/market.json',{headers:{accept:'application/json'}}));
 if(!response.ok)return null;
 const data=await response.json();
 const age=ageSeconds(data?.updated_at);
 return{...data,status:'fallback',stale:age==null||age>86400,age_seconds:age,fallback_reason:'Live market source temporarily unavailable.'};
}
export async function servePublicMarketData(request,env){
 const path=pathOf(request);
 if(!['GET','HEAD'].includes(request.method)||!API_PATHS.has(path))return null;
 try{
  const data=await live();
  return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'live',path).headers}):json(data,200,'live',path);
 }catch(error){
  const data=await fallback(env);
  if(data)return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'fallback',path).headers}):json(data,200,'fallback',path);
  return json({ok:false,status:'unavailable',stale:true,message:'Market data are temporarily unavailable.'},503,'unavailable',path);
 }
}
