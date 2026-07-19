export const VERSION='GNK_ASG_PUBLIC_MARKET_DATA_V5_20260719_CRYPTOCOMPARE_FALLBACK';
export const PRIMARY_API_PATH='/api/market';
export const PUBLIC_API_PATH='/api/public-market';
export const API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH]);
const IDS=['bitcoin','ethereum','solana','ripple','binancecoin','cardano','chainlink','avalanche-2','tether','usd-coin','dai','euro-coin'];
const SYMBOLS={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',ripple:'XRP',binancecoin:'BNB',cardano:'ADA',chainlink:'LINK','avalanche-2':'AVAX',tether:'USDT','usd-coin':'USDC',dai:'DAI','euro-coin':'EURC'};
const PAPRIKA_IDS={bitcoin:'btc-bitcoin',ethereum:'eth-ethereum',solana:'sol-solana',ripple:'xrp-xrp',binancecoin:'bnb-binance-coin',cardano:'ada-cardano',chainlink:'link-chainlink','avalanche-2':'avax-avalanche',tether:'usdt-tether','usd-coin':'usdc-usd-coin',dai:'dai-dai','euro-coin':'eurc-euro-coin'};
const FIATS=['eur','usd','gbp','chf','jpy'];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200,source='live',path=PUBLIC_API_PATH)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0','x-content-type-options':'nosniff','x-gnk-market-data':VERSION,'x-gnk-market-source':source,'x-gnk-market-route':path,'x-gnk-market-upstream':String(data?.upstream||data?.source||source).slice(0,120)}});
const ageSeconds=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?Math.max(0,Math.floor((Date.now()-time)/1000)):null};
const fetchOptions={headers:{accept:'application/json','user-agent':'GNK-ASG-Public-Market/5.0'},cf:{cacheEverything:true,cacheTtl:60}};
async function simplePriceLive(){
 const params=new URLSearchParams({ids:IDS.join(','),vs_currencies:FIATS.join(','),include_24hr_change:'true',include_last_updated_at:'true'});
 const response=await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`,fetchOptions);
 if(!response.ok)throw new Error(`CoinGecko simple price ${response.status}`);
 const raw=await response.json(),coins=[];
 for(const id of IDS){const item=raw?.[id];if(!item)continue;const prices=Object.fromEntries(FIATS.map(code=>[code,item[code]])),changes=Object.fromEntries(FIATS.map(code=>[code,item[`${code}_24h_change`]]));if(!FIATS.every(code=>Number.isFinite(Number(prices[code]))))continue;coins.push({id,symbol:SYMBOLS[id],prices,changes_24h:changes,last_updated_at:item.last_updated_at||null});}
 if(coins.length<8)throw new Error(`CoinGecko simple price incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko simple price',upstream:'coingecko-simple-price',status:'ok',stale:false,age_seconds:0,coins};
}
async function marketsLive(){
 const responses=await Promise.all(FIATS.map(async code=>{const params=new URLSearchParams({vs_currency:code,ids:IDS.join(','),order:'market_cap_desc',per_page:String(IDS.length),page:'1',sparkline:'false',price_change_percentage:'24h'});const response=await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params}`,fetchOptions);if(!response.ok)throw new Error(`CoinGecko markets ${code} ${response.status}`);const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw new Error(`CoinGecko markets ${code} empty`);return[code,rows]}));
 const byId=new Map();
 for(const[code,rows]of responses){for(const row of rows){if(!IDS.includes(row.id))continue;const current=byId.get(row.id)||{id:row.id,symbol:SYMBOLS[row.id]||String(row.symbol||'').toUpperCase(),prices:{},changes_24h:{},last_updated_at:row.last_updated||null};current.prices[code]=row.current_price;current.changes_24h[code]=row.price_change_percentage_24h;current.last_updated_at=current.last_updated_at||row.last_updated||null;byId.set(row.id,current)}}
 const coins=IDS.map(id=>byId.get(id)).filter(item=>item&&FIATS.every(code=>Number.isFinite(Number(item.prices[code]))));
 if(coins.length<8)throw new Error(`CoinGecko markets incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko markets endpoint',upstream:'coingecko-coins-markets',status:'ok',stale:false,age_seconds:0,coins};
}
async function cryptoCompareLive(){
 const params=new URLSearchParams({fsyms:IDS.map(id=>SYMBOLS[id]).join(','),tsyms:FIATS.map(code=>code.toUpperCase()).join(','),extraParams:'GNK_ASG_Public_Market'});
 const response=await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?${params}`,fetchOptions);
 if(!response.ok)throw new Error(`CryptoCompare pricemultifull ${response.status}`);
 const payload=await response.json();
 if(payload?.Response==='Error')throw new Error(`CryptoCompare error: ${String(payload.Message||'unknown').slice(0,120)}`);
 const raw=payload?.RAW,coins=[];
 for(const id of IDS){const symbol=SYMBOLS[id],quotes=raw?.[symbol];if(!quotes)continue;const prices={},changes_24h={};let latest=0;for(const code of FIATS){const row=quotes[code.toUpperCase()];if(!row)continue;prices[code]=row.PRICE;changes_24h[code]=row.CHANGEPCT24HOUR;latest=Math.max(latest,Number(row.LASTUPDATE)||0)}if(!FIATS.every(code=>Number.isFinite(Number(prices[code]))))continue;coins.push({id,symbol,prices,changes_24h,last_updated_at:latest||null});}
 if(coins.length<8)throw new Error(`CryptoCompare incomplete: ${coins.length}/${IDS.length}`);
 return{updated_at:new Date().toISOString(),source:'CryptoCompare multiple symbols full data',upstream:'cryptocompare-pricemultifull',status:'ok',stale:false,age_seconds:0,coins};
}
async function coinPaprikaTicker(id,paprikaId){
 const quoteGroups=['EUR,USD,GBP','CHF,JPY'],prices={},changes_24h={};let last_updated_at=null;
 const rows=await Promise.all(quoteGroups.map(async quotes=>{const response=await fetch(`https://api.coinpaprika.com/v1/tickers/${paprikaId}?quotes=${encodeURIComponent(quotes)}`,fetchOptions);if(!response.ok)throw new Error(`CoinPaprika ${paprikaId} ${quotes} ${response.status}`);const row=await response.json();if(!row||String(row.id||'')!==paprikaId)throw new Error(`CoinPaprika ${paprikaId} invalid payload`);return row}));
 for(const row of rows){last_updated_at=row.last_updated||last_updated_at;for(const code of FIATS){const quote=row?.quotes?.[code.toUpperCase()];if(!quote)continue;prices[code]=quote.price;changes_24h[code]=quote.percent_change_24h;}}
 if(!FIATS.every(code=>Number.isFinite(Number(prices[code]))))throw new Error(`CoinPaprika ${paprikaId} incomplete quotes`);
 return{id,symbol:SYMBOLS[id],prices,changes_24h,last_updated_at};
}
async function coinPaprikaLive(){
 const entries=Object.entries(PAPRIKA_IDS),coins=[];
 for(let offset=0;offset<entries.length;offset+=3){const settled=await Promise.allSettled(entries.slice(offset,offset+3).map(([id,paprikaId])=>coinPaprikaTicker(id,paprikaId)));for(const result of settled)if(result.status==='fulfilled')coins.push(result.value);}
 const ordered=IDS.map(id=>coins.find(item=>item.id===id)).filter(Boolean);
 if(ordered.length<8)throw new Error(`CoinPaprika bounded tickers incomplete: ${ordered.length}/${entries.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinPaprika bounded public tickers',upstream:'coinpaprika-tickers',status:'ok',stale:false,age_seconds:0,coins:ordered};
}
async function live(){try{return await simplePriceLive()}catch(primaryError){try{return await marketsLive()}catch(secondaryError){try{return await cryptoCompareLive()}catch(tertiaryError){try{return await coinPaprikaLive()}catch(independentError){throw new Error(`${primaryError.message}; ${secondaryError.message}; ${tertiaryError.message}; ${independentError.message}`)}}}}}
async function fallback(env,reason=''){
 if(!env?.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request('https://assets.local/data/market.json',{headers:{accept:'application/json'}}));
 if(!response.ok)return null;
 const data=await response.json(),age=ageSeconds(data?.updated_at);
 return{...data,upstream:'static-market-json',status:'fallback',stale:age==null||age>3600,age_seconds:age,fallback_reason:String(reason||'All live market providers are temporarily unavailable.').slice(0,240)};
}
export async function servePublicMarketData(request,env){
 const path=pathOf(request);
 if(!['GET','HEAD'].includes(request.method)||!API_PATHS.has(path))return null;
 try{const data=await live();return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'live',path).headers}):json(data,200,'live',path);}
 catch(error){const data=await fallback(env,error?.message);if(data)return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'fallback',path).headers}):json(data,200,'fallback',path);return json({ok:false,status:'unavailable',stale:true,upstream:'none',message:'Market data are temporarily unavailable.'},503,'unavailable',path);}
}
