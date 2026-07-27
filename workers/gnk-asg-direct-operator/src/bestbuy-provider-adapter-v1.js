// Best Buy Products API provider for the GNK ASG commerce catalogue.
// The API key is read only from env.BESTBUY_API_KEY and is never returned.
export const VERSION='GNK_ASG_BESTBUY_PROVIDER_V2_ECB_EUR_20260727';

const BASE='https://api.bestbuy.com/v1';
const ECB_DAILY='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const LIST_ROUTE='/api/commerce/bestbuy/products';
const ITEM_PREFIX='/api/commerce/bestbuy/product/';
const DEFAULT_SHOW='sku,name,manufacturer,salePrice,image,shortDescription,onlineAvailability,customerReviewAverage,customerReviewCount,url,categoryPath';
const MOCK_PRODUCTS=[
 {sku:6503849,name:'Demo 14-inch Business Laptop',manufacturer:'Demo Technology',salePrice:899.99,image:'/assets/gallery/api-economy-organic-v3.svg',shortDescription:'Kontrolirani proizvod za pregled kataloga do odobrenja Best Buy API pristupa.',onlineAvailability:true,customerReviewAverage:4.5,customerReviewCount:128,url:'',categoryPath:[{name:'Računala'},{name:'Prijenosna računala'}]},
 {sku:6533165,name:'Demo 27-inch 4K Monitor',manufacturer:'Demo Display',salePrice:429.99,image:'/assets/gallery/digitalna-transformacija-azure-tech-03-v2.svg',shortDescription:'Kontrolirani proizvod za provjeru kartica, filtara i konverzije cijena.',onlineAvailability:true,customerReviewAverage:4.7,customerReviewCount:86,url:'',categoryPath:[{name:'Računala'},{name:'Monitori'}]}
];

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300, stale-while-revalidate=900','x-content-type-options':'nosniff','x-gnk-bestbuy-provider':VERSION,...extra}});
const clean=(v,max=500)=>String(v??'').replace(/\u0000/g,'').trim().slice(0,max);
const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
function categoryOf(path){if(!Array.isArray(path))return 'Tehnologija';const names=path.map(x=>clean(x?.name,80)).filter(Boolean);return names.at(-1)||'Tehnologija';}

async function eurUsdRate(env){
 const configured=Number(env?.EUR_USD_REFERENCE_RATE);
 if(Number.isFinite(configured)&&configured>0.5&&configured<2)return {rate:configured,date:'configured',source:'GNK ASG configured reference'};
 try{
  const response=await fetch(ECB_DAILY,{headers:{accept:'application/xml'},cf:{cacheTtl:21600,cacheEverything:true}});
  if(!response.ok)throw new Error(`ecb_http_${response.status}`);
  const xml=await response.text();
  const rate=Number(xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/)?.[1]);
  const date=xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1]||'';
  if(!Number.isFinite(rate)||rate<=0)throw new Error('ecb_rate_missing');
  return {rate,date,source:'ECB euro foreign exchange reference rate'};
 }catch{return {rate:1.1377,date:'2026-07-24',source:'ECB fallback reference rate'};}
}

export function normalizeBestBuyProduct(p,fx={rate:1.1377,date:'2026-07-24',source:'ECB fallback reference rate'}){
 const sku=clean(p?.sku,64);const priceUsd=finite(p?.salePrice);
 if(!sku||!clean(p?.name,220))return null;
 const priceEur=priceUsd===null?null:Math.round((priceUsd/fx.rate)*100)/100;
 return {
  id:`BBY-${sku}`,sku:`BBY-${sku}`,providerSku:sku,name:clean(p.name,220),brand:clean(p.manufacturer,120),
  category:categoryOf(p.categoryPath),description:clean(p.shortDescription,1200),image:clean(p.image,1200),
  price:{amount:priceEur,currency:'EUR'},priceAmount:priceEur,priceEur,priceUsd,currency:'EUR',sourceCurrency:'USD',fxRate:fx.rate,fxDate:fx.date,fxSource:fx.source,
  priceNote:priceEur===null?'Cijena na upit':`Informativno ${priceEur.toFixed(2)} EUR`,
  availability:p.onlineAvailability===true?'in_stock':p.onlineAvailability===false?'out_of_stock':'unknown',
  availabilityLabel:p.onlineAvailability===true?'Dostupno online u SAD-u':p.onlineAvailability===false?'Trenutno nije dostupno online':'Dostupnost nije potvrđena',
  customerReviewAverage:finite(p.customerReviewAverage),customerReviewCount:Number.isInteger(p.customerReviewCount)?p.customerReviewCount:null,
  sourceUrl:clean(p.url,1200),sourceLabel:'Best Buy Products API',market:'US',merchant:'Best Buy',
  checkedAt:new Date().toISOString(),tags:['Best Buy','EUR informativna konverzija','Američko tržište'],
  legalNote:'Informativna konverzija USD u EUR prema referentnom tečaju ECB-a. Ne uključuje hrvatski PDV, carinu, međunarodnu dostavu niti konačnu GNK ASG ponudu.'
 };
}

function isReviewMode(env){return ['mock','review','staging'].includes(clean(env?.BESTBUY_MODE,20).toLowerCase());}
function keyOf(env){return clean(env?.BESTBUY_API_KEY,300);}
function clampPageSize(value){const n=Number(value);return Number.isInteger(n)?Math.min(100,Math.max(1,n)):24;}
function safeSearch(value){return clean(value,100).replace(/["()]/g,' ').replace(/\s+/g,' ').trim();}
async function fetchBestBuy(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json','user-agent':'GNK-ASG-Commerce/1.0'}});if(!response.ok)throw new Error(`bestbuy_http_${response.status}`);return await response.json();}finally{clearTimeout(timer);}}

async function listProducts(request,env){
 const key=keyOf(env);const requestUrl=new URL(request.url);const query=safeSearch(requestUrl.searchParams.get('q')||'laptop');const pageSize=clampPageSize(requestUrl.searchParams.get('pageSize'));const fx=await eurUsdRate(env);
 if(!key){if(!isReviewMode(env))return json({ok:false,error:'bestbuy_access_pending',message:'BESTBUY_API_KEY is not configured or access is still pending approval.'},503,{'cache-control':'no-store'});const products=MOCK_PRODUCTS.map(p=>normalizeBestBuyProduct(p,fx)).filter(Boolean);return json({ok:true,mode:'mock-review',provider:'bestbuy',total:products.length,products,fx,version:VERSION});}
 const expression=query?`search=${JSON.stringify(query)}`:'categoryPath.id=abcat0502000';
 const api=new URL(`${BASE}/products(${expression})`);api.searchParams.set('apiKey',key);api.searchParams.set('format','json');api.searchParams.set('pageSize',String(pageSize));api.searchParams.set('show',DEFAULT_SHOW);api.searchParams.set('sort','salePrice.asc');
 try{const data=await fetchBestBuy(api);const products=(Array.isArray(data?.products)?data.products:[]).map(p=>normalizeBestBuyProduct(p,fx)).filter(Boolean);return json({ok:true,mode:'live',provider:'bestbuy',query,total:products.length,products,fx,from:data?.from??null,to:data?.to??null,totalPages:data?.totalPages??null,currentPage:data?.currentPage??null,version:VERSION});}catch(error){return json({ok:false,error:'bestbuy_upstream_failed',message:clean(error?.message,160)},502,{'cache-control':'no-store'});}
}

async function getProduct(request,env,rawSku){
 const sku=clean(rawSku,64).replace(/^BBY-/i,'');const key=keyOf(env);const fx=await eurUsdRate(env);
 if(!/^\d+$/.test(sku))return json({ok:false,error:'invalid_bestbuy_sku'},400,{'cache-control':'no-store'});
 if(!key){if(!isReviewMode(env))return json({ok:false,error:'bestbuy_access_pending'},503,{'cache-control':'no-store'});const found=MOCK_PRODUCTS.find(p=>String(p.sku)===sku);return found?json({ok:true,mode:'mock-review',product:normalizeBestBuyProduct(found,fx),fx}):json({ok:false,error:'not_found'},404);}
 const api=new URL(`${BASE}/products(sku=${sku})`);api.searchParams.set('apiKey',key);api.searchParams.set('format','json');api.searchParams.set('show','all');
 try{const data=await fetchBestBuy(api);const product=normalizeBestBuyProduct(data?.products?.[0],fx);return product?json({ok:true,mode:'live',product,fx}):json({ok:false,error:'not_found'},404);}catch(error){return json({ok:false,error:'bestbuy_upstream_failed',message:clean(error?.message,160)},502,{'cache-control':'no-store'});}
}

export async function handleBestBuyProvider(request,env){const url=new URL(request.url);const path=url.pathname.replace(/\/+$/,'')||'/';if(path===LIST_ROUTE){if(request.method==='GET'||request.method==='HEAD')return listProducts(request,env);return json({ok:false,error:'method_not_allowed'},405);}if(path.startsWith(ITEM_PREFIX)){if(request.method!=='GET'&&request.method!=='HEAD')return json({ok:false,error:'method_not_allowed'},405);return getProduct(request,env,decodeURIComponent(path.slice(ITEM_PREFIX.length)));}return null;}