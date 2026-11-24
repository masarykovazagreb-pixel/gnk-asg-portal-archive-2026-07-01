import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFastlane,verifyApprovedPath} from '../scripts/hr-news-fastlane-preflight-v1.mjs';
import {parseApprovedBatch,checkApprovedBatch} from '../scripts/hr-news-fastlane-batch-v1.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const now=Date.parse('2026-11-23T18:00:00Z');
function valid(){
 const paragraph='Urednička analiza predstavlja izvornu interpretaciju službeno objavljenih činjenica, odvojeno označuje izvore i omogućuje čitatelju samostalnu provjeru javnih tvrdnji. ';
 return {
  slug:'test-originalnog-clanka',approvedForPublication:true,originalWork:true,
  editorialEvidenceReviewed:true,independentFactCheck:true,imageRightsVerified:true,
  imageOrigin:'AKTUAL_ORIGINAL_SVG',approvalActor:'editor-reviewer',
  approvedAt:new Date(now-20000).toISOString(),publishedAt:new Date(now-10000).toISOString(),
  title:'Kako sigurno objaviti originalni novinarski tekst',
  description:'Urednički proces obuhvaća provjeru izvora, prava na sadržaj i potvrdu javne dostupnosti objavljenog članka prije potvrde statusa LIVE.',
  paragraphs:Array.from({length:5},()=>paragraph),hashtags:['#AktualMedia'],
  sources:[
   {name:'Izvor A',url:'https://example.com/a',checkedAt:new Date(now-100000).toISOString(),factSupported:'Dokumentirana činjenica iz izvora A'},
   {name:'Izvor B',url:'https://example.org/b',checkedAt:new Date(now-100000).toISOString(),factSupported:'Dokumentirana činjenica iz izvora B'}
  ]
 };
}
test('Approved original reaches READY but never LIVE',()=>{
 const result=assessFastlane(valid(),{now});
 assert.equal(result.ok,true);
 assert.equal(result.alreadyLate,false);
 assert.match(result.publicationStatus,/NOT_LIVE/);
 assert.equal(result.targetSeconds,600);
});
test('Unreviewed, rights-unverified, or reused URLs fail closed',()=>{
 for(const field of ['approvedForPublication','independentFactCheck','imageRightsVerified','editorialEvidenceReviewed']){
  const item=valid();item[field]=false;
  assert.throws(()=>assessFastlane(item,{now}),/HOLD/);
 }
 assert.throws(()=>assessFastlane(valid(),{now,exists:()=>true}),/already exists/);
});
test('Stale sources, fabricated future timestamps and poor meta are blocked',()=>{
 const item=valid();item.sources[0].checkedAt=new Date(now-75*3600000).toISOString();
 assert.throws(()=>assessFastlane(item,{now}),/72 hours/);
 const future=valid();future.publishedAt=new Date(now+180000).toISOString();
 assert.throws(()=>assessFastlane(future,{now}),/non-future/);
 const meta=valid();meta.description='too short';
 assert.throws(()=>assessFastlane(meta,{now}),/description/);
});
test('Deadline is tracked; missed 10-minute target is never a fictitious success',()=>{
 const item=valid();item.approvedAt=new Date(now-720000).toISOString();
 item.publishedAt=new Date(now-710000).toISOString();
 const result=assessFastlane(item,{now});
 assert.equal(result.alreadyLate,true);
 assert.equal(result.publicationStatus,'READY_FOR_CONTROLLED_RELEASE_NOT_LIVE');
});
test('Approved path rejects traversal, unapproved submissions and symlinks',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hr-news-fastlane-'));
 try{
  const dir=path.join(root,'content/hr-news/approved');fs.mkdirSync(dir,{recursive:true});
  const approved=path.join(dir,'sample.json');fs.writeFileSync(approved,'{}');
  assert.equal(verifyApprovedPath('content/hr-news/approved/sample.json',{cwd:root}),fs.realpathSync(approved));
  assert.throws(()=>verifyApprovedPath('content/hr-news/drafts/sample.json',{cwd:root}));
  assert.throws(()=>verifyApprovedPath('content/hr-news/approved/../sample.json',{cwd:root}));
  const external=path.join(root,'external.json');fs.writeFileSync(external,'{}');
  fs.symlinkSync(external,path.join(dir,'linked.json'));
  assert.throws(()=>verifyApprovedPath('content/hr-news/approved/linked.json',{cwd:root}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Fast lane delegates main mutations to the existing canonical content queue writer',()=>{
 const policy=JSON.parse(fs.readFileSync('ops/automation-kill-switches.json','utf8'));
 assert.equal(policy.channels?.hrNewsFastlanePublish?.enabled,true);
 assert.equal(policy.channels?.portalPublish?.enabled,false);
 const auto=fs.readFileSync('.github/workflows/hr-news-approved-autoqueue-v1.yml','utf8');
 const intake=fs.readFileSync('.github/workflows/hr-news-10m-approved-fastlane-v1.yml','utf8');
 const writer=fs.readFileSync('.github/workflows/content-queue-publish.yml','utf8');
 const fullGate=fs.readFileSync('.github/workflows/all-gates-v1.yml','utf8');
 const readiness=fs.readFileSync('.github/workflows/site-functional-readiness.yml','utf8');
 assert.match(auto,/push:\s*\n\s*branches: \[main\]/);
 assert.match(auto,/content\/hr-news\/approved\/\*\.json/);
 assert.doesNotMatch(auto,/^\s+schedule:\s*$/m);
 assert.match(auto,/--diff-filter=A/);
 assert.match(auto,/hr-news-fastlane-batch-v1\.mjs/);
 assert.match(intake,/gh workflow run content-queue-publish\.yml/);
 assert.match(auto,/\-f notify_search_engines=true/,'Autoqueue uses an accepted notification input');
 assert.match(intake,/notify_search_engines:\s*\n\s*description:/,'Intake must declare the autoqueue notification input');
 assert.match(intake,/NOTIFY: \$\{\{ inputs\.notify_search_engines \}\}/,'Intake forwards the requested notification policy');
 assert.match(intake,/\-f notify_search_engines="\$NOTIFY"/,'Canonical publisher receives notification policy');
 assert.match(intake,/channels\?\.hrNewsFastlanePublish\?\.enabled/);
 assert.doesNotMatch(intake,/git\s+push[^\n]*HEAD:main/);
 assert.doesNotMatch(intake,/contents:\s*write/);
 assert.match(writer,/publish-reviewed-hr-news:/);
 assert.match(writer,/gh workflow run all-gates-v1\.yml/);
 assert.match(writer,/gh workflow run site-functional-readiness\.yml/);
 assert.match(writer,/for workflow in all-gates-v1\.yml site-functional-readiness\.yml/);
 assert.match(writer,/hr-news-fastlane-batch-v1\.mjs/);
 assert.match(writer,/approved_sha="\$SHA"/);
 assert.match(fullGate,/workflow_dispatch:/);
 assert.match(readiness,/workflow_dispatch:/);
 assert.doesNotMatch(intake+writer,/vercel|--force\b/i);
});

test('Independent exact-SHA verification is read-only, outside main mutation concurrency',()=>{
 const intake=fs.readFileSync('.github/workflows/hr-news-10m-approved-fastlane-v1.yml','utf8');
 const canonical=fs.readFileSync('.github/workflows/content-queue-publish.yml','utf8');
 assert.match(canonical,/^concurrency:\s*\n\s*group: gnk-asg-main-mutation/m);
 assert.match(intake,/\n  verify-public-article:\n/);
 assert.doesNotMatch(intake,/^concurrency:\s*$/m);
 assert.match(canonical,/verify_approved_sha="\$SHA"/);
 assert.match(intake,/x-gnk-deploy-revision: \$SHA/);
 assert.match(intake,/VERIFIED_LIVE/);
 assert.match(intake,/tenMinuteGoalAchieved/);
});

test('Approve 1–20 articles as one atomic batch; reject duplicates and missing signoff',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hr-news-batch-'));
 try{
  const dir=path.join(root,'content/hr-news/approved');fs.mkdirSync(dir,{recursive:true});
  const a=valid(),b=valid();b.slug='drugi-izvorni-clanak';
  fs.writeFileSync(path.join(dir,'prvi.json'),JSON.stringify(a));
  fs.writeFileSync(path.join(dir,'drugi.json'),JSON.stringify(b));
  const both='content/hr-news/approved/prvi.json,content/hr-news/approved/drugi.json';
  const output=checkApprovedBatch(both,{cwd:root,now});
  assert.equal(output.count,2);
  assert.deepEqual(output.slugs,['test-originalnog-clanka','drugi-izvorni-clanak']);
  assert.equal(output.publicationStatus,'BATCH_REVIEWED_NOT_LIVE');
  assert.equal(parseApprovedBatch(both).length,2);
  assert.throws(()=>parseApprovedBatch('content/hr-news/approved/prvi.json,content/hr-news/approved/prvi.json'),/Duplicate/);
  assert.throws(()=>parseApprovedBatch('content/hr-news/drafts/prvi.json'),/Only/);
  assert.throws(()=>parseApprovedBatch(Array(21).fill('content/hr-news/approved/one.json').join(',')),/1–20/);
  b.independentFactCheck=false;fs.writeFileSync(path.join(dir,'drugi.json'),JSON.stringify(b));
  assert.throws(()=>checkApprovedBatch(both,{cwd:root,now}),/HOLD/);
 } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
