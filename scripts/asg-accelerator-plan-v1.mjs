#!/usr/bin/env node
// MASTER ASG acceleration planner: read-only, no network or writes.
// Usage: node scripts/asg-accelerator-plan-v1.mjs snapshot.json
// Snapshots must contain independently verified evidence; never fabricate flags.
import fs from 'node:fs';
import assert from 'node:assert/strict';
export function plan(s){
 const jobs=[],blocked=[],seen=new Set();
 const add=(id,lane,priority,action,why)=>{if(!seen.has(id)){seen.add(id);jobs.push({id,lane,priority,action,why})}};
 const block=(id,why)=>blocked.push({id,why});
 const sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x);
 const cms=s.cms||{},budget=s.ciBudget||{};
 const budgetOK=Number.isFinite(budget.remainingMinutes)&&Number.isFinite(budget.reserveMinutes)&&budget.remainingMinutes>budget.reserveMinutes&&budget.reserveMinutes>=0;
 const writerReady=cms.productionVerified===true&&cms.authVerified===true&&cms.singleWriterVerified===true;
 const articles=Array.isArray(s.articles)?s.articles:[];
 for(const a of articles){
  if(!a||typeof a.id!=="string"||!a.id||seen.has("article:"+a.id))continue;
  if(a.publicVerified===true)continue;
  if(a.state==="published-unverified"){add("article:"+a.id,"PUBLICATION",0,"verify-public-url","Publication acknowledgement is not public evidence");continue}
  const ready=a.originalVerified===true&&a.sourcesVerified===true&&a.imageRightsVerified===true&&a.editorialApproved===true&&a.metadataReady===true&&a.dedupeVerified===true;
  if(!ready){add("article:"+a.id,"EDITORIAL",2,"complete-editorial-checks","Finish missing checks, never auto-assert approval");continue}
  if(writerReady)add("article:"+a.id,"PUBLICATION",0,"submit-existing-authenticated-writer","Ready article; no code deploy required");
  else block("article:"+a.id,"Production CMS/auth/single-writer not verified; retain ready article");
 }
 for(const p of Array.isArray(s.releases)?s.releases:[]){
  if(!p||!Number.isInteger(p.pr)||!sha(p.headSha)){block("release:unknown","Missing exact PR/head identity");continue}
  const id="release:"+p.pr+":"+p.headSha;
  if(p.merged===true){if(p.publicVerified!==true)add(id,"RELEASE",1,"verify-existing-production-deployment","Check merged SHA, deployment record and public HTTP");continue}
  if(!sha(s.mainSha)||p.baseSha!==s.mainSha||p.mergeable!==true){add(id,"RELEASE",1,"reconcile-with-current-main","Preserve changes; no force push or merge on stale base");continue}
  if(!Array.isArray(p.requiredChecks)||!p.requiredChecks.length||p.requiredChecks.some(c=>!c||typeof c.name!=="string"||c.headSha!==p.headSha||c.baseSha!==s.mainSha)){block(id,"Required check set or tested head/base identity unknown");continue}
  const failed=p.requiredChecks.filter(c=>c.status==="failure");
  if(failed.length){for(const c of failed)add("failure:"+String(c.rootCauseId||p.pr+":"+c.name),"RELEASE",1,"diagnose-and-fix-root-cause",c.name);continue}
  if(p.requiredChecks.some(c=>["queued","pending","in_progress"].includes(c.status))){block(id,"CI running; do not retrigger");continue}
  if(p.requiredChecks.every(c=>c.status==="success")){
   if(p.releaseFenceOpen===true&&p.exactShaDeployAuthorized===true)add(id,"RELEASE",1,"controlled-merge-then-exact-sha-deploy","Recheck head/base and gate immediately before action");
   else block(id,"Release fence or deployment authority not verified");
  }else if(budgetOK)add(id,"RELEASE",1,"inspect-missing-checks-before-targeted-run","No blind rerun; respect budget and existing workflows");
  else block(id,"CI budget unverified or reserve reached");
 }
 for(const e of Array.isArray(s.editions)?s.editions:[]){
  if(!e||typeof e.slug!=="string"||!e.slug)continue;
  if(e.sourceHealth!=="verified-fresh")add("source:"+e.slug,"DISTRIBUTION",3,"verify-or-repair-source","Prioritize actual source availability, not nominal count");
  if(e.seoHealth!=="verified")add("seo:"+e.slug,"SEO",3,"audit-edition-metadata-and-sitemap","Keep canonical/noindex and language semantics");
 }
 if(s.wholeDomainSEO!=="verified")add("seo:whole-domain","SEO",2,"run-read-only-domain-audit","Fix authoritative generators in batches");
 if(s.searchConsole!=="verified")block("search-console","No verified property access; continue independent SEO");
 jobs.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
 return {version:"ASG_ACCELERATOR_V1",mode:"ADVISORY_PLAN_ONLY",jobs,blocked,counts:{readyActions:jobs.length,blockers:blocked.length,publishedByPlanner:0},policy:{noMail:true,noVercel:true,oneWriter:true,noBlindRerun:true,ciBudgetOK:budgetOK}};
}
const head='a'.repeat(40),base='b'.repeat(40);
if(process.argv.includes('--self-test')){
const a={"id":"story-1","originalVerified":true,"sourcesVerified":true,"imageRightsVerified":true,"editorialApproved":true,"metadataReady":true,"dedupeVerified":true};
const r={...{"pr":512,"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","baseSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","mergeable":true,"releaseFenceOpen":true,"exactShaDeployAuthorized":true,"requiredChecks":[{"name":"release","status":"success","headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","baseSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]},headSha:head,baseSha:base};
const s={...{"mainSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","cms":{"productionVerified":true,"authVerified":true,"singleWriterVerified":true},"articles":[{"id":"story-1","originalVerified":true,"sourcesVerified":true,"imageRightsVerified":true,"editorialApproved":true,"metadataReady":true,"dedupeVerified":true}],"releases":[{"pr":512,"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","baseSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","mergeable":true,"releaseFenceOpen":true,"exactShaDeployAuthorized":true,"requiredChecks":[{"name":"release","status":"success","headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","baseSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]}],"editions":[{"slug":"hrvatska","sourceHealth":"verified-fresh","seoHealth":"verified"}],"wholeDomainSEO":"verified","searchConsole":"verified","ciBudget":{"remainingMinutes":80,"reserveMinutes":20}},mainSha:base,articles:[a],releases:[r]};
assert.equal(plan(s).jobs[0].action,'submit-existing-authenticated-writer');
assert.ok(plan({...s,cms:{}}).blocked.some(x=>x.id==='article:story-1'));
assert.ok(plan({...s,articles:[{...a,sourcesVerified:false}]}).jobs.some(x=>x.action==='complete-editorial-checks'));
assert.ok(plan({...s,releases:[{...r,requiredChecks:[{...r.requiredChecks[0],status:'in_progress'}]}]}).blocked.some(x=>x.why.includes('CI running')));
assert.ok(plan({...s,mainSha:head}).jobs.some(x=>x.action==='reconcile-with-current-main'));
assert.ok(plan({...s,releases:[{...r,requiredChecks:[]}]}).blocked.some(x=>x.id.startsWith('release:')));
assert.equal(plan(s).counts.publishedByPlanner,0);
console.log('ASG accelerator: 7 assertions passed');
}else if(process.argv[2]){console.log(JSON.stringify(plan(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}else{console.error('Provide a verified snapshot JSON or --self-test');process.exitCode=2;}
