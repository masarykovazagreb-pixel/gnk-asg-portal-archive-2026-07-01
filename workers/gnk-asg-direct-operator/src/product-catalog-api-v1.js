// Product catalog management API for the /trgovina/ webshop.
//
// SECURITY MODEL:
// - Write endpoints (POST/PUT) require a secret API key sent as the
//   `x-api-key` request header, compared against env.WEBSHOP_API_KEY
//   using a constant-time comparison. That secret must be set as a
//   Cloudflare Worker secret (wrangler secret put WEBSHOP_API_KEY) --
//   it is NEVER embedded in any client-side/browser-served code, and
//   this file never echoes it back in any response, including error
//   responses. If the secret is not configured, all write requests
//   are denied (fail-closed), not silently allowed.
// - The read endpoint (GET) is public and unauthenticated, matching
//   how the storefront itself already works (products.json is public
//   data, not sensitive).
// - Intended callers for POST/PUT: an external inventory/PIM system,
//   an admin script, or a scheduled sync job -- never the public
//   /trgovina/ page's own client-side JS.

export const VERSION='GNK_ASG_PRODUCT_CATALOG_API_V1_20260726';

const PREFIX='/api/v1/products';
const KV_INDEX_KEY='webshop:products:index';
const KV_ITEM_PREFIX='webshop:products:item:';

const kv=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-product-catalog-api':VERSION}});

function timingSafeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

function checkApiKey(request,env){
  const expected=String(env?.WEBSHOP_API_KEY||'').trim();
  if(!expected)return false; // fail-closed: no secret configured means no writes allowed
  const provided=String(request.headers.get('x-api-key')||'').trim();
  if(!provided)return false;
  return timingSafeEqual(provided,expected);
}

const SKU_RE=/^[A-Z0-9][A-Z0-9-]{2,39}$/;
function validSku(value){return typeof value==='string'&&SKU_RE.test(value.trim().toUpperCase());}

function validPriceEur(value){
  if(typeof value!=='number'||!Number.isFinite(value))return false;
  if(value<0||value>1000000)return false;
  // at most 2 decimal places
  return Math.round(value*100)===value*100;
}

const AVAILABILITY_VALUES=new Set(['in_stock','out_of_stock','on_request']);
function validAvailability(value){return AVAILABILITY_VALUES.has(value);}

function cleanText(value,max){return String(value??'').replace(/\u0000/g,'').trim().slice(0,max);}

async function loadIndex(store){
  try{const raw=await store.get(KV_INDEX_KEY);return raw?JSON.parse(raw):[];}catch{return [];}
}
async function saveIndex(store,index){await store.put(KV_INDEX_KEY,JSON.stringify(index));}

async function loadProduct(store,sku){
  try{const raw=await store.get(KV_ITEM_PREFIX+sku);return raw?JSON.parse(raw):null;}catch{return null;}
}
async function saveProduct(store,sku,product){await store.put(KV_ITEM_PREFIX+sku,JSON.stringify(product));}

async function handleList(env){
  const store=kv(env);
  if(!store)return json({ok:true,products:[],storage:'unavailable'},200);
  const index=await loadIndex(store);
  const products=[];
  for(const sku of index){
    const p=await loadProduct(store,sku);
    if(p)products.push(p);
  }
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
  if(!validAvailability(availability))errors.push(`availability: must be one of ${[...AVAILABILITY_VALUES].join(', ')}`);
  if(errors.length)return json({ok:false,error:'validation_failed',details:errors},400);

  const existing=await loadProduct(store,sku);
  if(existing)return json({ok:false,error:'sku_already_exists',sku},409);

  const now=new Date().toISOString();
  const product={sku,name,priceEur,availability,category,description,createdAt:now,updatedAt:now};
  await saveProduct(store,sku,product);
  const index=await loadIndex(store);
  if(!index.includes(sku)){index.push(sku);await saveIndex(store,index);}

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

  if(body.priceEur!==undefined){
    if(!validPriceEur(body.priceEur))errors.push('priceEur: must be a non-negative number with at most 2 decimals');
    else updated.priceEur=body.priceEur;
  }
  if(body.availability!==undefined){
    const availability=cleanText(body.availability,20);
    if(!validAvailability(availability))errors.push(`availability: must be one of ${[...AVAILABILITY_VALUES].join(', ')}`);
    else updated.availability=availability;
  }
  if(body.name!==undefined){
    const name=cleanText(body.name,200);
    if(!name)errors.push('name: cannot be empty');
    else updated.name=name;
  }
  if(body.category!==undefined)updated.category=cleanText(body.category,120);
  if(body.description!==undefined)updated.description=cleanText(body.description,2000);

  if(errors.length)return json({ok:false,error:'validation_failed',details:errors},400);

  updated.updatedAt=new Date().toISOString();
  await saveProduct(store,sku,updated);
  return json({ok:true,updated:true,product:updated});
}

export async function handleProductCatalogApi(request,env){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';

  if(path===PREFIX){
    if(request.method==='GET'||request.method==='HEAD')return handleList(env);
    if(request.method==='POST')return handleCreate(request,env);
    return json({ok:false,error:'method_not_allowed'},405);
  }

  const itemMatch=path.match(new RegExp(`^${PREFIX}/([^/]+)$`));
  if(itemMatch){
    const sku=decodeURIComponent(itemMatch[1]).toUpperCase();
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
