import {
  API_PREFIX,
  handleNewsMarketIntelligenceApi as baseHandle,
  isNewsMarketIntelligenceApi,
  readNewsIntelligenceConfig,
  runNewsMarketIntelligence as baseRun,
  VERSION as BASE_VERSION
} from './news-market-intelligence-v1.js';

export const VERSION=`GNK_GROUP_NEWS_MARKET_INTELLIGENCE_GUARD_V1_20260716_${BASE_VERSION}`;
const clean=value=>String(value??'').trim();
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const CONFIG_KEY='news-intelligence:config:v1';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-news-intelligence-guard':VERSION}});

export function safePublicHttpsUrl(value){
  let url;try{url=new URL(clean(value));}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))return null;
  if(/^127\.|^0\.|^10\.|^192\.168\.|^169\.254\.|^224\.|^240\./.test(host))return null;
  const parts=host.split('.').map(Number);
  if(parts.length===4&&parts.every(Number.isInteger)){
    if(parts[0]===172&&parts[1]>=16&&parts[1]<=31)return null;
    if(parts[0]===100&&parts[1]>=64&&parts[1]<=127)return null;
  }
  if(host==='::1'||/^(fc|fd|fe8|fe9|fea|feb)/.test(host))return null;
  url.hash='';
  return url.toString();
}

function sanitizeSources(values){
  const output=[];
  for(const raw of Array.isArray(values)?values.slice(0,100):[]){
    const url=safePublicHttpsUrl(raw?.url);
    if(raw?.enabled&&!url)throw Object.assign(new Error('invalid_source_url'),{sourceId:clean(raw?.id)});
    output.push({...raw,url:url||''});
  }
  return output;
}

async function storeConfig(env,body){
  const kv=kvOf(env);if(!kv?.put)throw new Error('kv_unavailable');
  const config={enabled:Boolean(body.enabled),automaticPublication:false,sources:sanitizeSources(body.sources),updatedAt:new Date().toISOString()};
  await kv.put(CONFIG_KEY,JSON.stringify(config,null,2));
  return config;
}

function token(request){const auth=request.headers.get('authorization')||'';return request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||auth.replace(/^Bearer\s+/i,'');}
function authorised(request,env){const expected=clean(env?.OPERATOR_TOKEN||env?.GNK_ASG_OPERATOR_TOKEN||env?.ADMIN_TOKEN||env?.GNK_ASG_ADMIN_TOKEN);return Boolean(expected&&clean(token(request))===expected);}

export async function runNewsMarketIntelligence(env,force=false){
  const config=await readNewsIntelligenceConfig(env);
  try{sanitizeSources(config.sources);}catch(error){return{ok:false,skipped:'unsafe_source_config',error:String(error?.message||error),sourceId:error?.sourceId||null,version:VERSION};}
  return baseRun(env,force);
}

export async function handleNewsMarketIntelligenceApi(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='PUT'&&path===`${API_PREFIX}/config`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    const body=await request.json().catch(()=>({}));
    try{return json({ok:true,version:VERSION,config:await storeConfig(env,body)});}catch(error){return json({ok:false,error:String(error?.message||error),sourceId:error?.sourceId||null},400);}
  }
  return baseHandle(request,env);
}

export {isNewsMarketIntelligenceApi};
