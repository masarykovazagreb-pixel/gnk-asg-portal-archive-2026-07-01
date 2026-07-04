import {buildDailyEditorialPlan,VERSION as EDITORIAL_PLAN_VERSION} from './editorial-draft-planner-v1.js';

export const VERSION=`GNK_ASG_PUBLIC_OPERATIONS_V1_20260704_${EDITORIAL_PLAN_VERSION}`;
export const API_PREFIX='/api/public-operations';
export const ADMIN_PREFIX='/api/editorial-operations/public-approval';
export const TIMEZONE='Europe/Zagreb';
export const APPROVAL_HOUR=8;

const clean=value=>String(value??'').trim();
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const reportKey=date=>`public-operations:daily-report:${date}`;
const decisionKey=date=>`public-operations:daily-decision:${date}`;
const latestKey='public-operations:daily-report:latest-approved';
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-public-operations':VERSION}});

function zonedParts(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
}

export function localDate(value=new Date()){
  const p=zonedParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

function localHour(value=new Date()){return Number(zonedParts(value).hour);}
function previousDate(value=new Date()){return localDate(new Date((value instanceof Date?value:new Date(value)).getTime()-86400000));}
function deadlineLabel(date){return `${date} 08:00 Europe/Zagreb`;}

async function readJson(binding,key){
  if(!binding?.get)return null;
  const raw=await binding.get(key);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}

async function writeJson(binding,key,value){
  if(binding?.put)await binding.put(key,JSON.stringify(value));
  return value;
}

async function deleteKey(binding,key){if(binding?.delete)await binding.delete(key);}

async function assetJson(env,path){
  if(!env?.ASSETS?.fetch)return null;
  try{
    const response=await env.ASSETS.fetch(new Request(`https://assets.internal${path}`));
    if(!response.ok)return null;
    return response.json();
  }catch{return null}
}

function itemsOf(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:Array.isArray(payload?.articles)?payload.articles:[];}

export function approvalState(date,decision,now=new Date()){
  const today=localDate(now);
  const passed=date<today||(date===today&&localHour(now)>=APPROVAL_HOUR);
  const state=clean(decision?.state).toLowerCase();
  if(state==='cancelled'||state==='canceled')return{state:'cancelled',approved:false,public:false,reason:clean(decision?.reason)||'cancelled_by_executive_office'};
  if(state==='held')return{state:'held',approved:false,public:false,reason:clean(decision?.reason)||'held_by_executive_office'};
  if(state==='approved'||state==='approved-explicitly')return{state:'approved-explicitly',approved:true,public:true,reason:'approved_by_executive_office'};
  if(passed)return{state:'approved-by-silence',approved:true,public:true,reason:'not_cancelled_before_08_review_deadline'};
  return{state:'awaiting-08-review',approved:false,public:false,reason:'review_window_open'};
}

function publicPublicationCount(items){
  return items.filter(item=>{
    const state=clean(item?.state||item?.status||item?.approvalState).toLowerCase();
    if(!state)return true;
    return ['published','approved','approved-by-silence','approved-explicitly','public'].includes(state);
  }).length;
}

async function buildReport(env,date,decision,now=new Date()){
  const plan=buildDailyEditorialPlan(date);
  const [publicationsPayload,newsPayload,catalog]=await Promise.all([
    assetJson(env,'/data/auto-editor.json'),
    assetJson(env,'/data/news.json'),
    assetJson(env,'/data/public-portal-catalog.json')
  ]);
  const publications=itemsOf(publicationsPayload),news=itemsOf(newsPayload),approval=approvalState(date,decision,now);
  return{
    ok:true,
    version:VERSION,
    date,
    timezone:TIMEZONE,
    generatedAt:now.toISOString(),
    reportType:'public-daily-operations-summary',
    approval:{
      ...approval,
      deadline:deadlineLabel(date),
      rule:'Readiness-complete reports and publications are treated as approved at 08:00 Europe/Zagreb unless cancelled or held before the deadline.'
    },
    workforce:{
      profileType:'digital operations profile',
      configuredProfiles:1500,
      departments:27,
      entitySlots:43,
      statusDistribution:{active:644,busy:214,scheduled:214,idle:214,'approval-required':214},
      publicDirectory:'/digital-workforce/directory/',
      disclosure:'Functional digital workflow identities. This is not by itself a register of natural persons or confirmed employment relationships.'
    },
    editorial:{
      brand:'THE CODE Intelligence',
      configuredEditorialProfiles:plan.summary.editorialProfiles,
      plannedDeskDraftSlots:plan.summary.deskDrafts,
      plannedOriginalOrCommentarySlots:plan.summary.nerminOriginalOrCommentarySlots,
      totalPlannedSlots:plan.summary.totalSlots,
      automaticPublication:false,
      readinessAndApprovalRequired:true,
      reviewTime:'08:00 Europe/Zagreb'
    },
    publicOutputs:{
      publishedOrApprovedTexts:publicPublicationCount(publications),
      publicNewsEntries:news.length,
      publicationsRoute:'/objave/',
      newsRoute:'/vijesti/',
      reportsRoute:'/#dnevna-izvjesca'
    },
    systems:{
      publicPortal:'operational',
      enterprisePortal:'protected',
      publicCatalogueVersion:catalog?.version||null,
      privateMailData:'not_public',
      privateAuditRecords:'not_public',
      tokensAndSecrets:'never_public'
    }
  };
}

export async function runPublicOperationsCycle(env,now=new Date()){
  const binding=kvOf(env),date=localDate(now),decision=await readJson(binding,decisionKey(date));
  const report=await buildReport(env,date,decision,now);
  await writeJson(binding,reportKey(date),report);
  if(report.approval.public)await writeJson(binding,latestKey,report);
  return{ok:true,report,version:VERSION};
}

async function approvedReport(env,date,now=new Date()){
  const binding=kvOf(env),decision=await readJson(binding,decisionKey(date));
  let report=await readJson(binding,reportKey(date));
  if(!report||report.version!==VERSION){report=await buildReport(env,date,decision,now);await writeJson(binding,reportKey(date),report);}
  else report={...report,approval:{...report.approval,...approvalState(date,decision,now),deadline:deadlineLabel(date)}};
  if(report.approval.public){await writeJson(binding,latestKey,report);return report;}
  return null;
}

async function latestApprovedReport(env,now=new Date()){
  const binding=kvOf(env),today=localDate(now);
  const todayReport=await approvedReport(env,today,now);
  if(todayReport)return todayReport;
  const stored=await readJson(binding,latestKey);
  if(stored?.approval?.public)return stored;
  const fallbackDate=previousDate(now),fallback=await approvedReport(env,fallbackDate,now);
  return fallback;
}

export const isPublicOperationsPath=path=>path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);
export const isPublicOperationsAdminPath=path=>path===ADMIN_PREFIX||path.startsWith(`${ADMIN_PREFIX}/`);

export async function handlePublicOperations(request,env){
  const path=pathOf(request),url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
  if(path===`${API_PREFIX}/catalog`){
    const catalogue=await assetJson(env,'/data/public-portal-catalog.json');
    return catalogue?json(catalogue):json({ok:false,error:'catalogue_unavailable'},503);
  }
  if(path===`${API_PREFIX}/report/latest`){
    const report=await latestApprovedReport(env,new Date());
    return report?json(report):json({ok:false,error:'approved_report_not_available'},404);
  }
  if(path===`${API_PREFIX}/report`){
    const date=clean(url.searchParams.get('date'));
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    const report=await approvedReport(env,date,new Date());
    return report?json(report):json({ok:false,error:'report_not_public',date},404);
  }
  return json({ok:false,error:'not_found'},404);
}

export async function handlePublicOperationsAdmin(request,env){
  const path=pathOf(request),url=new URL(request.url),binding=kvOf(env);
  if(request.method==='GET'&&path===`${ADMIN_PREFIX}/status`){
    const date=clean(url.searchParams.get('date'))||localDate();
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    const decision=await readJson(binding,decisionKey(date));
    const report=await buildReport(env,date,decision,new Date());
    return json({ok:true,date,decision,approval:report.approval,report,version:VERSION});
  }
  if(request.method==='POST'&&path===`${ADMIN_PREFIX}/decision`){
    const body=await request.json().catch(()=>({})),date=clean(body.date)||localDate(),state=clean(body.state).toLowerCase();
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    if(!['approved','approved-explicitly','held','cancelled','clear'].includes(state))return json({ok:false,error:'invalid_state'},400);
    if(state==='clear')await deleteKey(binding,decisionKey(date));
    else await writeJson(binding,decisionKey(date),{date,state,reason:clean(body.reason),decidedAt:new Date().toISOString(),source:'executive-office'});
    const decision=await readJson(binding,decisionKey(date)),report=await buildReport(env,date,decision,new Date());
    await writeJson(binding,reportKey(date),report);
    if(report.approval.public)await writeJson(binding,latestKey,report);
    return json({ok:true,date,decision,approval:report.approval,report,version:VERSION});
  }
  return null;
}

export const __test={localDate,approvalState,reportKey,decisionKey,latestKey,itemsOf};
