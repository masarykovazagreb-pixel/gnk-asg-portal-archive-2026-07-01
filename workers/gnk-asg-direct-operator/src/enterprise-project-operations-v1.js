export const VERSION='GNK_ENTERPRISE_PROJECT_OPERATIONS_V2_20260705_WORKFORCE_LIFECYCLE';
export const API_PREFIX='/api/enterprise-projects';

const PROJECTS_KEY='enterprise-projects:registry:v1';
const ASSIGNMENTS_KEY='enterprise-projects:assignments:v1';
const REPORTS_KEY='enterprise-projects:reports:v1';
const EVENTS_KEY='enterprise-projects:events:v1';
const META_KEY='enterprise-projects:runtime-meta:v2';
const WORKER_COUNT=1537;
const WORK_CYCLE_MINUTES=60;
const ROSTERS=[
  '/data/project-roster-sport-education.json',
  '/data/project-roster-technology-intelligence.json',
  '/data/project-roster-industry.json'
];
const DEPARTMENTS=['MCO','MED','PUB','SEO','REG','LEG','CMP','FIN','TRE','ACC','INV','AIR','DAT','ANA','TRN','CRM','CUS','SEC','INF','CLD','DEV','DPL','RCV','QAA','COD','REGN','ADM'];
const TIMEZONES=['America/Denver','Europe/Zagreb','Europe/Berlin','Europe/London','America/Toronto','Asia/Kolkata','Australia/Sydney','Europe/Madrid','Europe/Paris','Europe/Amsterdam','Europe/Rome','Europe/Lisbon','Europe/Warsaw','Asia/Tokyo','America/Sao_Paulo','America/Argentina/Buenos_Aires','Europe/Ljubljana','Europe/Belgrade'];

const now=()=>new Date().toISOString();
const clean=value=>String(value??'').trim();
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-gnk-enterprise-projects':VERSION
}});

async function read(kv,key,fallback){
  if(!kv?.get)return fallback;
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}
async function write(kv,key,value){
  if(!kv?.put)throw new Error('kv_unavailable');
  await kv.put(key,JSON.stringify(value));
}
function token(request){
  const auth=request.headers.get('authorization')||'';
  return request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||auth.replace(/^Bearer\s+/i,'');
}
function authorised(request,env){
  const expected=clean(env?.OPERATOR_TOKEN||env?.GNK_ASG_OPERATOR_TOKEN||env?.ADMIN_TOKEN||env?.GNK_ASG_ADMIN_TOKEN);
  return Boolean(expected&&clean(token(request))===expected);
}
async function assetJson(env,path){
  if(!env?.ASSETS?.fetch)return null;
  try{
    const response=await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
    return response.ok?await response.json():null;
  }catch{return null;}
}
async function loadRoster(env){
  const rows=[];
  for(const path of ROSTERS){
    const data=await assetJson(env,path);
    for(const item of data?.projects||[])rows.push(item);
  }
  return rows;
}
function normalizeProject(item,index=0){
  return{
    id:clean(item.id),
    name:clean(item.name),
    stage:clean(item.stage||'intake'),
    publicLabel:clean(item.label||item.publicLabel||'PLANNED'),
    workstreams:Array.isArray(item.workstreams)&&item.workstreams.length?item.workstreams.slice(0,20):['programme','research','operations','quality'],
    firstBacklog:Array.isArray(item.firstBacklog)?item.firstBacklog.slice(0,20):[],
    status:'active-work-queue',
    maturity:Number(item.maturity??Math.min(6,index%3)),
    territory:clean(item.territory||'international'),
    parentProjectId:clean(item.parentProjectId)||null,
    createdAt:clean(item.createdAt||now()),
    updatedAt:now(),
    automaticPublication:false,
    approvalRequired:true
  };
}
function workerId(index){
  const dept=DEPARTMENTS[index%DEPARTMENTS.length];
  const slot=`GNK${String((index%43)+1).padStart(2,'0')}`;
  return`${dept}-${slot}-${String(index+1).padStart(4,'0')}`;
}
function profileStatus(index){
  if(index<661)return'active';
  if(index<880)return'busy';
  if(index<1099)return'scheduled';
  if(index<1318)return'idle';
  return'approval-required';
}
function initialWorkState(status){
  if(status==='active'||status==='busy')return'in-progress';
  if(status==='scheduled')return'scheduled';
  if(status==='approval-required')return'review-required';
  return'standby';
}
function taskFor(project,index,type,status='assigned'){
  const source=project.firstBacklog.length?project.firstBacklog:project.workstreams;
  const title=source[index%source.length]||'prepare next evidence-based action';
  return{
    id:`TASK-${project.id}-${type}-${String(index+1).padStart(4,'0')}`,
    projectId:project.id,
    title,
    objective:`Advance ${project.name} through a documented work package.`,
    status,
    priority:index%11===0?'high':'normal',
    approvalGate:'review-required',
    evidenceRequired:true
  };
}
function checkpointAt(value,minutes=WORK_CYCLE_MINUTES){
  return new Date(new Date(value).getTime()+minutes*60000).toISOString();
}
function buildAssignments(projects,at=now()){
  if(!projects.length)return[];
  return Array.from({length:WORKER_COUNT},(_,index)=>{
    const primary=projects[index%projects.length];
    const support=projects[(index*7+3)%projects.length];
    const staticStatus=profileStatus(index);
    const workState=initialWorkState(staticStatus);
    const started=['in-progress','review-required'].includes(workState)?at:null;
    return{
      schemaVersion:2,
      workerId:workerId(index),
      profileType:'operational-workflow-profile',
      profileStatus:staticStatus,
      operationallyEngaged:true,
      workState,
      timezone:TIMEZONES[(index*7)%TIMEZONES.length],
      primaryProjectId:primary.id,
      supportProjectId:support.id,
      primaryTask:taskFor(primary,index,'P',workState==='in-progress'?'in-progress':workState),
      supportTask:taskFor(support,index,'S','queued'),
      assignedAt:at,
      startedAt:started,
      lastHeartbeatAt:at,
      nextCheckpointAt:checkpointAt(at),
      progressPct:workState==='in-progress'?5+(index%8):0,
      currentAction:workState==='in-progress'?(primary.firstBacklog[index%Math.max(1,primary.firstBacklog.length)]||primary.workstreams[index%primary.workstreams.length]||'prepare next evidence-based action'):workState,
      auditRequired:true,
      peerReviewRequired:true,
      auditRef:`workforce:${workerId(index)}`,
      auditTrail:[{type:'assigned',state:workState,at}]
    };
  });
}
function cycleSlot(date=new Date()){
  const ms=WORK_CYCLE_MINUTES*60000;
  return new Date(Math.floor(date.getTime()/ms)*ms).toISOString();
}
function localHour(timezone,date=new Date()){
  try{
    const part=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',hour12:false}).formatToParts(date).find(item=>item.type==='hour');
    return Number(part?.value||0);
  }catch{return 0;}
}
function pushAudit(item,event){
  const trail=Array.isArray(item.auditTrail)?item.auditTrail:[];
  return[...trail.slice(-3),event];
}
function advanceAssignment(item,index,at){
  const date=new Date(at);
  const hour=localHour(item.timezone,date);
  const localShift=hour>=7&&hour<20;
  let workState=item.workState;
  let progress=Number(item.progressPct||0);
  let startedAt=item.startedAt||null;
  let primaryTask={...item.primaryTask};
  let currentAction=item.currentAction;
  let auditTrail=item.auditTrail;
  let changed=false;

  if(workState==='review-required'){
    return{...item,lastHeartbeatAt:at,nextCheckpointAt:checkpointAt(at)};
  }
  if(workState==='scheduled'&&localShift){
    workState='in-progress';
    primaryTask.status='in-progress';
    startedAt=startedAt||at;
    progress=Math.max(progress,3+(index%5));
    currentAction=primaryTask.title;
    auditTrail=pushAudit(item,{type:'started',state:workState,at});
    changed=true;
  }else if(workState==='standby'&&localShift&&index%3===new Date(at).getUTCHours()%3){
    workState='in-progress';
    primaryTask.status='in-progress';
    startedAt=startedAt||at;
    progress=Math.max(progress,2+(index%4));
    currentAction=primaryTask.title;
    auditTrail=pushAudit(item,{type:'activated-from-standby',state:workState,at});
    changed=true;
  }else if(workState==='in-progress'){
    progress=Math.min(100,progress+4+(index%6));
    primaryTask.status=progress>=85?'review-required':'in-progress';
    currentAction=progress>=85?'evidence package awaiting peer and executive review':primaryTask.title;
    if(progress>=85){
      workState='review-required';
      auditTrail=pushAudit(item,{type:'checkpoint-submitted',state:workState,progressPct:progress,at});
      changed=true;
    }
  }

  return{
    ...item,
    workState,
    primaryTask,
    startedAt,
    lastHeartbeatAt:at,
    nextCheckpointAt:checkpointAt(at),
    progressPct:progress,
    currentAction,
    auditTrail:changed?auditTrail:item.auditTrail
  };
}
function summarizeAssignments(assignments){
  const summary={
    total:assignments.length,
    operationallyEngaged:0,
    inProgress:0,
    scheduled:0,
    standby:0,
    reviewRequired:0,
    queuedSupportTasks:0
  };
  for(const item of assignments){
    if(item.operationallyEngaged)summary.operationallyEngaged++;
    if(item.workState==='in-progress')summary.inProgress++;
    else if(item.workState==='scheduled')summary.scheduled++;
    else if(item.workState==='standby')summary.standby++;
    else if(item.workState==='review-required')summary.reviewRequired++;
    if(item.supportTask?.status==='queued')summary.queuedSupportTasks++;
  }
  return summary;
}
async function addEvent(kv,type,data={}){
  const items=await read(kv,EVENTS_KEY,[]);
  items.unshift({id:`EV-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,type,at:now(),...data});
  await write(kv,EVENTS_KEY,items.slice(0,1000));
}
export async function ensureEnterpriseProjectBootstrap(env){
  const kv=kvOf(env);
  if(!kv?.get||!kv?.put)return{ok:true,skipped:'kv_unavailable',version:VERSION};
  let projects=await read(kv,PROJECTS_KEY,[]);
  if(!projects.length){
    const roster=await loadRoster(env);
    projects=roster.filter(item=>clean(item.id)&&clean(item.name)).map(normalizeProject);
    if(!projects.length)return{ok:false,error:'project_roster_unavailable',version:VERSION};
    await write(kv,PROJECTS_KEY,projects);
    await addEvent(kv,'projects_bootstrapped',{projectCount:projects.length});
  }
  let assignments=await read(kv,ASSIGNMENTS_KEY,[]);
  if(assignments.length!==WORKER_COUNT||assignments.some(item=>item.schemaVersion!==2)){
    const assignedAt=now();
    assignments=buildAssignments(projects,assignedAt);
    await write(kv,ASSIGNMENTS_KEY,assignments);
    await write(kv,META_KEY,{schemaVersion:2,lastCycle:null,lastBootstrapAt:assignedAt});
    await addEvent(kv,'workers_assigned_and_engaged',{
      workerCount:assignments.length,
      taskCount:assignments.length*2,
      summary:summarizeAssignments(assignments)
    });
  }
  return{
    ok:true,
    version:VERSION,
    projectCount:projects.length,
    workerCount:assignments.length,
    workSummary:summarizeAssignments(assignments)
  };
}
function zagrebSlot(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const period=Number(values.hour)<14?'morning':'evening';
  return`${values.year}-${values.month}-${values.day}:${period}`;
}
export async function runEnterpriseProjectCycle(env,force=false,date=new Date()){
  const kv=kvOf(env);
  const boot=await ensureEnterpriseProjectBootstrap(env);
  if(!boot.ok||!kv?.get||!kv?.put)return boot;

  const projects=await read(kv,PROJECTS_KEY,[]);
  let assignments=await read(kv,ASSIGNMENTS_KEY,[]);
  const reports=await read(kv,REPORTS_KEY,[]);
  const meta=await read(kv,META_KEY,{});
  const workSlot=cycleSlot(date);
  let advanced=false;

  if(force||meta.lastCycle!==workSlot){
    assignments=assignments.map((item,index)=>advanceAssignment(item,index,workSlot));
    await write(kv,ASSIGNMENTS_KEY,assignments);
    await write(kv,META_KEY,{...meta,schemaVersion:2,lastCycle:workSlot,lastHeartbeatAt:workSlot});
    const summary=summarizeAssignments(assignments);
    await addEvent(kv,'workforce_cycle_completed',{slot:workSlot,summary});
    advanced=true;
  }

  const slot=zagrebSlot(date);
  if(!force&&reports.some(item=>item.slot===slot)){
    return{...boot,ok:true,advanced,skipped:'report_exists',slot,workSlot,workSummary:summarizeAssignments(assignments)};
  }

  const projectSummary=projects.map(project=>({
    projectId:project.id,
    name:project.name,
    stage:project.stage,
    publicLabel:project.publicLabel,
    assignedWorkers:assignments.filter(item=>item.primaryProjectId===project.id||item.supportProjectId===project.id).length,
    inProgress:assignments.filter(item=>(item.primaryProjectId===project.id||item.supportProjectId===project.id)&&item.workState==='in-progress').length,
    reviewRequired:assignments.filter(item=>(item.primaryProjectId===project.id||item.supportProjectId===project.id)&&item.workState==='review-required').length,
    readyTasks:assignments.reduce((count,item)=>count+(item.primaryProjectId===project.id?1:0)+(item.supportProjectId===project.id?1:0),0)
  }));
  const report={
    id:`REPORT-${slot.replace(/[^0-9A-Za-z]/g,'-')}`,
    slot,
    workSlot,
    generatedAt:now(),
    projectCount:projects.length,
    activeWorkerCount:assignments.length,
    workSummary:summarizeAssignments(assignments),
    projects:projectSummary,
    approvalQueue:assignments.filter(item=>item.workState==='review-required').length,
    automaticPublication:false
  };
  reports.unshift(report);
  await write(kv,REPORTS_KEY,reports.slice(0,120));
  await addEvent(kv,'progress_report_generated',{slot,projectCount:projects.length,workerCount:assignments.length,workSummary:report.workSummary});
  return{ok:true,version:VERSION,advanced,report};
}
export const isEnterpriseProjectApi=path=>path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);
export async function handleEnterpriseProjectApi(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  const kv=kvOf(env);
  const boot=await ensureEnterpriseProjectBootstrap(env);
  if(!boot.ok)return json(boot,503);

  if(request.method==='GET'&&path===`${API_PREFIX}/status`){
    const projects=await read(kv,PROJECTS_KEY,[]);
    const assignments=await read(kv,ASSIGNMENTS_KEY,[]);
    const reports=await read(kv,REPORTS_KEY,[]);
    const meta=await read(kv,META_KEY,{});
    return json({
      ok:true,
      version:VERSION,
      projectCount:projects.length,
      assignedWorkerCount:assignments.length,
      assignedTaskCount:assignments.length*2,
      workSummary:summarizeAssignments(assignments),
      lastCycle:meta.lastCycle||null,
      latestReport:reports[0]||null,
      automaticExpansion:true,
      automaticPublication:false
    });
  }
  if(request.method==='GET'&&path===`${API_PREFIX}/projects`)return json({ok:true,items:await read(kv,PROJECTS_KEY,[])});
  if(request.method==='GET'&&path===`${API_PREFIX}/reports`)return json({ok:true,items:(await read(kv,REPORTS_KEY,[])).slice(0,20)});

  if(request.method==='GET'&&path===`${API_PREFIX}/assignments`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    const url=new URL(request.url);
    const offset=Math.max(0,Number(url.searchParams.get('offset')||0));
    const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit')||100)));
    const items=await read(kv,ASSIGNMENTS_KEY,[]);
    return json({ok:true,total:items.length,offset,limit,workSummary:summarizeAssignments(items),items:items.slice(offset,offset+limit)});
  }
  if(request.method==='GET'&&path===`${API_PREFIX}/events`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    return json({ok:true,items:(await read(kv,EVENTS_KEY,[])).slice(0,200)});
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/bootstrap`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    return json(await ensureEnterpriseProjectBootstrap(env));
  }
  if(request.method==='POST'&&(path===`${API_PREFIX}/reports/run`||path===`${API_PREFIX}/cycle/run`)){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    return json(await runEnterpriseProjectCycle(env,true));
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/assignment/decision`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    const body=await request.json().catch(()=>({}));
    const id=clean(body.workerId);
    const decision=clean(body.decision).toLowerCase();
    if(!id||!['approve','requeue','hold'].includes(decision))return json({ok:false,error:'invalid_assignment_decision'},400);
    const assignments=await read(kv,ASSIGNMENTS_KEY,[]);
    const index=assignments.findIndex(item=>item.workerId===id);
    if(index<0)return json({ok:false,error:'worker_not_found'},404);
    const item=assignments[index];
    const at=now();
    const workState=decision==='hold'?'review-required':'in-progress';
    const progressPct=decision==='approve'?0:Number(item.progressPct||0);
    assignments[index]={
      ...item,
      workState,
      progressPct,
      primaryTask:{...item.primaryTask,status:workState},
      startedAt:workState==='in-progress'?at:item.startedAt,
      lastHeartbeatAt:at,
      nextCheckpointAt:checkpointAt(at),
      reviewDecision:{decision,at,reason:clean(body.reason)},
      auditTrail:pushAudit(item,{type:'assignment-decision',decision,state:workState,at})
    };
    await write(kv,ASSIGNMENTS_KEY,assignments);
    await addEvent(kv,'assignment_decision',{workerId:id,decision,state:workState});
    return json({ok:true,item:assignments[index],workSummary:summarizeAssignments(assignments)});
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/project`){
    if(!authorised(request,env))return json({ok:false,error:'unauthorised'},401);
    const body=await request.json().catch(()=>({}));
    const name=clean(body.name);
    const id=clean(body.id||name.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,''));
    if(!id||!name)return json({ok:false,error:'missing_id_or_name'},400);
    const projects=await read(kv,PROJECTS_KEY,[]);
    if(projects.some(item=>item.id===id))return json({ok:false,error:'project_exists'},409);
    const record=normalizeProject({...body,id,name,stage:body.stage||'intake',label:body.publicLabel||'PLANNED',parentProjectId:body.parentProjectId},projects.length);
    projects.push(record);
    const assignedAt=now();
    const assignments=buildAssignments(projects,assignedAt);
    await write(kv,PROJECTS_KEY,projects);
    await write(kv,ASSIGNMENTS_KEY,assignments);
    await write(kv,META_KEY,{schemaVersion:2,lastCycle:null,lastBootstrapAt:assignedAt});
    await addEvent(kv,'project_created_and_workforce_rebalanced',{projectId:id,parentProjectId:record.parentProjectId,workerCount:WORKER_COUNT});
    return json({ok:true,item:record,workerAssignmentsRebalanced:WORKER_COUNT,workSummary:summarizeAssignments(assignments)},201);
  }
  return json({ok:false,error:'not_found'},404);
}
export const __test={
  normalizeProject,
  buildAssignments,
  zagrebSlot,
  workerId,
  profileStatus,
  summarizeAssignments,
  advanceAssignment,
  cycleSlot
};
