#!/usr/bin/env node
/* Ten operational HR News agents run as independent checking stages inside
 * the canonical writer. Deterministic agents are active only when invoked;
 * no external LLM is claimed and NONE can approve a story by itself. */
import fs from 'node:fs';
import crypto from 'node:crypto';

const path=process.env.HR_NEWS_FEED||'apps/portal/data/hr-news-feed-v1.json';
const queue=process.env.HR_NEWS_QUEUE_OUT||'artifacts/hr-news-editorial-queue-v1.json';
const out=process.env.HR_NEWS_AGENTS_OUT||'artifacts/hr-news-agent-activity-v1.json';
if(!fs.existsSync(path)){console.error('Source cache absent; no agent review.');process.exit(1);}
const input=JSON.parse(fs.readFileSync(path,'utf8')),items=input.items||[];
const pending=fs.existsSync(queue)?JSON.parse(fs.readFileSync(queue,'utf8')).pitches||[]:[];
const domain=s=>{try{return new URL(s).hostname.toLowerCase();}catch{return ''}};
const now=Date.now(),sourceHosts=new Set(items.map(x=>domain(x.url)).filter(Boolean));
const actions=[
 ['01','source-intake',()=>({scanned:items.length,sourceFeeds:input.sourceFeedsConfigured})],
 ['02','safe-link-validator',()=>({safe:items.filter(x=>{try{const u=new URL(x.url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false}}).length})],
 ['03','chronology-agent',()=>({under24h:items.filter(x=>now-Date.parse(x.publishedAt)<=86400000).length,under72h:items.filter(x=>now-Date.parse(x.publishedAt)<=72*3600000).length})],
 ['04','publisher-attribution',()=>({attributed:items.filter(x=>x.source&&x.publisherDomain).length})],
 ['05','duplicate-control',()=>({canonicalUnique:new Set(items.map(x=>x.url)).size})],
 ['06','regional-desk',()=>({publisherDomains:sourceHosts.size,verifiedStoryGeography:false})],
 ['07','cross-source-review',()=>({corroboratedClaims:0,explanation:'A title link alone never independently corroborates a factual claim'})],
 ['08','image-rights-guardian',()=>({thirdPartyImagesUsed:items.filter(x=>x.image).length,permissionGate:'original_or_documented_license_only'})],
 ['09','original-article-pitch-queue',()=>({pendingPitches:pending.length,published:0})],
 ['10','publication-release-guardian',()=>({eligibleForAutomaticOriginalArticlePublication:0,reason:'source review + human-editor-approval + safe imagery required'})]
];
const run=actions.map(([id,role,fn])=>({agent:'HR-NEWS-'+id,role,status:'executed',result:fn()}));
const bad=run.find(x=>x.result?.safe!==undefined&&x.result.safe!==items.length)||run.find(x=>x.result?.canonicalUnique!==undefined&&x.result.canonicalUnique!==items.length);
const report={version:1,runAt:new Date().toISOString(),mode:'ten_operational_review_processors_not_ten_live_llms',executedProcessors:run.length,inputExternalLinks:items.length,sourceSha256:crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex'),allSafe:!bad,publishedOriginalReports:0,agents:run};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({agentsExecuted:run.length,sourceLinkedItems:items.length,safe:!bad,pendingDraftAssignments:pending.length,approvedOriginalArticles:0}));
if(bad)process.exitCode=1;
