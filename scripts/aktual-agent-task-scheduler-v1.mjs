#!/usr/bin/env node
// Read-only, deterministic 150-agent task scheduler. No paid AI, deploy, main writes or publish.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const registry=read('config/control-plane/master-asg-150-agent-registry-v1.json');
const report=read('artifacts/aktual-world-agent-factory/report.json');
const switches=read('ops/automation-kill-switches.json');
const max=Number(process.env.ASG_AGENT_TASK_BUDGET||150);
if(registry.total!==150||registry.agents.length!==150||report.agents?.length!==150||
   new Set(registry.agents.map(x=>x.id)).size!==150||switches.defaultMode!=='hold'||
   registry.authorizations.paidAPIs!==false||registry.authorizations.directMainWrites!==false||
   !Number.isInteger(max)||max<1||max>150)throw Error('Invalid registry/report/permissions or free-agent budget');
const statuses=new Map(report.agents.map(x=>[x.id,x]));
const ownership={
 'national-editorial':'AKTUAL MEDIA / National Desk',
 'regional-editorial':'AKTUAL MEDIA / Regional Desk',
 frontend:'Frontend Lead',backend:'Worker/Backend Lead',seo:'Search & Discoverability Lead',
 visual:'Art & Accessibility Lead',qa:'Testing Lead',distribution:'Distribution & Hosting Lead',
 security:'Security Lead'
};
const stages={
 'national-editorial':'SOURCE_EVIDENCE','regional-editorial':'SOURCE_EVIDENCE',
 frontend:'UI_AUDIT',backend:'WORKER_SYNTAX',seo:'SEO_AUDIT',
 visual:'VISUAL_RIGHTS_QA',qa:'TEST_QA',distribution:'DESTINATION_PREFLIGHT',security:'SECURITY_REVIEW'
};
const risk=x=>/needs-fix|missing-entrypoint|failed/.test(x)?'P1':
 /no-current|unavailable/.test(x)?'P2':'P3';
const taskFor=(a,index)=>{
 const observed=statuses.get(a.id);
 if(!observed)throw Error('Agent unobserved: '+a.id);
 const importance=risk(observed.status);
 return {id:'TASK-'+String(index+1).padStart(3,'0'),agentId:a.id,lane:a.lane,
  owner:ownership[a.lane],priority:importance,stage:stages[a.lane],
  assignment:a.assignment,objective:a.task,observedStatus:observed.status,
  evidence:observed.evidence,action:importance==='P1'?'investigate-and-prepare-safe-PR':importance==='P2'?'investigate-source-availability':'monitor-and-verify',
  dependsOn:[],
  completionCriteria:['Concrete artifact or reproducible test','Evidence linked to source/checkout','Independent quality check'],
  permissions:{read:true,propose:true,writeMain:false,writeProtectedPaths:false,deploy:false,send:false,
   publish:false,paidApiCalls:0},next:'QUEUED_FOR_REVIEW',verifiedPublicUrl:null};
};
let tasks=registry.agents.map(taskFor);
const byLane=Object.groupBy?Object.groupBy(tasks,t=>t.lane):null;
for(const t of tasks){
 if(t.lane==='distribution')t.dependsOn=['source-provenance','rights-and-editorial-approval','canonical-route-live-proof'];
 if(t.lane==='seo')t.dependsOn=['original-source-or-owned-page'];
 if(t.lane==='national-editorial'||t.lane==='regional-editorial')t.dependsOn=['corroborated-original-source','editorial-HOLD-review'];
 if(t.lane==='backend'||t.lane==='frontend')t.dependsOn=['independent-QA-pass','protected-release-approval'];
}
tasks.sort((a,b)=>a.priority.localeCompare(b.priority)||a.id.localeCompare(b.id));
const active=tasks.slice(0,max),deferred=tasks.slice(max);
const laneCounts=Object.fromEntries(Object.keys(ownership).map(l=>[l,tasks.filter(t=>t.lane===l).length]));
const output={version:'GNK_ASG_FREE_TASK_SCHEDULER_V1',mode:'READ_ONLY_RECOMMENDATIONS',
 source:'artifacts/aktual-world-agent-factory/report.json',generatedAt:report.generatedAt,
 freeBudget:{paidApiCalls:0,newCrons:0,monthlyActionsMinutesWorkingCeiling:1000,maximumTasksPerRun:max},
 decisions:{autoApproveMain:false,autoPublish:false,autoDeploy:false,reviewRequired:true},
 agentRoles:150,tasksAssigned:active.length,tasksDeferred:deferred.length,laneCounts,
 priorities:{P1:tasks.filter(x=>x.priority==='P1').length,P2:tasks.filter(x=>x.priority==='P2').length,
 P3:tasks.filter(x=>x.priority==='P3').length},active,deferred};
const dir=path.join(root,'artifacts/aktual-agent-task-scheduler');
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'queue.json'),JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(dir,'summary.md'),
 '# GNK ASG — 150-agent free work allocation\n\n'+
 '- Registry roles: 150; priority tasks assigned: '+active.length+'; deferred: '+deferred.length+'\n'+
 '- P1 fix proposals: '+output.priorities.P1+'; P2 source issues: '+output.priorities.P2+'; P3 verification: '+output.priorities.P3+'\n'+
 '- Every task has one owner, observable evidence, dependencies and a specific deliverable.\n'+
 '- Tasks are queued recommendations, not proof of independent execution or merged repairs.\n'+
 '- Paid model calls: 0; external publication: 0; direct main/deploy: 0.\n');
console.log(JSON.stringify({agents:150,assigned:active.length,deferred:deferred.length,priorities:output.priorities}));
