#!/usr/bin/env node
// MASTER ASG Agent Network V2 — bounded, evidence-first autonomous orchestration.
// No direct main writes, external posts, deployments, destructive actions or invented approvals.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'artifacts/master-asg-agent-network');
const NOW=new Date(process.env.ASG_NOW || Date.now());
function read(p) { return JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8')); }
function save(name,data) { fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n'); }
function truncate(s,n=220){return String(s||'').replace(/\s+/g,' ').slice(0,n);}
function sha() { try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{return null;} }
const config=read('config/control-plane/master-asg-agent-network-v2.json');
const registry=read('config/control-plane/workforce-bot-registry-v1.json');
const taskboard=read('config/control-plane/workforce-bot-taskboard-v1.json');
const decisions=read(config.approval.recordPath);
const ownership=read('config/control-plane/bot-ownership-v1.json');
if(config.canonicalRepository!=='masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01') throw Error('Wrong canonical repository: fail closed');
if(config.operating.neverPushMain!==true || config.operating.prFirst!==true || config.operating.doNotAutoMerge!==true) throw Error('Missing autonomy safety controls');
if(config.approval.minutes!==30 || config.approval.clockStartsAt!=='confirmed-notifiedAt-with-delivery-evidence') throw Error('Invalid 30-minute approval rules');
if(!ownership.policy?.prFirst || ownership.policy?.supervisorReadOnly!==true) throw Error('Ownership policy not read-only / PR-first');
if(!Array.isArray(decisions.decisions)) throw Error('Invalid decision ledger');

const workerDirs=fs.readdirSync('workers',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
const registered=new Map((registry.bots||[]).map(b=>[b.worker,b]));
const bots=workerDirs.map(name=>{
  const b=registered.get(name);
  return {id:b?.botId||'BOT-DISCOVERED-'+name.toUpperCase().replace(/[^A-Z0-9]+/g,'-'),
    worker:name,domain:b?.domain||'NEEDS_GOVERNANCE',mode:b?.mode||'observe-and-propose',
    mission:b?.mission||'New Worker found; assign governance before writing.',
    generatedIdentity:!b,authorizedToMutate:false};
});
const missing=workerDirs.filter(w=>!registered.has(w));
const orphan=(registry.bots||[]).filter(b=>!workerDirs.includes(b.worker)).map(b=>b.worker);
const roles=[
  {id:'AGENT-SUPERVISOR',lane:'supervisor',job:'Allocate P0/P1 tasks and verify proof of completion'},
  {id:'AGENT-BACKEND',lane:'backend',job:'Check Worker/API contracts, propose tested PRs'},
  {id:'AGENT-FRONTEND',lane:'frontend',job:'Check live HR/EN navigation, speed and mobile presentation'},
  {id:'AGENT-SEO',lane:'seo',job:'Check canonical, meta, hreflang, structured data, alt and image sitemaps'},
  {id:'AGENT-RESEARCH-EXA',lane:'research',job:'Research only public authoritative sources with Exa'},
  {id:'AGENT-NEWSROOM',lane:'reporter',job:'Write evidenced draft candidates, never publish directly'},
  {id:'AGENT-EDITOR-AI',lane:'editor',job:'Review attribution, source quality, rights and AI disclosure; cannot impersonate human editor'},
  {id:'AGENT-QA',lane:'quality',job:'Run gates and differentiate code from live evidence'},
  {id:'AGENT-RELEASE',lane:'release',job:'Prepare exact-SHA deploy handoff; never deploy or override fences'}
];
const rank={'P0':0,'P1':1,'P2':2,'P3':3};
const openTasks=(taskboard.tasks||[]).filter(t=>!['done','closed','cancelled'].includes(t.status)).sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9));
const assignments=bots.map(b=>({...b,tasks:openTasks.filter(t=>t.ownerBot===b.id).map(t=>({id:t.id,priority:t.priority,title:t.title,status:t.status,acceptance:t.acceptance||[]}))}));
const uncovered=openTasks.filter(t=>!bots.some(b=>b.id===t.ownerBot)).map(t=>t.id);
const processDecisions=(entries)=>{
  return entries.map(d=>{
    const event={id:d.id||null,risk:d.risk||'unknown',status:'pending',action:truncate(d.action),reason:null};
    if(d.rejectedAt || d.status==='rejected' || d.decision==='rejected'){event.status='rejected';return event;}
    if(d.status==='cancelled' || d.status==='revoked'){event.status='cancelled';return event;}
    if(d.risk!=='low'){event.reason='explicit-human-approval-required';return event;}
    // Defense in depth: risk labels alone cannot downgrade protected public/external actions.
    if(/\b(deploy|publish|publication|payment|pay|wire|transfer|secrets?|credentials?|permissions?|dns|smtp|email|mail|legal|lawsuit|lawsuits|financial|finance|external|production|live release|objav|placan|plaćan|uplata|isplata|tajne|zapork|sud|tužb|financ|produkcij|dozvol|pristup)\b/i.test(String(d.action||''))){event.reason='protected-action-requires-explicit-review';return event;}
    if(d.status!=='proposed'){event.reason='not-active-proposal';return event;}
    const stamp=Date.parse(d.notifiedAt),delivered=Date.parse(d.deliveryEvidence?.deliveryConfirmedAt);
    if(!d.notifiedAt||!d.deliveryEvidence?.messageId||!Number.isFinite(stamp)||!Number.isFinite(delivered)){
      event.reason='no-verifiable-delivery';return event;
    }
    if(delivered<stamp || stamp>NOW.getTime() || delivered>NOW.getTime()){event.reason='inconsistent-delivery-times';return event;}
    const elapsed=(NOW.getTime()-delivered)/60000;
    if(elapsed<config.approval.minutes){event.reason='waiting-30-minutes';event.minutesRemaining=Math.ceil(config.approval.minutes-elapsed);return event;}
    event.status='eligible-for-safe-internal-action';
    event.reason='30m-no-rejection-after-confirmed-delivery';
    event.autoAuthorizedFor=['internal analysis','non-production PR proposal','routine non-destructive maintenance'];
    event.forbids=config.approval.silenceNeverApproves;
    return event;
  });
};
async function readGitHub(endpoint){
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
  if(!token)return {ok:false,reason:'github-token-not-configured',data:null};
  try{
    const res=await fetch('https://api.github.com/repos/'+config.canonicalRepository+endpoint,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'MASTER-ASG-Agent-Network/2.0'},
      signal:AbortSignal.timeout(10000)
    });
    if(!res.ok)return {ok:false,reason:'github-http-'+res.status,data:null};
    return {ok:true,data:await res.json()};
  }catch(e){return {ok:false,reason:truncate(e.message),data:null};}
}
async function publicProbe(url){
  if(!url.startsWith('https://gnk-asg.hr/'))return {url,status:'invalid-target'};
  try{
    const res=await fetch(url,{redirect:'follow',headers:{'user-agent':'GNK-ASG-Agent-Network/2.0'},signal:AbortSignal.timeout(10000)});
    return {url,status:res.ok?'http-verified':'http-failed',httpStatus:res.status,finalUrl:res.url,verifiedAt:NOW.toISOString()};
  }catch(e){return {url,status:'unverified',reason:truncate(e.message),verifiedAt:NOW.toISOString()};}
}
async function researchExa(){
  if(process.env.ENABLE_PUBLIC_RESEARCH!=='1')return {status:'disabled-by-default',sources:[]};
  if(!process.env.EXA_API_KEY)return {status:'missing-exa-api-key',sources:[]};
  const topic=config.research.topics[0]; // public, predefined queries only
  try{
    const res=await fetch('https://api.exa.ai/search',{
      method:'POST',headers:{'x-api-key':process.env.EXA_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({query:topic.query,type:'auto',numResults:5,contents:{highlights:true}}),
      signal:AbortSignal.timeout(15000)
    });
    if(!res.ok)return {status:'exa-http-'+res.status,sources:[]};
    const data=await res.json();
    return {status:'sources-retrieved-not-fact-checked',topic:topic.id,sources:(data.results||[]).slice(0,5)
      .filter(s=>/^https:\/\//.test(s.url||'')).map(s=>({title:truncate(s.title,160),url:s.url,publishedDate:s.publishedDate||null,highlights:(s.highlights||[]).slice(0,3).map(v=>truncate(v,360))}))};
  }catch(e){return {status:'exa-error',reason:truncate(e.message),sources:[]};}
}
async function createDraft(research){
  if(process.env.ENABLE_AI_WRITING!=='1')return {status:'disabled-by-default'};
  if(!process.env.OPENAI_API_KEY)return {status:'missing-openai-key'};
  if(research.sources?.length<2)return {status:'blocked-insufficient-sources'};
  const sourceText=research.sources.map((s,i)=>String(i+1)+'. '+s.title+'\n'+s.url+'\n'+s.highlights.join(' | ')).join('\n\n');
  const prompt='Create a Croatian-language analytical news draft using ONLY the public excerpts below. '
    +'Do not invent quotes, figures, dates, corporate claims, or source details. Clearly separate known facts, analysis, and unanswered questions. '
    +'Cite URLs next to factual claims, not fake author names. If insufficient evidence, say so. This is a DRAFT requiring substantive human editorial review. '
    +'Do not claim to be Nermin Sefic or imply human approval.\n\nPUBLIC EXA SOURCES:\n'+sourceText;
  try{
    const res=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_MODEL||config.aiWriting.defaultModel,
        input:[{role:'system',content:'You are a cautious editorial drafting assistant. Output Croatian text with sources and no fabricated facts.'},{role:'user',content:prompt}],
        max_output_tokens:1700}),signal:AbortSignal.timeout(45000)
    });
    if(!res.ok)return {status:'model-http-'+res.status};
    const data=await res.json();
    const text=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n').trim();
    if(!text)return {status:'empty-draft'};
    const header='# NEOBJAVLJENI AI NACRT — potrebno uredničko odobrenje\n\n'
      +'> Sadržaj je generiran ili izmijenjen uz pomoć umjetne inteligencije. Nisu potvrđeni autorstvo, urednička provjera ni javna objava.\n\n';
    save('editorial-draft.md',header+text+'\n\n## Korišteni izvori za provjeru\n'+research.sources.map(s=>'- '+s.url).join('\n')+'\n');
    return {status:'draft-created-held-for-substantive-human-review',file:'editorial-draft.md',sourceCount:research.sources.length};
  }catch(e){return {status:'model-error',reason:truncate(e.message)};}
}
function localRoleChecks(){
  const out=[];
  const add=(role,name,state,detail)=>out.push({role,check:name,state,detail});
  // Backend agents do real syntax verification without starting or deploying Workers.
  const mainWorker='workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js';
  if(fs.existsSync(mainWorker)){
    try{execFileSync(process.execPath,['--check',mainWorker],{cwd:ROOT,timeout:12000,stdio:'pipe'});
      add('backend','active-worker-syntax','pass',mainWorker);
    }catch(e){add('backend','active-worker-syntax','fail',truncate(e.stderr||e.message));}
  }else add('backend','active-worker-syntax','missing','active Worker entry not found; no deployment claim');
  // Frontend agent inspects actual source HTML; it does not claim a visual browser check.
  for(const relative of ['apps/portal/index.html','apps/portal/en/index.html']){
    try{
      const html=fs.readFileSync(relative,'utf8');
      const checks={title:/<title>[^<]+<\/title>/i.test(html),
        description:/<meta[^>]+name=["']description["']/i.test(html),
        canonical:/<link[^>]+rel=["']canonical["']/i.test(html),
        viewport:/<meta[^>]+name=["']viewport["']/i.test(html)};
      add('frontend','static-head-'+relative,Object.values(checks).every(Boolean)?'pass':'warn',checks);
    }catch(e){add('frontend','static-head-'+relative,'missing',truncate(e.message));}
  }
  for(const p of ['apps/portal/sitemap.xml','apps/portal/editorial-sitemap.xml','apps/portal/image-sitemap.xml']){
    try{
      const xml=fs.readFileSync(p,'utf8');
      const locs=[...xml.matchAll(/<loc>/g)].length;
      add('seo','sitemap-'+p,locs?'pass':'warn',{locs,bytes:xml.length});
    }catch(e){add('seo','sitemap-'+p,'missing',truncate(e.message));}
  }
  try{
    const manifest=read('apps/portal/data/editorial-plan/manifest.json');
    const packages=manifest.packages||[];
    const counts={total:packages.length,held:packages.filter(x=>/hold|review|draft/i.test(x.status||'')).length};
    add('editor','editorial-queue-truth','observed',counts);
  }catch(e){add('editor','editorial-queue-truth','missing',truncate(e.message));}
  return out;
}
const roleChecks=localRoleChecks();
const [issues,runs,branch,live,research]=await Promise.all([
  readGitHub('/issues?state=open&per_page=30'),
  readGitHub('/actions/runs?per_page=30'),
  readGitHub('/branches/main'),
  process.env.ASG_SKIP_LIVE==='1' ? Promise.resolve(config.publicEndpoints.map(url=>({url,status:'skipped-test-mode'}))) : Promise.all(config.publicEndpoints.map(publicProbe)),
  researchExa()
]);
const draft=await createDraft(research);
const issueItems=issues.ok?(issues.data||[]).filter(x=>!x.pull_request).map(x=>({number:x.number,title:truncate(x.title),url:x.html_url})).slice(0,25):[];
const workflowItems=runs.ok?(runs.data.workflow_runs||[]).map(x=>({name:x.name,status:x.status,conclusion:x.conclusion,sha:x.head_sha,url:x.html_url,createdAt:x.created_at})).slice(0,20):[];
const failures=workflowItems.filter(x=>x.conclusion==='failure'||x.conclusion==='timed_out');
const liveProblems=live.filter(x=>x.status!=='http-verified');
const workPlan=[
  {lane:'backend',agent:'AGENT-BACKEND',action:'Investigate failing CI and missing Actions jobs before changing code',priority:failures.length?'P0':'P1',evidence:failures.slice(0,5)},
  {lane:'frontend',agent:'AGENT-FRONTEND',action:'Check public route availability then propose accessibility and HR/EN visual improvements in PR',priority:liveProblems.length?'P0':'P2',evidence:liveProblems},
  {lane:'seo',agent:'AGENT-SEO',action:'Run existing SEO/meta matrix and social-meta guard; propose targeted non-spam corrections only',priority:'P1'},
  {lane:'research',agent:'AGENT-RESEARCH-EXA',action:'Collect independently verifiable public sources for future AKTUAL drafts',priority:'P2',result:research.status},
  {lane:'reporter',agent:'AGENT-NEWSROOM',action:'Prepare source-backed article draft without auto-publishing',priority:'P2',result:draft.status},
  {lane:'editor',agent:'AGENT-EDITOR-AI',action:'Fact-check candidate and request recorded substantive human editorial review',priority:'P1',result:'AI editor is not a human approval'},
  {lane:'release',agent:'AGENT-RELEASE',action:'Compare writer SHA to last verified production SHA; require exact-SHA deploy gate',priority:'P1',result:'no deploy attempted'}
];
const outcome={
  version:config.version,generatedAt:NOW.toISOString(),canonicalRepo:config.canonicalRepository,
  execution:'inspect-and-prepare-only-no-mutations',writerSha:branch.ok?branch.data.commit?.sha||null:null,
  checkedOutSha:sha(),productionSha:null,productionShaVerified:false,
  autonomousWorkerAgents:bots.length,workerDirectories:workerDirs.length,governanceMissingWorkers:missing,
  orphanRegistryWorkers:orphan,roleAgents:roles,assignmentStatus:missing.length||orphan.length||uncovered.length?'needs-governance':'complete',
  assignments,taskboard:{open:openTasks.length,uncovered,prioritized:openTasks.slice(0,20).map(t=>({id:t.id,priority:t.priority,status:t.status,owner:t.ownerBot,title:t.title}))},
  decisions:processDecisions(decisions.decisions),roleChecks,liveProbes:live,
  github:{issuesAvailable:issues.ok,issuesReason:issues.ok?null:issues.reason,
    runsAvailable:runs.ok,runsReason:runs.ok?null:runs.reason,recentIssues:issueItems,recentRuns:workflowItems,
    failedRuns:failures},
  publicResearch:research,editorialDraft:draft,workPlan,
  boundaries:{noExternalPublication:true,noAutomaticHumanApproval:true,noMainWrites:true,noProductionDeploy:true,mergeIsNotLive:true}
};
save('report.json',outcome);
const summary=['# MASTER ASG — Agent Network V2','',
  '- Canonical repo: '+config.canonicalRepository,
  '- Worker-agent profiles: '+bots.length+' / '+workerDirs.length,
  '- Open taskboard tasks: '+openTasks.length,
  '- GitHub runs read: '+(runs.ok?'yes':'NO ('+runs.reason+')'),
  '- Public routes HTTP-verified: '+live.filter(x=>x.status==='http-verified').length+'/'+live.length,
  '- Static role checks executed: '+roleChecks.length+' (not live visual proof)',
  '- Exa research: '+research.status,
  '- AI newsroom: '+draft.status,
  '- Decisions eligible after verified 30-minute notice: '+outcome.decisions.filter(d=>d.status==='eligible-for-safe-internal-action').length,
  '- Writer SHA: '+(outcome.writerSha||'unknown')+'; PRODUCTION SHA: NOT VERIFIED',
  '- Changes to main, deploys, external publishing: NONE',
  '','## Highest priority tasks',
  ...outcome.taskboard.prioritized.slice(0,10).map(t=>'- '+t.priority+' / '+t.id+' / '+t.title),
  '','## Public HTTP findings',
  ...live.map(x=>'- '+x.url+' → '+x.status+(x.httpStatus?' ('+x.httpStatus+')':'')),
  '','Human editorial approvals and sensitive changes are never inferred from silence.'];
save('summary.md',summary.join('\n')+'\n');
console.log(JSON.stringify({agents:bots.length,tasks:openTasks.length,
  githubRuns:runs.ok,liveVerified:live.filter(x=>x.status==='http-verified').length,
  exa:research.status,draft:draft.status,decisionCount:outcome.decisions.length,
  report:'artifacts/master-asg-agent-network/report.json'},null,2));
