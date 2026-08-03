// Product catalog management API for the /trgovina/ webshop.
// V2 preserves the original V1 POST/PUT contract and adds richer metadata
// plus a separate authenticated bulk-upsert route for partner imports.
export const VERSION='GNK_ASG_PRODUCT_CATALOG_API_V2_20260727_COMPAT';

const PREFIX='/api/v1/products';
const KV_INDEX_KEY='webshop:products:index';
const KV_ITEM_PREFIX='webshop:products:item:';
const kv=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-product-catalog-api':VERSION,'x-robots-tag':'noindex, nofollow'}});

function timingSafeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function checkApiKey(request,env){
  const expected=String(env?.WEBSHOP_API_KEY||'').trim();
  const provided=String(request.headers.get('x-api-key')||'').trim();
  return Boolean(expected&&provided&&timingSafeEqual(provided,expected));
}

const SKU_RE=/^[A-Z0-9][A-Z0-9-]{2,39}$/;
const AVAILABILITY_VALUES=new Set(['in_stock','out_of_stock','on_request']);
const PARTNER_AVAILABILITY_VALUES=new Set([...AVAILABILITY_VALUES,'unknown']);
const cleanText=(value,max)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
function cleanUrl(value){
  const raw=cleanText(value,1200);
  if(!raw)return '';
  try{const url=new URL(raw);return url.protocol==='http:'||url.protocol==='https:'?url.toString():'';}catch{return '';}
}
function validSku(value){return typeof value==='string'&&SKU_RE.test(value.trim().toUpperCase());}
function validPriceEur(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000&&Math.round(value*100)===value*100;}
function validOptionalPrice(value){return value===null||value===undefined||validPriceEur(value);}

async function loadIndex(store){try{const raw=await store.get(KV_INDEX_KEY);return raw?JSON.parse(raw):[];}catch{return [];}}
async function saveIndex(store,index){await store.put(KV_INDEX_KEY,JSON.stringify(index));}
async function loadProduct(store,sku){try{const raw=await store.get(KV_ITEM_PREFIX+sku);return raw?JSON.parse(raw):null;}catch{return null;}}
async function saveProduct(store,sku,product){await store.put(KV_ITEM_PREFIX+sku,JSON.stringify(product));}
async function ensureIndexed(store,sku){const index=await loadIndex(store);if(!index.includes(sku)){index.push(sku);await saveIndex(store,index);}}

function optionalMetadata(body,existing={}){
  return {
    brand:cleanText(body.brand??existing.brand,120),
    mpn:cleanText(body.mpn??existing.mpn,120),
    ean:cleanText(body.ean??existing.ean,32),
    image:cleanUrl(body.image??existing.image),
    sourceUrl:cleanUrl(body.sourceUrl??existing.sourceUrl),
    sourceLabel:cleanText(body.sourceLabel??existing.sourceLabel,120),
    merchant:cleanText(body.merchant??existing.merchant,120),
    shippingEur:validOptionalPrice(body.shippingEur)?(body.shippingEur??existing.shippingEur??null):(existing.shippingEur??null),
    tags:Array.isArray(body.tags)?body.tags.slice(0,12).map(item=>cleanText(item,60)).filter(Boolean):(existing.tags||[]),
    checkedAt:cleanText(body.checkedAt??existing.checkedAt,40)
  };
}

async function handleList(env){
  const store=kv(env);
  if(!store)return json({ok:true,products:[],storage:'unavailable'},200);
  const index=await loadIndex(store);
  const products=[];
  for(const sku of index){const product=await loadProduct(store,sku);if(product)products.push(product);}
  return json({ok:true,products,total:products.length,version:VERSION});
}

async function handleCreate(request,env){
  if(!checkApiKey(request,env))return json({ok:false,error:'unauthorized'},401);
  const store=kv(env);
  if(!store)return json({ok:false,error:'storage_unavailable'},503);
  let body;
  try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const sku=cleanText(body.sku,40).toUpperCase();
  const name=cleanText(body.name,200);
  const priceEur=body.priceEur;
  const availability=cleanText(body.availability,20);
  const category=cleanText(body.category,120);
  const description=cleanText(body.description,2000);
  const errors=[];
  if(!validSku(sku))errors.push('sku: must be 3-40 chars, A-Z/0-9/hyphen, starting with a letter or digit');
  if(!name)errors.push('name: required');
  if(!validPriceEur(priceEur))errors.push('priceEur: must be a non-negative number with at most 2 decimals');
  if(!AVAILABILITY_VALUES.has(availability))errors.push(`availability: must be one of ${[...AVAILABILITY_VALUES].join(', ')}`);
  if(errors.length)return json({ok:false,error:'validation_failed',details:errors},400);
  if(await loadProduct(store,sku))return json({ok:false,error:'sku_already_exists',sku},409);
  const now=new Date().toISOString();
  const product={sku,name,priceEur,availability,category,description,...optionalMetadata(body),createdAt:now,updatedAt:now};
  await saveProduct(store,sku,product);
  await ensureIndexed(store,sku);
  return json({ok:true,created:true,product},201);
}

async function handleUpdate(request,env,sku){
  if(!checkApiKey(request,env))return json({ok:false,error:'unauthorized'},401);
  const store=kv(env);
  if(!store)return json({ok:false,error:'storage_unavailable'},503);
  if(!validSku(sku))return json({ok:false,error:'invalid_sku'},400);
  const existing=await loadProduct(store,sku);
  if(!existing)return json({ok:false,error:'not_found',sku},404);
  let body;
  try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const updated={...existing};
  const errors=[];
  if(body.priceEur!==undefined){if(!validPriceEur(body.priceEur))errors.push('priceEur: must be a non-negative number with at most 2 decimals');else updated.priceEur=body.priceEur;}
  if(body.availability!==undefined){const value=cleanText(body.availability,20);if(!AVAILABILITY_VALUES.has(value))errors.push(`availability: must be one of ${[...AVAILABILITY_VALUES].join(', ')}`);else updated.availability=value;}
  if(body.name!==undefined){const value=cleanText(body.name,200);if(!value)errors.push('name: cannot be empty');else updated.name=value;}
  if(body.category!==undefined)updated.category=cleanText(body.category,120);
  if(body.description!==undefined)updated.description=cleanText(body.description,2000);
  if(errors.length)return json({ok:false,error:'validation_failed',details:errors},400);
  Object.assign(updated,optionalMetadata(body,existing),{updatedAt:new Date().toISOString()});
  await saveProduct(store,sku,updated);
  return json({ok:true,updated:true,product:updated});
}

function normalizePartnerItem(body,existing=null){
  const sku=cleanText(body?.sku,40).toUpperCase();
  const name=cleanText(body?.name,200);
  const priceEur=body?.priceEur;
  const availability=cleanText(body?.availability??'unknown',20);
  const errors=[];
  if(!validSku(sku))errors.push('invalid sku');
  if(!name)errors.push('name required');
  if(!validOptionalPrice(priceEur))errors.push('invalid priceEur');
  if(!PARTNER_AVAILABILITY_VALUES.has(availability))errors.push('invalid availability');
  const now=new Date().toISOString();
  return {errors,product:{...(existing||{}),sku,name,priceEur:priceEur??null,availability,category:cleanText(body?.category,120),description:cleanText(body?.description,2000),...optionalMetadata(body,existing||{}),createdAt:existing?.createdAt||now,updatedAt:now}};
}

async function handleBulk(request,env){
  if(!checkApiKey(request,env))return json({ok:false,error:'unauthorized'},401);
  const store=kv(env);
  if(!store)return json({ok:false,error:'storage_unavailable'},503);
  let body;
  try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const items=Array.isArray(body?.products)?body.products:[];
  if(!items.length||items.length>250)return json({ok:false,error:'products_must_contain_1_to_250_items'},400);
  const results=[];
  for(const item of items){
    const sku=cleanText(item?.sku,40).toUpperCase();
    const existing=sku?await loadProduct(store,sku):null;
    const {errors,product}=normalizePartnerItem(item,existing);
    if(errors.length){results.push({ok:false,sku,errors});continue;}
    await saveProduct(store,product.sku,product);
    await ensureIndexed(store,product.sku);
    results.push({ok:true,sku:product.sku,created:!existing,product});
  }
  const ok=results.every(result=>result.ok);
  return json({ok,total:results.length,succeeded:results.filter(result=>result.ok).length,failed:results.filter(result=>!result.ok).length,results},ok?200:207);
}

export async function handleProductCatalogApi(request,env){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';
  if(path===PREFIX){
    if(request.method==='GET'||request.method==='HEAD')return handleList(env);
    if(request.method==='POST')return handleCreate(request,env);
    return json({ok:false,error:'method_not_allowed'},405);
  }
  if(path===`${PREFIX}/bulk`){
    if(request.method==='POST')return handleBulk(request,env);
    return json({ok:false,error:'method_not_allowed'},405);
  }
  const match=path.match(new RegExp(`^${PREFIX}/([^/]+)$`));
  if(match){
    const sku=decodeURIComponent(match[1]).toUpperCase();
    if(request.method==='PUT')return handleUpdate(request,env,sku);
    if(request.method==='GET'){
      const store=kv(env);
      if(!store)return json({ok:false,error:'storage_unavailable'},503);
      const product=await loadProduct(store,sku);
      return product?json({ok:true,product}):json({ok:false,error:'not_found',sku},404);
    }
    return json({ok:false,error:'method_not_allowed'},405);
  }
  return null;
}
