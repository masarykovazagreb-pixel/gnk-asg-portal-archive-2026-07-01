import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFastlane,verifyApprovedPath} from '../scripts/hr-news-fastlane-preflight-v1.mjs';
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

test('Fast lane is narrowly enabled; other portal publication remains disabled',()=>{
 const policy=JSON.parse(fs.readFileSync('ops/automation-kill-switches.json','utf8'));
 assert.equal(policy.channels?.hrNewsFastlanePublish?.enabled,true);
 assert.equal(policy.channels?.portalPublish?.enabled,false);
 const auto=fs.readFileSync('.github/workflows/hr-news-approved-autoqueue-v1.yml','utf8');
 const release=fs.readFileSync('.github/workflows/hr-news-10m-approved-fastlane-v1.yml','utf8');
 assert.match(auto,/push:\s*\n\s*branches: \[main\]/);
 assert.match(auto,/content\/hr-news\/approved\/\*\.json/);
 assert.doesNotMatch(auto,/^\s+schedule:\s*$/m);
 assert.match(auto,/--diff-filter=A/);
 assert.match(auto,/hr-news-fastlane-preflight-v1\.mjs/);
 assert.match(release,/channels\?\.hrNewsFastlanePublish\?\.enabled/);
 assert.match(release,/All gates \(portal\)/);
 assert.match(release,/Site Functional Readiness/);
 assert.match(release,/approved_sha="\$SHA"/);
 assert.doesNotMatch(release,/vercel|--force\b/i);
});
