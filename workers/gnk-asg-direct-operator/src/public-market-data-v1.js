export const VERSION='GNK_ASG_PUBLIC_MARKET_DATA_V4_20260718_INDEPENDENT_PROVIDER';
export const PRIMARY_API_PATH='/api/market';
export const PUBLIC_API_PATH='/api/public-market';
export const API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH]);
const IDS=['bitcoin','ethereum','solana','ripple','binancecoin','cardano','chainlink','avalanche-2','tether','usd-coin','dai','euro-coin'];
const SYMBOLS={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',ripple:'XRP',binancecoin:'BNB',cardano:'ADA',chainlink:'LINK','avalanche-2':'AVAX',tether:'USDT','usd-coin':'USDC',dai:'DAI','euro-coin':'EURC'};
const SYMBOL_TO_ID=Object.fromEntries(Object.entries(SYMBOLS).map(([id,symbol])=>[symbol,id]));
const FIATS=['eur','usd','gbp','chf','jpy'];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200,source='live',path=PUBLIC_API_PATH)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0','x-content-type-options':'nosniff','x-gnk-market-data':VERSION,'x-gnk-market-source':source,'x-gnk-market-route':path,'x-gnk-market-upstream':String(data?.upstream||data?.source||source).slice(0,120)}});
const ageSeconds=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?Math.max(0,Math.floor((Date.now()-time)/1000)):null};
const fetchOptions={headers:{accept:'application/json','user-agent':'GNK-ASG-Public-Market/4.0'},cf:{cacheEverything:true,cacheTtl:60}};
async function simplePriceLive(){
 const params=new URLSearchParams({ids:IDS.join(','),vs_currencies:FIATS.join(','),include_24hr_change:'true',include_last_updated_at:'true'});
 const response=await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`,fetchOptions);
 if(!response.ok)throw new Error(`CoinGecko simple price ${response.status}`);
 const raw=await response.json(),coins=[];
 for(const id of IDS){const item=raw?.[id];if(!item)continue;const prices=Object.fromEntries(FIATS.map(code=>[code,item[code]])),changes=Object.fromEntries(FIATS.map(code=>[code,item[`${code}_24h_change`]]));if(!Number.isFinite(Number(prices.eur))||!Number.isFinite(Number(prices.usd)))continue;coins.push({id,symbol:SYMBOLS[id],prices,changes_24h:changes,last_updated_at:item.last_updated_at||null});}
 if(coins.length<8)throw new Error(`CoinGecko simple price incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko simple price',upstream:'coingecko-simple-price',status:'ok',stale:false,age_seconds:0,coins};
}
async function marketsLive(){
 const responses=await Promise.all(FIATS.map(async code=>{const params=new URLSearchParams({vs_currency:code,ids:IDS.join(','),order:'market_cap_desc',per_page:String(IDS.length),page:'1',sparkline:'false',price_change_percentage:'24h'});const response=await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params}`,fetchOptions);if(!response.ok)throw new Error(`CoinGecko markets ${code} ${response.status}`);const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw new Error(`CoinGecko markets ${code} empty`);return[code,rows]}));
 const byId=new Map();
 for(const[code,rows]of responses){for(const row of rows){if(!IDS.includes(row.id))continue;const current=byId.get(row.id)||{id:row.id,symbol:SYMBOLS[row.id]||String(row.symbol||'').toUpperCase(),prices:{},changes_24h:{},last_updated_at:row.last_updated||null};current.prices[code]=row.current_price;current.changes_24h[code]=row.price_change_percentage_24h;current.last_updated_at=current.last_updated_at||row.last_updated||null;byId.set(row.id,current)}}
 const coins=IDS.map(id=>byId.get(id)).filter(item=>item&&Number.isFinite(Number(item.prices.eur))&&Number.isFinite(Number(item.prices.usd)));
 if(coins.length<8)throw new Error(`CoinGecko markets incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko markets endpoint',upstream:'coingecko-coins-markets',status:'ok',stale:false,age_seconds:0,coins};
}
async function coinPaprikaLive(){
 const quoteGroups=['EUR,USD,GBP','CHF,JPY'];
 const responses=await Promise.all(quoteGroups.map(async quotes=>{const response=await fetch(`https://api.coinpaprika.com/v1/tickers?quotes=${encodeURIComponent(quotes)}`,fetchOptions);if(!response.ok)throw new Error(`CoinPaprika tickers ${quotes} ${response.status}`);const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw new Error(`CoinPaprika tickers ${quotes} empty`);return rows}));
 const selected=new Map();
 for(const rows of responses){for(const row of rows){const symbol=String(row?.symbol||'').toUpperCase();const id=SYMBOL_TO_ID[symbol];if(!id)continue;const rank=Number(row?.rank)||Number.MAX_SAFE_INTEGER;const current=selected.get(id)||{id,symbol,rank,prices:{},changes_24h:{},last_updated_at:row?.last_updated||null};if(rank>current.rank)continue;current.rank=rank;current.last_updated_at=row?.last_updated||current.last_updated_at;for(const code of FIATS){const quote=row?.quotes?.[code.toUpperCase()];if(!quote)continue;current.prices[code]=quote.price;current.changes_24h[code]=quote.percent_change_24h;}selected.set(id,current)}}
 const coins=IDS.map(id=>selected.get(id)).filter(item=>item&&Number.isFinite(Number(item.prices.eur))&&Number.isFinite(Number(item.prices.usd))).map(({rank,...item})=>item);
 if(coins.length<8)throw new Error(`CoinPaprika incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinPaprika public tickers',upstream:'coinpaprika-tickers',status:'ok',stale:false,age_seconds:0,coins};
}
async function live(){try{return await simplePriceLive()}catch(primaryError){try{return await marketsLive()}catch(secondaryError){try{return await coinPaprikaLive()}catch(independentError){throw new Error(`${primaryError.message}; ${secondaryError.message}; ${independentError.message}`)}}}}
async function fallback(env){
 if(!env?.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request('https://assets.local/data/market.json',{headers:{accept:'application/json'}}));
 if(!response.ok)return null;
 const data=await response.json();
 const age=ageSeconds(data?.updated_at);
 return{...data,upstream:'static-market-json',status:'fallback',stale:age==null||age>3600,age_seconds:age,fallback_reason:'All live market providers are temporarily unavailable.'};
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
  return json({ok:false,status:'unavailable',stale:true,upstream:'none',message:'Market data are temporarily unavailable.'},503,'unavailable',path);
 }
}
