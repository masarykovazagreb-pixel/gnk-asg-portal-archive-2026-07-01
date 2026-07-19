export const VERSION='GNK_ASG_PUBLIC_MARKET_DATA_V6_20260719_OFFICIAL_INSTITUTIONAL_SERVER_SIDE';
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
const fetchOptions={headers:{accept:'application/json','user-agent':'GNK-ASG-Public-Market/6.0'},cf:{cacheEverything:true,cacheTtl:60}};
const institutionalFetchOptions={headers:{accept:'application/json, application/xml, text/xml','user-agent':'GNK-ASG-Public-Market/6.0'},cf:{cacheEverything:true,cacheTtl:3600}};
export const OFFICIAL_SOURCE_POLICY=Object.freeze({
 version:'GNK_ASG_OFFICIAL_SOURCE_POLICY_V1_20260719',
 browser_direct_external_requests:false,
 providers:Object.freeze([
  Object.freeze({id:'ecb-reference-rates',owner:'European Central Bank',kind:'official-public-data',original_url:'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',terms_url:'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html',cache_ttl_seconds:3600,max_upstream_requests_per_refresh:1}),
  Object.freeze({id:'world-bank-indicators',owner:'World Bank',kind:'official-public-data',original_url:'https://api.worldbank.org/v2/',terms_url:'https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets',cache_ttl_seconds:3600,max_upstream_requests_per_refresh:2})
 ])
});
const finiteOrNull=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
async function ecbInstitutional(){
 const source=OFFICIAL_SOURCE_POLICY.providers[0],response=await fetch(source.original_url,institutionalFetchOptions);
 if(!response.ok)throw new Error(`ECB ${response.status}`);
 const xml=await response.text(),date=(xml.match(/<Cube\s+time=['"]([^'"]+)['"]/i)||[])[1]||'',rates={};
 for(const match of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([^'"]+)['"]/g)){const rate=finiteOrNull(match[2]);if(rate!=null)rates[match[1]]=rate;}
 if(!date||!['USD','GBP','CHF'].every(code=>finiteOrNull(rates[code])!=null))throw new Error('ECB payload incomplete');
 return{base:'EUR',date,rates,source_id:source.id,original_url:source.original_url,retrieved_at:new Date().toISOString()};
}
async function worldBankIndicator(indicator){
 const source=OFFICIAL_SOURCE_POLICY.providers[1],url=`https://api.worldbank.org/v2/country/HRV;USA;EUU/indicator/${encodeURIComponent(indicator)}?format=json&per_page=60`;
 const response=await fetch(url,institutionalFetchOptions);
 if(!response.ok)throw new Error(`World Bank ${indicator} ${response.status}`);
 const payload=await response.json(),rows=Array.isArray(payload?.[1])?payload[1]:[];
 const values={};
 for(const country of ['HRV','EUU','USA']){const row=rows.filter(item=>item?.countryiso3code===country&&finiteOrNull(item?.value)!=null).sort((a,b)=>Number(b.date)-Number(a.date))[0];if(row)values[country]={value:finiteOrNull(row.value),year:String(row.date||'')};}
 if(Object.keys(values).length<2)throw new Error(`World Bank ${indicator} payload incomplete`);
 return{indicator,values,source_id:source.id,original_url:url,retrieved_at:new Date().toISOString()};
}
async function institutionalLive(){
 const [fx,gdp,inflation]=await Promise.allSettled([ecbInstitutional(),worldBankIndicator('NY.GDP.MKTP.KD.ZG'),worldBankIndicator('FP.CPI.TOTL.ZG')]);
 const fulfilled=[fx,gdp,inflation].filter(result=>result.status==='fulfilled').length,errors={};
 if(fx.status==='rejected')errors.fx=String(fx.reason?.message||fx.reason);
 if(gdp.status==='rejected')errors.gdp_growth=String(gdp.reason?.message||gdp.reason);
 if(inflation.status==='rejected')errors.inflation=String(inflation.reason?.message||inflation.reason);
 return{
  status:fulfilled===3?'ok':fulfilled?'partial':'unavailable',
  updated_at:new Date().toISOString(),
  fx:fx.status==='fulfilled'?fx.value:null,
  indicators:{
   gdp_growth:gdp.status==='fulfilled'?gdp.value:null,
   inflation:inflation.status==='fulfilled'?inflation.value:null
  },
  errors,
  source_policy:OFFICIAL_SOURCE_POLICY
 };
}
const attachInstitutional=(data,institutional)=>({...data,institutional,source_policy:OFFICIAL_SOURCE_POLICY});
const coinGeckoOptions=env=>{const key=String(env?.COINGECKO_DEMO_API_KEY||'').trim();return{...fetchOptions,headers:{...fetchOptions.headers,...(key?{'x-cg-demo-api-key':key}:{})}}};
async function simplePriceLive(env){
 const params=new URLSearchParams({ids:IDS.join(','),vs_currencies:FIATS.join(','),include_24hr_change:'true',include_last_updated_at:'true'});
 const response=await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`,coinGeckoOptions(env));
 if(!response.ok)throw new Error(`CoinGecko simple price ${response.status}`);
 const raw=await response.json(),coins=[];
 for(const id of IDS){const item=raw?.[id];if(!item)continue;const prices=Object.fromEntries(FIATS.map(code=>[code,item[code]])),changes=Object.fromEntries(FIATS.map(code=>[code,item[`${code}_24h_change`]]));if(!Number.isFinite(Number(prices.eur))||!Number.isFinite(Number(prices.usd)))continue;coins.push({id,symbol:SYMBOLS[id],prices,changes_24h:changes,last_updated_at:item.last_updated_at||null});}
 if(coins.length<8)throw new Error(`CoinGecko simple price incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko simple price',upstream:'coingecko-simple-price',status:'ok',stale:false,age_seconds:0,coins};
}
async function marketsLive(env){
 const responses=await Promise.all(FIATS.map(async code=>{const params=new URLSearchParams({vs_currency:code,ids:IDS.join(','),order:'market_cap_desc',per_page:String(IDS.length),page:'1',sparkline:'false',price_change_percentage:'24h'});const response=await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params}`,coinGeckoOptions(env));if(!response.ok)throw new Error(`CoinGecko markets ${code} ${response.status}`);const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw new Error(`CoinGecko markets ${code} empty`);return[code,rows]}));
 const byId=new Map();
 for(const[code,rows]of responses){for(const row of rows){if(!IDS.includes(row.id))continue;const current=byId.get(row.id)||{id:row.id,symbol:SYMBOLS[row.id]||String(row.symbol||'').toUpperCase(),prices:{},changes_24h:{},last_updated_at:row.last_updated||null};current.prices[code]=row.current_price;current.changes_24h[code]=row.price_change_percentage_24h;current.last_updated_at=current.last_updated_at||row.last_updated||null;byId.set(row.id,current)}}
 const coins=IDS.map(id=>byId.get(id)).filter(item=>item&&Number.isFinite(Number(item.prices.eur))&&Number.isFinite(Number(item.prices.usd)));
 if(coins.length<8)throw new Error(`CoinGecko markets incomplete: ${coins.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinGecko markets endpoint',upstream:'coingecko-coins-markets',status:'ok',stale:false,age_seconds:0,coins};
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
 for(let offset=0;offset<entries.length;offset+=3){
  const settled=await Promise.allSettled(entries.slice(offset,offset+3).map(([id,paprikaId])=>coinPaprikaTicker(id,paprikaId)));
  for(const result of settled)if(result.status==='fulfilled')coins.push(result.value);
 }
 const ordered=IDS.map(id=>coins.find(item=>item.id===id)).filter(Boolean);
 if(ordered.length<8)throw new Error(`CoinPaprika bounded tickers incomplete: ${ordered.length}/${entries.length}`);
 return{updated_at:new Date().toISOString(),source:'CoinPaprika bounded public tickers',upstream:'coinpaprika-tickers',status:'ok',stale:false,age_seconds:0,coins:ordered};
}
async function coinbaseLive(env){
 if(!env?.ASSETS?.fetch)throw new Error('Coinbase fallback missing asset FX reference');
 const referenceResponse=await env.ASSETS.fetch(new Request('https://assets.local/data/market.json',{headers:{accept:'application/json'}}));
 if(!referenceResponse.ok)throw new Error('Coinbase fallback FX reference unavailable');
 const reference=await referenceResponse.json(),anchor=(reference?.coins||[]).find(item=>Number(item?.prices?.usd)>0&&FIATS.every(code=>Number(item?.prices?.[code])>0));
 if(!anchor)throw new Error('Coinbase fallback FX reference incomplete');
 const fx=Object.fromEntries(FIATS.map(code=>[code,Number(anchor.prices[code])/Number(anchor.prices.usd)]));
 const settled=await Promise.allSettled(IDS.map(async id=>{const symbol=SYMBOLS[id];const response=await fetch(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`,fetchOptions);if(!response.ok)throw new Error(`Coinbase ${symbol} ${response.status}`);const row=await response.json(),usd=Number(row?.data?.amount);if(!Number.isFinite(usd)||usd<=0)throw new Error(`Coinbase ${symbol} invalid`);return{id,symbol,prices:Object.fromEntries(FIATS.map(code=>[code,usd*fx[code]])),changes_24h:Object.fromEntries(FIATS.map(code=>[code,null])),last_updated_at:new Date().toISOString()}}));
 const coins=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
 if(coins.length<8)throw new Error(`Coinbase spot incomplete: ${coins.length}/${IDS.length}`);
 return{updated_at:new Date().toISOString(),source:'Coinbase public spot with cached fiat reference',upstream:'coinbase-spot-static-fx',status:'ok',stale:false,age_seconds:0,coins};
}
async function live(env){try{return await simplePriceLive(env)}catch(primaryError){try{return await marketsLive(env)}catch(secondaryError){try{return await coinPaprikaLive()}catch(independentError){try{return await coinbaseLive(env)}catch(finalError){throw new Error(`${primaryError.message}; ${secondaryError.message}; ${independentError.message}; ${finalError.message}`)}}}}}
async function fallback(env,reason=''){
 if(!env?.ASSETS?.fetch)return null;
 const response=await env.ASSETS.fetch(new Request('https://assets.local/data/market.json',{headers:{accept:'application/json'}}));
 if(!response.ok)return null;
 const data=await response.json();
 const age=ageSeconds(data?.updated_at);
 return{...data,upstream:'static-market-json',status:'fallback',stale:age==null||age>3600,age_seconds:age,fallback_reason:String(reason||'All live market providers are temporarily unavailable.').slice(0,240)};
}
export async function servePublicMarketData(request,env){
 const path=pathOf(request);
 if(!['GET','HEAD'].includes(request.method)||!API_PATHS.has(path))return null;
 const institutionalPromise=institutionalLive();
 try{
  const data=attachInstitutional(await live(env),await institutionalPromise);
  return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'live',path).headers}):json(data,200,'live',path);
 }catch(error){
  const fallbackData=await fallback(env,error?.message),institutional=await institutionalPromise;
  if(fallbackData){const data=attachInstitutional(fallbackData,institutional);return request.method==='HEAD'?new Response(null,{status:200,headers:json(data,200,'fallback',path).headers}):json(data,200,'fallback',path);}
  return json({ok:false,status:'unavailable',stale:true,upstream:'none',institutional,source_policy:OFFICIAL_SOURCE_POLICY,message:'Market data are temporarily unavailable.'},503,'unavailable',path);
 }
}
