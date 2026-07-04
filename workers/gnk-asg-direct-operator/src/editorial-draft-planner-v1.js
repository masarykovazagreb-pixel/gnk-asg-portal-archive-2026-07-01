import {validatePublicationReadiness,publicationAttribution,VERSION as PUBLICATION_READINESS_VERSION} from './publication-readiness-v1.js';

export const VERSION=`GNK_DINAMO_THE_CODE_EDITORIAL_DRAFT_PLANNER_V2_20260704_${PUBLICATION_READINESS_VERSION}`;
export const API_PREFIX='/api/editorial-operations';
export const PLAN_TIMEZONE='UTC';

export const EDITORIAL_DESKS=Object.freeze([
  {workerId:'EDT-LON-001',centre:'London',desk:'International Business and Corporate Affairs'},
  {workerId:'EDT-FRA-002',centre:'Frankfurt',desk:'Finance, Markets and Compliance'},
  {workerId:'EDT-ZRH-003',centre:'Zurich',desk:'Strategy, Governance and Registry Affairs'},
  {workerId:'EDT-DXB-004',centre:'Dubai',desk:'Technology, AI and Global Operations'},
  {workerId:'EDT-NYC-005',centre:'New York',desk:'Media, Communications and Public Affairs'}
]);

const clean=value=>String(value??'').trim();
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-editorial-planner':VERSION}});
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;

function utcDate(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))throw new Error('invalid_editorial_date');
  return date.toISOString().slice(0,10);
}

function hash(text){
  let value=2166136261;
  for(const char of String(text)){
    value^=char.charCodeAt(0);
    value=Math.imul(value,16777619);
  }
  return value>>>0;
}

export function deskDraftCount(date,workerId){
  return 3+(hash(`${date}:${workerId}`)%3);
}

function deskSlot(date,desk,index){
  const number=String(index).padStart(2,'0');
  return{
    id:`${date}:${desk.workerId}:${number}`,
    date,
    timezone:PLAN_TIMEZONE,
    publicationType:'desk-article',
    slotType:'desk-article',
    state:'sources-required',
    preparedByProfile:desk.workerId,
    centre:desk.centre,
    desk:desk.desk,
    project:'GNK DINAMO Ltd.',
    editorialBrand:'THE CODE Intelligence',
    connectedEntity:'GNK ASG d.o.o.',
    editor:'Nermin Sefić',
    authorEntity:'GNK DINAMO Ltd. Group Editorial Desk',
    sourceRequired:true,
    automaticPublication:false,
    finalApproval:false,
    factCheckComplete:false,
    sourceReviewComplete:false,
    automationAssisted:true,
    processDisclosure:'Draft planning and structural assistance were automated; sourcing, factual review and final editorial approval remain human-controlled.',
    title:'',
    slug:'',
    language:'en',
    category:'',
    summary:'',
    body:'',
    canonical:'',
    image:'',
    imageAlt:'',
    primarySource:'',
    supportingSources:[],
    dateCreated:new Date().toISOString(),
    dateReviewed:''
  };
}

function nerminSlot(date,index){
  const number=String(index).padStart(2,'0');
  return{
    id:`${date}:NSEFIC:${number}`,
    date,
    timezone:PLAN_TIMEZONE,
    publicationType:'nermin-original',
    slotType:'nermin-original-or-commentary',
    state:'author-confirmation-required',
    project:'GNK DINAMO Ltd.',
    editorialBrand:'THE CODE Intelligence',
    connectedEntity:'GNK ASG d.o.o.',
    proposedAuthor:'Nermin Sefić',
    authorEntity:'Nermin Sefić',
    editor:'Nermin Sefić',
    authorshipConfirmed:false,
    commentApprovedByNermin:false,
    sourceRequired:true,
    automaticPublication:false,
    finalApproval:false,
    factCheckComplete:false,
    sourceReviewComplete:false,
    automationAssisted:true,
    processDisclosure:'Draft planning and structural assistance were automated; authorship, factual review and final editorial approval remain human-controlled.',
    title:'',
    slug:'',
    language:'en',
    category:'',
    summary:'',
    body:'',
    canonical:'',
    image:'',
    imageAlt:'',
    primarySource:'',
    supportingSources:[],
    dateCreated:new Date().toISOString(),
    dateReviewed:''
  };
}

export function buildDailyEditorialPlan(dateInput=new Date()){
  const date=typeof dateInput==='string'&&datePattern.test(dateInput)?dateInput:utcDate(dateInput);
  const deskSlots=[];
  for(const desk of EDITORIAL_DESKS){
    const count=deskDraftCount(date,desk.workerId);
    for(let index=1;index<=count;index+=1)deskSlots.push(deskSlot(date,desk,index));
  }
  const nerminSlots=Array.from({length:5},(_,index)=>nerminSlot(date,index+1));
  return{
    version:VERSION,
    status:'planned',
    date,
    timezone:PLAN_TIMEZONE,
    createdAt:new Date().toISOString(),
    project:'GNK DINAMO Ltd.',
    editorialBrand:'THE CODE Intelligence',
    connectedEntity:'GNK ASG d.o.o.',
    automaticDraftPreparation:true,
    automaticPublication:false,
    finalApprovalRequired:true,
    summary:{
      editorialProfiles:EDITORIAL_DESKS.length,
      deskDrafts:deskSlots.length,
      nerminOriginalOrCommentarySlots:nerminSlots.length,
      totalSlots:deskSlots.length+nerminSlots.length
    },
    slots:[...deskSlots,...nerminSlots]
  };
}

const planKey=date=>`the-code:editorial-plan:${date}`;
const latestKey='the-code:editorial-plan:latest';

async function readPlan(binding,date){
  if(!binding?.get)return null;
  const raw=await binding.get(planKey(date));
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}

async function writePlan(binding,plan){
  if(!binding?.put)throw new Error('editorial_kv_put_unavailable');
  const body=JSON.stringify(plan);
  await binding.put(planKey(plan.date),body);
  await binding.put(latestKey,body);
  return plan;
}

export async function runEditorialDraftPlanner(env,dateInput=new Date(),options={}){
  const binding=kvOf(env);
  if(!binding?.get||!binding?.put)return{ok:true,skipped:'editorial_kv_unavailable',version:VERSION};
  const date=typeof dateInput==='string'&&datePattern.test(dateInput)?dateInput:utcDate(dateInput);
  if(!options.force){
    const existing=await readPlan(binding,date);
    if(existing)return{ok:true,created:false,plan:existing,version:VERSION};
  }
  const plan=buildDailyEditorialPlan(date);
  await writePlan(binding,plan);
  return{ok:true,created:true,plan,version:VERSION};
}

export const isEditorialOperationsApi=path=>path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);

export async function handleEditorialOperationsApi(request,env){
  const path=pathOf(request),url=new URL(request.url),binding=kvOf(env);
  if(request.method==='GET'&&path===`${API_PREFIX}/config`){
    return json({ok:true,version:VERSION,publicationReadinessVersion:PUBLICATION_READINESS_VERSION,project:'GNK DINAMO Ltd.',editorialBrand:'THE CODE Intelligence',connectedEntity:'GNK ASG d.o.o.',profiles:EDITORIAL_DESKS,automaticPublication:false});
  }
  if(request.method==='GET'&&path===`${API_PREFIX}/plan`){
    const requested=clean(url.searchParams.get('date'))||utcDate();
    if(!datePattern.test(requested))return json({ok:false,error:'invalid_date'},400);
    const plan=await readPlan(binding,requested);
    return plan?json({ok:true,plan}):json({ok:false,error:'plan_not_found',date:requested},404);
  }
  if(request.method==='GET'&&path===`${API_PREFIX}/plan/latest`){
    if(!binding?.get)return json({ok:false,error:'editorial_kv_unavailable'},503);
    const raw=await binding.get(latestKey);
    if(!raw)return json({ok:false,error:'plan_not_found'},404);
    try{return json({ok:true,plan:JSON.parse(raw)})}catch{return json({ok:false,error:'plan_invalid'},500)}
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/plan/generate`){
    const body=await request.json().catch(()=>({}));
    const requested=clean(body.date)||utcDate();
    if(!datePattern.test(requested))return json({ok:false,error:'invalid_date'},400);
    return json(await runEditorialDraftPlanner(env,requested,{force:Boolean(body.force)}));
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/publication/readiness`){
    const body=await request.json().catch(()=>({}));
    const readiness=validatePublicationReadiness(body);
    return json({ok:readiness.ok,readiness,attribution:publicationAttribution(body)},readiness.ok?200:422);
  }
  return json({ok:false,error:'not_found'},404);
}

export const __test={utcDate,hash,kvOf,planKey,latestKey,readPlan,writePlan};
