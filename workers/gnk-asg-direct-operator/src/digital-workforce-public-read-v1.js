export const VERSION='GNK_ASG_DIGITAL_WORKFORCE_PUBLIC_READ_V2_20260813';

const PREFIX='/api/public/digital-workforce/';
// Truthful compatibility layer is deliberately narrow. Operational views such as
// projects/tasks/activity-log/bulletins are owned by digital-workforce-suite-v1.js.
// Keeping them out of this layer prevents empty compatibility payloads from
// shadowing the existing Workforce Suite reports and bulletins.
const PUBLIC_VIEWS=new Set(['state','workers']);
const TOTAL_WORKER_PROFILES=1573;
const now=()=>new Date().toISOString();
const json=(payload,status=200)=>new Response(JSON.stringify(payload,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','x-gnk-workforce-data-semantics':'operational-model-not-runtime-evidence','x-gnk-workforce-public-read':VERSION}});
const meta=()=>({ok:true,version:VERSION,mode:'operational-model',simulationNotice:true,runtimeEvidence:false,generatedAt:now()});

const PROJECTS=[
  {id:'DWF-PORTAL',name:'Portal, Admin & Backend',team:384,phase:'review',lead:'Digital Workforce operating model',gate:'exact-SHA CI + deploy + smoke',progress:96},
  {id:'DWF-CONTENT',name:'Editorial, HR/EN & SEO',team:402,phase:'progress',lead:'Digital Workforce operating model',gate:'manual approval where required',progress:82},
  {id:'DWF-DISTRIBUTION',name:'Blogger / Dev.to / Tumblr distribution',team:265,phase:'progress',lead:'Single-writer distribution model',gate:'remote publish parity + dedupe',progress:78},
  {id:'DWF-NEWS',name:'Aktual Media / News lifecycle',team:224,phase:'review',lead:'News lifecycle model',gate:'source verification + lifecycle checks',progress:91},
  {id:'DWF-OPS',name:'Runtime, sync & monitoring',team:298,phase:'review',lead:'Operations model',gate:'live runtime health distinct from model state',progress:88}
];

const PLAN=[
  {block:'P0',focus:'Exact-SHA release, production deploy and live smoke'},
  {block:'P0',focus:'Digital Workforce public API parity and truthful runtime-health separation'},
  {block:'P1',focus:'Single-writer mirror reconciliation and external publish parity'},
  {block:'P1',focus:'Editorial buffer, HR/EN, SEO/entity/image/indexation and approval gates'},
  {block:'P1',focus:'Scheduler ownership, dedupe/idempotency, synchronization and monitoring'}
];

const RISKS=[
  {projectId:'DWF-OPS',title:'Model state must not be presented as live worker runtime evidence',owner:'Runtime health gate',status:'watch'},
  {projectId:'DWF-DISTRIBUTION',title:'Remote mirror state can diverge from local dedupe state',owner:'Single-writer reconciliation',status:'pending'},
  {projectId:'DWF-CONTENT',title:'Manual-approval-required content cannot be auto-approved',owner:'Editorial approval gate',status:'active'}
];

const OPINIONS=[
  {projectId:'DWF-OPS',lead:'Runtime truth rule',text:'A green code contract proves the contract, not continuous production reachability.'},
  {projectId:'DWF-DISTRIBUTION',lead:'Idempotency rule',text:'Remote duplicate responses must reconcile state instead of creating infinite retries.'}
];

const DEPENDENCIES=[
  {from:'DWF-PORTAL',to:'DWF-OPS',note:'Production smoke depends on an exact-SHA deploy.',status:'pending'},
  {from:'DWF-CONTENT',to:'DWF-DISTRIBUTION',note:'Mirror publication follows the canonical primary publication and approval gate.',status:'active'},
  {from:'DWF-NEWS',to:'DWF-CONTENT',note:'News publication requires verified source and lifecycle eligibility.',status:'active'}
];

const TASKS=[
  {title:'Complete required exact-head CI',projectId:'DWF-PORTAL',worker:'Release gate',status:'progress',priority:'high',dueDay:0},
  {title:'Deploy exact current main and run live smoke',projectId:'DWF-PORTAL',worker:'Deployment gate',status:'todo',priority:'high',dueDay:0},
  {title:'Reconcile mirror remote/local state',projectId:'DWF-DISTRIBUTION',worker:'Single writer',status:'progress',priority:'high',dueDay:0},
  {title:'Validate public Workforce API parity',projectId:'DWF-OPS',worker:'Runtime health',status:'progress',priority:'high',dueDay:0},
  {title:'Complete review-ready editorial buffer',projectId:'DWF-CONTENT',worker:'Editorial pipeline',status:'progress',priority:'medium',dueDay:1}
];

function workerProfiles(url){
  const q=(url.searchParams.get('q')||'').trim().toLowerCase();
  const project=(url.searchParams.get('project')||'').trim();
  const projectIds=PROJECTS.map(x=>x.id);
  const items=[];
  for(let n=1;n<=TOTAL_WORKER_PROFILES;n++){
    const id='DWF-'+String(n).padStart(4,'0');
    const projectId=projectIds[(n-1)%projectIds.length];
    const item={id,name:`Digital Workforce Profile ${String(n).padStart(4,'0')}`,projectId,function:'Modeled workflow profile',status:'profile-only',runtimeEvidence:false};
    if(project&&projectId!==project)continue;
    if(q&&!`${item.id} ${item.name} ${item.projectId} ${item.function}`.toLowerCase().includes(q))continue;
    items.push(item);
  }
  return {items,total:TOTAL_WORKER_PROFILES,returned:items.length,profileSemantics:'synthetic-directory-profile-not-live-process'};
}

function payload(view,url){
  const common=meta();
  if(view==='state')return {...common,status:'model-ready',simDay:0,workers:TOTAL_WORKER_PROFILES,projects:PROJECTS.length,phase:'operational-model',runtimeHealthEndpoint:'/api/public/digital-workforce/health'};
  if(view==='plan')return {...common,items:PLAN};
  if(view==='projects')return {...common,items:PROJECTS};
  if(view==='risks')return {...common,items:RISKS};
  if(view==='opinions')return {...common,items:OPINIONS};
  if(view==='dependencies')return {...common,items:DEPENDENCIES};
  if(view==='tasks')return {...common,items:TASKS};
  if(view==='credits')return {...common,items:[],note:'No live or simulated financial balances are exposed by this public compatibility layer.'};
  if(view==='newsroom')return {...common,items:[],note:'Newsroom publication data remains owned by the canonical editorial/news APIs.'};
  if(view==='workers')return {...common,...workerProfiles(url)};
  if(view==='activity-log')return {...common,items:[],note:'Live activity telemetry is not fabricated when no public runtime event source is connected.'};
  if(view==='bulletins')return {...common,items:[],note:'Only explicitly published bulletins belong in this public feed.'};
  return null;
}

export function handleDigitalWorkforcePublicRead(request){
  if(request.method!=='GET')return null;
  const url=new URL(request.url);
  if(!url.pathname.startsWith(PREFIX))return null;
  const view=url.pathname.slice(PREFIX.length).replace(/\/+$/,'');
  if(!PUBLIC_VIEWS.has(view))return null;
  return json(payload(view,url));
}
