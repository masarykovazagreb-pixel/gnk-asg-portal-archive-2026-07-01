export const VERSION='GNK_ASG_DIGITAL_WORKFORCE_PUBLIC_READ_V7_20261004_IDEA_LAB_ALLOCATION';

const PREFIX='/api/public/digital-workforce/';
// Truthful compatibility layer is deliberately narrow. Operational views such as
// projects/tasks/activity-log/bulletins are owned by digital-workforce-suite-v1.js.
// Keeping them out of this layer prevents empty compatibility payloads from
// shadowing the existing Workforce Suite reports and bulletins.
const PUBLIC_VIEWS=new Set(['state','workers']);
const TOTAL_WORKER_PROFILES=1573;
const SUITE_PROJECT_IDS=Array.from({length:9},(_,i)=>`PRJ-${String(i+1).padStart(3,'0')}`);
const PROJECT_ASSIGNMENT_COUNTS=[212,173,204,161,182,156,190,145,150];
const projectForWorkerNumber=number=>{let remaining=number;for(let index=0;index<PROJECT_ASSIGNMENT_COUNTS.length;index++){remaining-=PROJECT_ASSIGNMENT_COUNTS[index];if(remaining<=0)return SUITE_PROJECT_IDS[index];}return SUITE_PROJECT_IDS.at(-1);};
const PROJECT_ASSIGNMENT_COVERAGE=SUITE_PROJECT_IDS.map((projectId,index)=>({projectId,modeledProfiles:PROJECT_ASSIGNMENT_COUNTS[index],semantics:'modeled assignment coverage, not live process count'}));
const SUPERVISOR_AGENT={id:'AGENT-PORTAL-SUPERVISOR-001',name:'GNK ASG Portal Supervisor',role:'Read-only orchestration, health, editorial buffer, SEO/meta/image and distribution control',workflow:'.github/workflows/workforce-supervisor-agent.yml',status:'configured',runtimeEvidence:'workflow-runs-and-production-health-only'};
const EDITORIAL_LEAD={id:'EDITOR-NERMIN-SEFIC-001',identityType:'human-editorial-lead',name:'Nermin Sefić',roleHr:'Ljudski urednički voditelj Digitalne radne snage',roleEn:'Human editorial lead for the Digital Workforce',personUrl:'https://gnk-asg.hr/nermin-sefic/',image:'https://gnk-asg.hr/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg',scope:['source-review','editorial-approval','author-attribution','corrections'],workerProfile:false,semantics:'human-editorial-governance-not-synthetic-worker'};
const MEDIA_ANALYSIS_DESKS=[['MEDIA-JUTARNJI','Jutarnji list','JutarnjiList','DWF-0001–DWF-0262'],['MEDIA-VECERNJI','Večernji list','VecernjiList','DWF-0263–DWF-0524'],['MEDIA-POSLOVNI','Poslovni dnevnik','PoslovniDnevnik','DWF-0525–DWF-0786'],['MEDIA-INDEX','Index','Index','DWF-0787–DWF-1048'],['MEDIA-LIDER','Lider','Lider','DWF-1049–DWF-1310'],['MEDIA-NOVOSTI','Novosti','Novosti','DWF-1311–DWF-1573']].map(([id,publisher,publisherReferenceTag,modeledWorkerCohort])=>({id,publisher,publisherReferenceTag,publisherTagEvidence:'publisher identity reference only; not a claimed hashtag from a specific source article',modeledWorkerCohort,scope:'source-linked editorial analysis intake on GNK ASG only',reviewState:'source-url-and-human-review-required',externalActions:'forbidden-without-account-owner-authorization',fullTextStorage:false}));
const CAMPAIGN_ORCHESTRATION={version:'GNK_ASG_ENTITY_VISIBILITY_ORCHESTRATION_V1_20261004',semantics:'declared editorial workflow model; Worker support is non-autonomous and not runtime evidence',humanApprovalRequired:true,leadId:EDITORIAL_LEAD.id,dailyQualityCadence:{requiredSignalsPerDay:10,semantics:'ten distinct quality and discoverability checks per daily brief; never ten duplicate posts or autonomous full publications',actions:['source-and-date-context','claim-boundary-review','author-and-editor-attribution','canonical-url','title-and-meta-description','structured-data','internal-linking','image-alt-and-credit','accessibility-and-contrast','distribution-readiness']},mediaAnalysis:{desks:MEDIA_ANALYSIS_DESKS,semantics:'external publishers are reviewed through source links only; no external comments, full-text copying or automatic publication'},ideaLab:{ideas:9,semantics:'modeled future-oriented proposals; human review required; not autonomous intelligence or a production decision'},lanes:[{id:'source-ledger',labelHr:'Izvori i kontekst',labelEn:'Sources and context',owner:'Nermin Sefić',mode:'human-review-required'},{id:'editorial-quality',labelHr:'Autorstvo i urednička kvaliteta',labelEn:'Authorship and editorial quality',owner:'Nermin Sefić',mode:'human-approval-required'},{id:'metadata-discovery',labelHr:'SEO, schema i discoverability',labelEn:'SEO, schema and discoverability',owner:'Digitalna radna snaga · modelirana podrška',mode:'read-only-model-support'},{id:'visual-accessibility',labelHr:'Slika i pristupačnost',labelEn:'Image and accessibility',owner:'Digitalna radna snaga · modelirana podrška',mode:'read-only-model-support'},{id:'canonical-distribution',labelHr:'Kanonska distribucija',labelEn:'Canonical distribution',owner:'Nermin Sefić + urednička provjera',mode:'human-release-gate'}]};
const ASSIGNMENT_DOMAINS=['Editorial writing','Editorial quality','SEO and metadata','Image SEO','AKTUAL visibility','Blog distribution','News freshness','Market data','Digital assets','Sitemaps and discovery','Runtime health','Evidence and reporting'];
const now=()=>new Date().toISOString();
const json=(payload,status=200)=>new Response(JSON.stringify(payload,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','x-gnk-workforce-data-semantics':'operational-model-not-runtime-evidence','x-gnk-workforce-public-read':VERSION}});
const meta=()=>({ok:true,version:VERSION,mode:'operational-model',simulationNotice:true,runtimeEvidence:false,generatedAt:now()});

function workerProfiles(url){
  const q=(url.searchParams.get('q')||'').trim().toLowerCase();
  const project=(url.searchParams.get('project')||'').trim();
  const items=[];
  for(let n=1;n<=TOTAL_WORKER_PROFILES;n++){
    const id='DWF-'+String(n).padStart(4,'0');
    const projectId=projectForWorkerNumber(n);
    const assignmentDomain=ASSIGNMENT_DOMAINS[(n-1)%ASSIGNMENT_DOMAINS.length];
    const item={id,name:`Digital Workforce Profile ${String(n).padStart(4,'0')}`,projectId,function:'Modeled workflow profile',status:'profile-only',runtimeEvidence:false,assignment:{status:'assigned-model-task',domain:assignmentDomain,supervisorAgentId:SUPERVISOR_AGENT.id,slot:`${projectId}-${String(((n-1)%108)+1).padStart(3,'0')}`}};
    if(project&&projectId!==project)continue;
    if(q&&!`${item.id} ${item.name} ${item.projectId} ${item.function}`.toLowerCase().includes(q))continue;
    items.push(item);
  }
  return {items,total:TOTAL_WORKER_PROFILES,returned:items.length,profileSemantics:'synthetic-directory-profile-not-live-process'};
}

function payload(view,url){
  const common=meta();
  if(view==='state')return {...common,editorialGovernance:{lead:EDITORIAL_LEAD},campaignOrchestration:CAMPAIGN_ORCHESTRATION,status:'model-ready',simDay:0,workers:TOTAL_WORKER_PROFILES,projects:SUITE_PROJECT_IDS.length,phase:'operational-model',runtimeHealthEndpoint:'/api/public/digital-workforce/health',supervisorAgent:SUPERVISOR_AGENT,assignmentCoverage:{profiles:TOTAL_WORKER_PROFILES,assigned:TOTAL_WORKER_PROFILES,unassigned:0,domains:ASSIGNMENT_DOMAINS.length,projects:PROJECT_ASSIGNMENT_COVERAGE,semantics:'modeled-assignments-not-1573-independent-runtime-processes'}};
  if(view==='workers')return {...common,editorialGovernance:{lead:EDITORIAL_LEAD},campaignOrchestration:CAMPAIGN_ORCHESTRATION,...workerProfiles(url)};
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
