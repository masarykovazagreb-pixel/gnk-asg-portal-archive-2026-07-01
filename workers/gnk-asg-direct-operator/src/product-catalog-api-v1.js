// Product catalog API for /trgovina/.
export const VERSION='GNK_ASG_PRODUCT_CATALOG_API_V2_20260727';
const PREFIX='/api/v1/products';
const KV_INDEX_KEY='webshop:products:index';
const KV_ITEM_PREFIX='webshop:products:item:';
const kv=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-product-catalog-api':VERSION}});
function timingSafeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function checkApiKey(request,env){const expected=String(env?.WEBSHOP_API_KEY||'').trim();const provided=String(request.headers.get('x-api-key')||'').trim();return !!expected&&!!provided&&timingSafeEqual(provided,expected);}
const SKU_RE=/^[A-Z0-9][A-Z0-9-]{2,63}$/;
const AVAILABILITY_VALUES=new Set(['in_stock','out_of_stock','on_request','unknown']);
const cleanText=(v,max)=>String(v??'').replace(/\u0000/g,'').trim().slice(0,max);
const cleanUrl=v=>{const s=cleanText(v,1200);if(!s)return '';try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.toString():'';}catch{return '';}};
const validPrice=v=>v===null||v===undefined||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000&&Math.round(v*100)===v*100);
async function loadIndex(store){try{const raw=await store.get(KV_INDEX_KEY);return raw?JSON.parse(raw):[];}catch{return [];}}
async function saveIndex(store,index){await store.put(KV_INDEX_KEY,JSON.stringify(index));}
async function loadProduct(store,sku){try{const raw=await store.get(KV_ITEM_PREFIX+sku);return raw?JSON.parse(raw):null;}catch{return null;}}
async function saveProduct(store,sku,p){await store.put(KV_ITEM_PREFIX+sku,JSON.stringify(p));}
function normalize(body,existing=null){
 const sku=cleanText(body.sku??existing?.sku,64).toUpperCase();
 const name=cleanText(body.name??existing?.name,220);
 const priceEur=body.priceEur!==undefined?body.priceEur:existing?.priceEur;
 const availability=cleanText(body.availability??existing?.availability??'unknown',24);
 const errors=[];
 if(!SKU_RE.test(sku))errors.push('invalid sku'); if(!name)errors.push('name required'); if(!validPrice(priceEur))errors.push('invalid priceEur'); if(!AVAILABILITY_VALUES.has(availability))errors.push('invalid availability');
 const p={
  ...(existing||{}),sku,name,priceEur:priceEur??null,availability,
  category:cleanText(body.category??existing?.category,120),description:cleanText(body.description??existing?.description,2500),
  brand:cleanText(body.brand??existing?.brand,120),mpn:cleanText(body.mpn??existing?.mpn,120),ean:cleanText(body.ean??existing?.ean,32),
  image:cleanUrl(body.image??existing?.image),sourceUrl:cleanUrl(body.sourceUrl??existing?.sourceUrl),sourceLabel:cleanText(body.sourceLabel??existing?.sourceLabel,120),
  merchant:cleanText(body.merchant??existing?.merchant,120),shippingEur:validPrice(body.shippingEur)?(body.shippingEur??existing?.shippingEur??null):(existing?.shippingEur??null),
  tags:Array.isArray(body.tags)?body.tags.slice(0,12).map(x=>cleanText(x,60)).filter(Boolean):(existing?.tags||[]),
  checkedAt:cleanText(body.checkedAt??existing?.checkedAt,40),updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()
 };
 return {p,errors};
}
async function handleList(env){const store=kv(env);if(!store)return json({ok:true,products:[],storage:'unavailable',version:VERSION});const index=await loadIndex(store);const products=[];for(const sku of index){const p=await loadProduct(store,sku);if(p)products.push(p);}return json({ok:true,products,total:products.length,version:VERSION});}
async function upsertOne(store,body){const sku=cleanText(body?.sku,64).toUpperCase();const existing=sku?await loadProduct(store,sku):null;const {p,errors}=normalize(body,existing);if(errors.length)return {ok:false,sku,errors};await saveProduct(store,p.sku,p);const index=await loadIndex(store);if(!index.includes(p.sku)){index.push(p.sku);await saveIndex(store,index);}return {ok:true,product:p,created:!existing};}
async function handleWrite(request,env,forcedSku=null){if(!checkApiKey(request,env))return json({ok:false,error:'unauthorized'},401);const store=kv(env);if(!store)return json({ok:false,error:'storage_unavailable'},503);let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}if(forcedSku)body={...body,sku:forcedSku};const result=await upsertOne(store,body);return result.ok?json(result,result.created?201:200):json({ok:false,error:'validation_failed',details:result.errors},400);}
async function handleBulk(request,env){if(!checkApiKey(request,env))return json({ok:false,error:'unauthorized'},401);const store=kv(env);if(!store)return json({ok:false,error:'storage_unavailable'},503);let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}const items=Array.isArray(body?.products)?body.products:[];if(!items.length||items.length>250)return json({ok:false,error:'products_must_contain_1_to_250_items'},400);const results=[];for(const item of items)results.push(await upsertOne(store,item));return json({ok:results.every(r=>r.ok),total:results.length,succeeded:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results},results.every(r=>r.ok)?200:207);}
export async function handleProductCatalogApi(request,env){const url=new URL(request.url);const path=url.pathname.replace(/\/+$/,'')||'/';if(path===PREFIX){if(request.method==='GET'||request.method==='HEAD')return handleList(env);if(request.method==='POST')return handleWrite(request,env);return json({ok:false,error:'method_not_allowed'},405);}if(path===PREFIX+'/bulk'){if(request.method==='POST')return handleBulk(request,env);return json({ok:false,error:'method_not_allowed'},405);}const m=path.match(new RegExp(`^${PREFIX}/([^/]+)$`));if(m){const sku=decodeURIComponent(m[1]).toUpperCase();if(request.method==='PUT')return handleWrite(request,env,sku);if(request.method==='GET'){const store=kv(env);if(!store)return json({ok:false,error:'storage_unavailable'},503);const product=await loadProduct(store,sku);return product?json({ok:true,product}):json({ok:false,error:'not_found',sku},404);}return json({ok:false,error:'method_not_allowed'},405);}return null;}
