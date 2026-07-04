import {
  API_PREFIX,
  PUBLIC_PREFIXES,
  TIMEZONE,
  PACKAGE_HOUR,
  DEADLINE_HOUR,
  createDailyReviewPackage as createV1,
  releaseDailyPackage as releaseV1,
  recordDecision,
  handleEditorialAutonomyApi as handleV1,
  isEditorialAutonomyPublicPath,
  serveEditorialAutonomyPublic,
  __test as testV1
} from './editorial-autonomous-release-v1.js';

export const VERSION='GNK_EDITORIAL_AUTONOMOUS_RELEASE_V2_20260704';
export {API_PREFIX,PUBLIC_PREFIXES,TIMEZONE,PACKAGE_HOUR,DEADLINE_HOUR,recordDecision,isEditorialAutonomyPublicPath,serveEditorialAutonomyPublic};

const clean=value=>String(value??'').trim();
const bool=value=>/^(1|true|yes|on)$/i.test(clean(value));
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-editorial-autonomy':VERSION}});
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;

async function readJson(binding,key){
  const raw=await binding.get(key);
  return raw?JSON.parse(raw):null;
}
async function writeJson(binding,key,value,options){
  await binding.put(key,JSON.stringify(value),options);
  return value;
}
function resolveDate(dateInput,now=new Date()){
  const local=testV1.localParts(now);
  const requested=typeof dateInput==='string'&&clean(dateInput)?clean(dateInput):local.date;
  if(!datePattern.test(requested))throw new Error('invalid_editorial_date');
  return{requested,local};
}
function compareDate(left,right){return left===right?0:left<right?-1:1;}
function onTimePackage(local,date){return local.date===date&&local.hour===PACKAGE_HOUR&&local.minute<=2;}
function deadlineReached(local,date){return local.date>date||(local.date===date&&local.hour>=DEADLINE_HOUR);}

async function normalizePackageEligibility(env,date,local,result){
  const binding=kvOf(env);
  if(!binding?.get||!binding?.put)return result;
  const key=testV1.packageKey(date);
  const reviewPackage=await readJson(binding,key);
  if(!reviewPackage)return result;
  const live=bool(env.EDITORIAL_AUTONOMY_LIVE);
  const notificationDelivered=reviewPackage.notification?.status==='sent';
  const hasItems=Array.isArray(reviewPackage.items)&&reviewPackage.items.length>0;
  const onTime=onTimePackage(local,date);
  const eligible=live&&notificationDelivered&&hasItems&&onTime;
  const reasons=[];
  if(!live)reasons.push('review_mode_not_live');
  if(!notificationDelivered)reasons.push('notification_not_delivered');
  if(!hasItems)reasons.push('no_eligible_items');
  if(!onTime)reasons.push('package_not_delivered_by_08_02');
  const normalized={
    ...reviewPackage,
    silentConfirmationEligible:eligible,
    silentConfirmationEligibilityVersion:VERSION,
    silentConfirmationEligibilityReasons:reasons,
    reviewWindowValid:onTime,
    reviewWindowMinutes:onTime?60:0
  };
  await writeJson(binding,key,normalized,{expirationTtl:60*60*24*120});
  return{...result,reviewPackage:normalized,version:VERSION};
}

export async function createDailyReviewPackage(env,dateInput=new Date(),nowInput=new Date()){
  const {requested,local}=resolveDate(dateInput,nowInput);
  if(compareDate(requested,local.date)>0)return{ok:false,blocked:'future_package_forbidden',date:requested,version:VERSION};
  if(requested===local.date&&local.hour<PACKAGE_HOUR)return{ok:true,skipped:'package_window_not_open',date:requested,version:VERSION};
  const result=await createV1(env,requested);
  return normalizePackageEligibility(env,requested,local,result);
}

export async function releaseDailyPackage(env,dateInput=new Date(),nowInput=new Date()){
  const {requested,local}=resolveDate(dateInput,nowInput);
  if(compareDate(requested,local.date)>0)return{ok:false,blocked:'future_release_forbidden',date:requested,version:VERSION};
  if(!deadlineReached(local,requested))return{ok:true,skipped:'deadline_not_reached',date:requested,deadline:`${requested}T09:00:00[${TIMEZONE}]`,version:VERSION};
  const binding=kvOf(env);
  if(!binding?.get||!binding?.put)return{ok:true,skipped:'editorial_kv_unavailable',version:VERSION};
  const reviewPackage=await readJson(binding,testV1.packageKey(requested));
  if(!reviewPackage)return{ok:true,skipped:'daily_package_not_found',date:requested,version:VERSION};
  if(reviewPackage.silentConfirmationEligibilityVersion!==VERSION||reviewPackage.silentConfirmationEligible!==true){
    return{ok:false,blocked:'silent_confirmation_not_eligible',date:requested,reasons:reviewPackage.silentConfirmationEligibilityReasons||[],version:VERSION};
  }
  const result=await releaseV1(env,requested);
  return{...result,version:VERSION};
}

export async function runEditorialAutonomousRelease(env,dateInput=new Date()){
  const local=testV1.localParts(dateInput),binding=kvOf(env);
  if(!binding?.get||!binding?.put)return{ok:true,skipped:'editorial_kv_unavailable',version:VERSION};
  const tasks=[];
  if(local.hour===PACKAGE_HOUR)tasks.push(createDailyReviewPackage(env,dateInput,dateInput));
  if(local.hour>=DEADLINE_HOUR)tasks.push(releaseDailyPackage(env,dateInput,dateInput));
  if(!tasks.length)return{ok:true,skipped:'outside_review_or_release_window',local,version:VERSION};
  const settled=await Promise.allSettled(tasks);
  return{ok:settled.every(item=>item.status==='fulfilled'&&item.value?.ok!==false),local,results:settled.map(item=>item.status==='fulfilled'?item.value:{ok:false,error:String(item.reason?.message||item.reason)}),version:VERSION};
}

export async function handleEditorialAutonomyApi(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='POST'&&path===`${API_PREFIX}/package/create`){
    const body=await request.json().catch(()=>({}));
    const result=await createDailyReviewPackage(env,clean(body.date)||new Date());
    return json(result,result.ok===false?409:200);
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/release`){
    const body=await request.json().catch(()=>({}));
    const result=await releaseDailyPackage(env,clean(body.date)||new Date());
    return json(result,result.ok===false?409:200);
  }
  return handleV1(request,env);
}

export const __test={resolveDate,compareDate,onTimePackage,deadlineReached,normalizePackageEligibility,testV1};
