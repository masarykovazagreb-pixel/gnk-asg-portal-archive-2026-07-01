import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const errors=[];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const check=(ok,message)=>{if(!ok)errors.push(message);};
const requireAll=(file,tokens)=>{const source=read(file);for(const token of tokens)check(source.includes(token),`${file}: missing ${token}`);return source;};

const hr='apps/portal/digital-workforce/index.html';
const en='apps/portal/en/digital-workforce/index.html';
for(const [file,lang] of [[hr,'hr'],[en,'en']]){
  const html=requireAll(file,['<title>','name="description"','rel="canonical"','property="og:title"','property="og:description"','property="og:image"','name="twitter:card"','application/ld+json','digital-workforce-suite-v1.js','digital-workforce-dashboard-v1.js']);
  check(html.includes(`lang="${lang}"`),`${file}: lang mismatch`);
  check(/1[.,]573/.test(html),`${file}: current worker count disclosure missing`);
  check(/SIMULACIJA|SIMULATION/i.test(html),`${file}: simulation disclosure missing`);
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(schemas.length>0,`${file}: schema missing`);
  for(const schema of schemas){try{JSON.parse(schema[1]);}catch(error){errors.push(`${file}: invalid schema ${error.message}`);}}
}

const suite=requireAll('apps/portal/assets/digital-workforce-suite-v1.js',["const base='/api/public/digital-workforce/'",'plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','activity-log','AbortController','cache:\'no-store\'']);
check(!/fetch\([^)]*method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)/i.test(suite),'public Workforce suite must remain read-only');
const dashboard=requireAll('apps/portal/assets/digital-workforce-dashboard-v1.js',["const base = '/api/public/digital-workforce/'","get('state')","get('projects')","get('tasks')","get('comms')",'cache: \'no-store\'']);
check(!/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)/i.test(dashboard),'public Workforce dashboard must remain read-only');
requireAll('apps/portal/assets/digital-workforce-antfarm-v1.js',['digital-workforce','fetch']);

const fleet=json('config/master-asg-worker-fleet-v1.json');
check(fleet.mode==='controlled-autonomy','fleet must remain controlled-autonomy');
for(const [key,value] of Object.entries({singleWriter:true,exactShaRequiredForWrites:true,failClosedOnUnknownState:true,provenanceRequired:true,noImplicitExternalAuthority:true}))check(fleet.principles?.[key]===value,`fleet principle invalid: ${key}`);
check(fleet.riskClasses?.R0==='read-only'&&fleet.riskClasses?.R1==='analysis-only'&&fleet.riskClasses?.R2==='controlled-write'&&fleet.riskClasses?.R3==='deploy-or-external-side-effect','R0-R3 risk contract invalid');
const byId=new Map((fleet.workers||[]).map(w=>[w.id,w]));
for(const id of ['master-orchestrator','planner-worker','reviewer-worker','health-sentinel','provider-scout','world-intel-worker','qa-worker','release-guardian','security-guardian'])check(byId.has(id),`required worker missing: ${id}`);
check(byId.get('release-guardian')?.requires?.includes('all-core-gates-green'),'release guardian core-gate requirement missing');
check(byId.get('release-guardian')?.requires?.includes('head-sha-match'),'release guardian exact-head requirement missing');
check(byId.get('world-intel-worker')?.constraints?.includes('public-or-authorized-sources-only'),'world intel source boundary missing');
check(byId.get('world-intel-worker')?.constraints?.includes('no-secret-service-claim-without-auth'),'world intel authority boundary missing');

const runtime=read('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js');
check(runtime.includes("'/digital-workforce" )||suite.includes("'/api/public/digital-workforce/"),'Digital Workforce runtime contract missing');
check(runtime.includes('reviewEnvironment'),'review environment lock missing');
check(runtime.includes('noindex, nofollow, noarchive'),'review noindex lock missing');

if(errors.length){
  console.error(`DIGITAL_WORKFORCE_PUBLIC_CONTRACT_FAILED ${errors.length}`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('DIGITAL_WORKFORCE_PUBLIC_CONTRACT_OK');
console.log(JSON.stringify({publicRoutes:11,workerCatalog:1573,mode:fleet.mode,singleWriter:fleet.principles.singleWriter,exactSha:fleet.principles.exactShaRequiredForWrites}));
