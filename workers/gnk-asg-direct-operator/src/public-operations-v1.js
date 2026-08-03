import {buildDailyEditorialPlan,VERSION as EDITORIAL_PLAN_VERSION} from './editorial-draft-planner-v1.js';

export const VERSION=`GNK_ASG_PUBLIC_OPERATIONS_V4_20260705_${EDITORIAL_PLAN_VERSION}`;
export const API_PREFIX='/api/public-operations';
export const ADMIN_PREFIX='/api/editorial-operations/public-approval';
export const TIMEZONE='Europe/Zagreb';
export const REVIEW_HOUR=8;
export const APPROVAL_HOUR=9;

const clean=value=>String(value??'').trim();
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const reportKey=date=>`public-operations:daily-report:${date}`;
const decisionKey=date=>`public-operations:daily-decision:${date}`;
const latestKey='public-operations:daily-report:latest-approved';
const auditKey=date=>`public-operations:audit:${date}`;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const corsHeaders={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,HEAD,OPTIONS',
  'access-control-allow-headers':'content-type,authorization,x-gnk-admin-token',
  'access-control-max-age':'86400'
};
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-public-operations':VERSION,'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow',...corsHeaders}});
const empty=(status=204)=>new Response(null,{status,headers:{'cache-control':'no-store','x-gnk-public-operations':VERSION,...corsHeaders}});

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
function reviewLabel(date){return `${date} 08:00 Europe/Zagreb`;}
function deadlineLabel(date){return `${date} 09:00 Europe/Zagreb`;}
function authToken(env){return clean(env?.PUBLIC_OPERATIONS_ADMIN_TOKEN||env?.GNK_ASG_ADMIN_TOKEN||env?.ADMIN_TOKEN);}
function adminAuthorized(request,env){
  const token=authToken(env);
  if(!token)return false;
  const header=clean(request.headers.get('authorization')).replace(/^Bearer\s+/i,'');
  const explicit=clean(request.headers.get('x-gnk-admin-token'));
  return header===token||explicit===token;
}

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

async function appendAudit(binding,date,event){
  if(!binding?.put)return null;
  const key=auditKey(date),existing=await readJson(binding,key),items=Array.isArray(existing)?existing:[];
  const next=[...items.slice(-39),{...event,at:new Date().toISOString(),version:VERSION}];
  await writeJson(binding,key,next);
  return next;
}

async function assetJson(env,path){
  if(!env?.ASSETS?.fetch)return null;
  try{
    const response=await env.ASSETS.fetch(new Request(`https://assets.internal${path}`));
    if(!response.ok)return null;
    return response.json();
  }catch{return null}
}

function itemsOf(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:Array.isArray(payload?.articles)?payload.articles:[];}
function normalizeDecision(value){
  const state=clean(value).toLowerCase();
  if(['approved','approved-explicitly','approve'].includes(state))return'approved-explicitly';
  if(['held','hold'].includes(state))return'held';
  if(['stopped','stop'].includes(state))return'stopped';
  if(['cancelled','canceled','cancel'].includes(state))return'cancelled';
  return state;
}

export function approvalState(date,decision,now=new Date()){
  const today=localDate(now),hour=localHour(now),state=normalizeDecision(decision?.state);
  if(state==='cancelled')return{state:'cancelled',approved:false,public:true,releaseAllowed:false,reason:'cancelled_by_executive_office'};
  if(state==='stopped')return{state:'stopped',approved:false,public:true,releaseAllowed:false,reason:'stopped_by_executive_office'};
  if(state==='held')return{state:'held',approved:false,public:true,releaseAllowed:false,reason:'held_by_executive_office'};
  if(state==='approved-explicitly')return{state:'approved-explicitly',approved:true,public:true,releaseAllowed:true,reason:'approved_by_executive_office'};
  if(date<today||(date===today&&hour>=APPROVAL_HOUR))return{state:'approved-by-silence',approved:true,public:true,releaseAllowed:true,reason:'no_stop_hold_or_cancel_before_09'};
  if(date===today&&hour>=REVIEW_HOUR)return{state:'awaiting-executive-review',approved:false,public:true,releaseAllowed:false,reason:'executive_review_window_08_to_09'};
  return{state:'preparing',approved:false,public:true,releaseAllowed:false,reason:'package_preparation_before_08'};
}

function publicPublicationCount(items){
  return items.filter(item=>{
    const state=clean(item?.state||item?.status||item?.approvalState).toLowerCase();
    if(!state)return true;
    return ['published','approved','approved-by-silence','approved-explicitly','public'].includes(state);
  }).length;
}

function governanceBoard(date,decision,now=new Date()){
  const approval=approvalState(date,decision,now);
  const preparationState=approval.state==='preparing'?'active':'closed';
  const reviewState=approval.state==='awaiting-executive-review'?'active':approval.approved?'approved':(['held','stopped','cancelled'].includes(approval.state)?approval.state:'pending');
  return{
    ok:true,
    version:VERSION,
    date,
    timezone:TIMEZONE,
    generatedAt:now.toISOString(),
    approval,
    policy:{reviewAt:reviewLabel(date),silentApprovalAt:deadlineLabel(date),commands:['APPROVE','STOP','HOLD','CANCEL']},
    controls:[
      {id:'reports-before-0800',title:'Priprema dnevnog paketa do 08:00',state:preparationState,owner:'Public Operations Worker',route:`${API_PREFIX}/report?date=${date}`},
      {id:'approval-after-0800',title:'Executive review 08:00–09:00; prešutno odobrenje nakon 09:00',state:reviewState,owner:'Executive Office',route:`${ADMIN_PREFIX}/status?date=${date}`},
      {id:'mail-safety',title:'Masovni mail ostaje zaključan u review režimu',state:'locked',owner:'Mail Studio',route:'/mail-studio/'},
      {id:'worker-health',title:'Worker health/status endpoint',state:'active',owner:'Cloudflare Worker',route:`${API_PREFIX}/health`},
      {id:'governance-board',title:'Javna tabla zadataka, odluka, zapisnika i zaključaka',state:'active',owner:'Public Governance',route:`${API_PREFIX}/governance-board`},
      {id:'admin-token-lock',title:'Admin status i odluke zahtijevaju token',state:'token-required',owner:'Security',route:ADMIN_PREFIX}
    ],
    tasks:[
      {id:'task-dashboard',label:'Enterprise dashboard',status:'in-review',public:false},
      {id:'task-webmail',label:'Mail Studio/Webmail',status:'in-review',public:false},
      {id:'task-public-index',label:'Javni index bez praznih zona',status:'in-review',public:true},
      {id:'task-workers',label:'Cloudflare Worker endpointi',status:'active-review',public:false},
      {id:'task-preview',label:'Preview deploy prije produkcije',status:'required',public:false}
    ],
    decisions:[
      {id:'deploy-lock',label:'Produkcijski deploy',state:'locked-until-explicit-approval'},
      {id:'dns-lock',label:'DNS / Cloudflare produkcijske rute / secrets',state:'no-change'},
      {id:'campaign-lock',label:'Kampanje i masovni mailovi',state:'no-send'},
      {id:'admin-lock',label:'Javno-operativne odluke',state:'token-required'}
    ],
    meetings:[
      {id:'morning-review',label:'08:00 izvršni paket; 09:00 završetak prozora odluke',state:'scheduled-review',minimumEvidence:['preview link','worker health','mail runtime check','mobile pass']}
    ],
    minutes:[
      {id:'minute-review-only',summary:'Svi novi moduli rade kroz review/preview režim dok ne postoji nova izričita odluka za produkciju.'},
      {id:'minute-public-data-boundary',summary:'Javni endpointi ne izlažu privatne mailove, tokene, privitke, audit zapise ni interne identifikatore.'},
      {id:'minute-admin-lock',summary:'Admin status, audit i odluke zatvoreni su iza Bearer ili x-gnk-admin-token provjere.'},
      {id:'minute-silence-policy',summary:'Prešutno odobrenje nakon 09:00 vrijedi samo za reverzibilne sadržajne i operativne pakete; produkcijski deploy, DNS, plaćanja i masovno slanje ostaju izričito zaključani.'}
    ]
  };
}

async function buildReport(env,date,decision,now=new Date()){
  const plan=buildDailyEditorialPlan(date);
  const [publicationsPayload,newsPayload,catalog]=await Promise.all([
    assetJson(env,'/data/objave-unified.json'),
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
      reviewAt:reviewLabel(date),
      deadline:deadlineLabel(date),
      silentApprovalAt:deadlineLabel(date),
      rule:'The package is prepared before 08:00 Europe/Zagreb. From 08:00 to 09:00 it awaits the Executive Office. At or after 09:00 it becomes APPROVED BY SILENCE only if no STOP, HOLD or CANCEL exists. Production deploy, DNS, payments and mass delivery remain explicit-only.'
    },
    workforce:{
      profileType:'operations profile',
      configuredProfiles:1537,
      departments:27,
      entitySlots:43,
      statusDistribution:{active:661,busy:219,scheduled:219,idle:219,'approval-required':219},
      publicDirectory:'/digital-workforce/directory/',
      disclosure:'Functional operational workflow identities. This is not by itself a register of natural persons or confirmed employment relationships.'
    },
    editorial:{
      brand:'THE CODE Intelligence',
      configuredEditorialProfiles:plan.summary.editorialProfiles,
      plannedDeskDraftSlots:plan.summary.deskDrafts,
      plannedOriginalOrCommentarySlots:plan.summary.nerminOriginalOrCommentarySlots,
      totalPlannedSlots:plan.summary.totalSlots,
      automaticPublication:false,
      readinessAndApprovalRequired:true,
      reviewTime:'08:00 Europe/Zagreb',
      silentApprovalTime:'09:00 Europe/Zagreb'
    },
    publicOutputs:{
      publishedOrApprovedTexts:publicPublicationCount(publications),
      publicNewsEntries:news.length,
      publicationDataSource:'/data/objave-unified.json',
      publicationsRoute:'/objave/',
      newsRoute:'/vijesti/',
      reportsRoute:'/#dnevna-izvjesca',
      governanceRoute:`${API_PREFIX}/governance-board`,
      healthRoute:`${API_PREFIX}/health`
    },
    systems:{
      publicPortal:'operational',
      enterprisePortal:'protected',
      publicCatalogueVersion:catalog?.version||null,
      workerHealth:'operational-review',
      privateMailData:'not_public',
      privateAuditRecords:'not_public',
      tokensAndSecrets:'never_public',
      adminEndpoints:'token_required',
      productionDeploy:'explicit_approval_only',
      massDelivery:'explicit_approval_only'
    }
  };
}

export async function runPublicOperationsCycle(env,now=new Date()){
  const binding=kvOf(env),date=localDate(now),decision=await readJson(binding,decisionKey(date));
  const report=await buildReport(env,date,decision,now);
  await writeJson(binding,reportKey(date),report);
  await appendAudit(binding,date,{type:'scheduled-public-operations-cycle',approval:report.approval?.state,releaseAllowed:report.approval?.releaseAllowed});
  if(report.approval.public)await writeJson(binding,latestKey,report);
  return{ok:true,report,version:VERSION};
}

async function approvedReport(env,date,now=new Date()){
  const binding=kvOf(env),decision=await readJson(binding,decisionKey(date));
  let report=await readJson(binding,reportKey(date));
  if(!report||report.version!==VERSION){report=await buildReport(env,date,decision,now);await writeJson(binding,reportKey(date),report);}
  else report={...report,approval:{...report.approval,...approvalState(date,decision,now),reviewAt:reviewLabel(date),deadline:deadlineLabel(date),silentApprovalAt:deadlineLabel(date)}};
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
  const path=pathOf(request),url=new URL(request.url),now=new Date();
  if(request.method==='OPTIONS')return empty();
  if(!['GET','HEAD'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
  if(path===API_PREFIX||path===`${API_PREFIX}/health`){
    const binding=kvOf(env),date=localDate(now),decision=await readJson(binding,decisionKey(date));
    return json({ok:true,service:'public-operations',version:VERSION,date,timezone:TIMEZONE,approval:approvalState(date,decision,now),policy:{reviewHour:REVIEW_HOUR,silentApprovalHour:APPROVAL_HOUR},bindings:{kv:Boolean(binding),assets:Boolean(env?.ASSETS?.fetch),adminTokenConfigured:Boolean(authToken(env))},routes:{catalog:`${API_PREFIX}/catalog`,latestReport:`${API_PREFIX}/report/latest`,governanceBoard:`${API_PREFIX}/governance-board`},security:{publicSecrets:false,privateMailData:false,auditRecordsPublic:false,adminEndpoints:'token_required'}});
  }
  if(path===`${API_PREFIX}/governance-board`){
    const date=clean(url.searchParams.get('date'))||localDate(now);
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    const decision=await readJson(kvOf(env),decisionKey(date));
    return json(governanceBoard(date,decision,now));
  }
  if(path===`${API_PREFIX}/catalog`){
    const catalogue=await assetJson(env,'/data/public-portal-catalog.json');
    return catalogue?json(catalogue):json({ok:false,error:'catalogue_unavailable'},503);
  }
  if(path===`${API_PREFIX}/report/latest`){
    const report=await latestApprovedReport(env,now);
    return report?json(report):json({ok:false,error:'public_report_not_available'},404);
  }
  if(path===`${API_PREFIX}/report`){
    const date=clean(url.searchParams.get('date'));
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    const report=await approvedReport(env,date,now);
    return report?json(report):json({ok:false,error:'report_not_public',date},404);
  }
  return json({ok:false,error:'not_found'},404);
}

export async function handlePublicOperationsAdmin(request,env){
  const path=pathOf(request),url=new URL(request.url),binding=kvOf(env);
  if(request.method==='OPTIONS')return empty();
  if(!adminAuthorized(request,env))return json({ok:false,error:'unauthorized_admin_endpoint',required:'Bearer token or x-gnk-admin-token'},401);
  if(request.method==='GET'&&path===`${ADMIN_PREFIX}/status`){
    const date=clean(url.searchParams.get('date'))||localDate();
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    const decision=await readJson(binding,decisionKey(date));
    const report=await buildReport(env,date,decision,new Date());
    const audit=await readJson(binding,auditKey(date));
    return json({ok:true,date,decision,approval:report.approval,report,governance:governanceBoard(date,decision,new Date()),audit:audit||[],version:VERSION});
  }
  if(request.method==='POST'&&path===`${ADMIN_PREFIX}/decision`){
    const body=await request.json().catch(()=>({})),date=clean(body.date)||localDate(),state=normalizeDecision(body.state);
    if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
    if(!['approved-explicitly','held','stopped','cancelled','clear'].includes(state))return json({ok:false,error:'invalid_state',allowed:['APPROVE','STOP','HOLD','CANCEL','CLEAR']},400);
    if(state==='clear')await deleteKey(binding,decisionKey(date));
    else await writeJson(binding,decisionKey(date),{date,state,reason:clean(body.reason),decidedAt:new Date().toISOString(),source:'executive-office'});
    const decision=await readJson(binding,decisionKey(date)),report=await buildReport(env,date,decision,new Date());
    await writeJson(binding,reportKey(date),report);
    await appendAudit(binding,date,{type:'executive-decision',state,reason:clean(body.reason),releaseAllowed:report.approval?.releaseAllowed});
    if(report.approval.public)await writeJson(binding,latestKey,report);
    return json({ok:true,date,decision,approval:report.approval,report,governance:governanceBoard(date,decision,new Date()),version:VERSION});
  }
  return json({ok:false,error:'admin_route_not_found'},404);
}

export const __test={localDate,approvalState,reportKey,decisionKey,latestKey,auditKey,itemsOf,governanceBoard,adminAuthorized,normalizeDecision};
