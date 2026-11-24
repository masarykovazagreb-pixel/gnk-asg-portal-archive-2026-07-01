#!/usr/bin/env node
/**
 * HR NEWS — independent article-only fast-lane preflight.
 * Read-only, no secrets, network calls, publishing or Git mutations.
 * A 10-minute target is measured from editorial approval; never promises LIVE.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const safeDate=(input,label,now)=>{
  const time=Date.parse(input);
  if(typeof input!=='string'||!Number.isFinite(time)||time>now+60000)throw new Error(label+' must be a valid non-future timestamp');
  return time;
};
const isHttps=(s)=>{
  try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}
};
export function assessFastlane(item,{now=Date.now(),exists=()=>false}={}){
  const fail=(reason)=>{throw new Error('HR NEWS FAST LANE HOLD: '+reason)};
  if(!item||typeof item!=='object'||Array.isArray(item))fail('invalid submission');
  const slug=String(item.slug??'');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>110)fail('invalid slug');
  if(exists(slug))fail('article route already exists; immutable-first publishing only');
  for(const field of ['approvedForPublication','originalWork','editorialEvidenceReviewed','independentFactCheck','imageRightsVerified']){
    if(item[field]!==true)fail(field+' must be explicitly true');
  }
  if(item.imageOrigin!=='AKTUAL_ORIGINAL_SVG')fail('only internally generated original cover art is supported');
  if(typeof item.approvalActor!=='string'||item.approvalActor.trim().length<3)fail('identifiable editorial approver is required');
  const approvedAt=safeDate(item.approvedAt,'approvedAt',now);
  if(now-approvedAt>24*3600000)fail('approval older than 24 hours; renew editorial review');
  const publishedAt=safeDate(item.publishedAt,'publishedAt',now);
  if(publishedAt<approvedAt-60000)fail('publishedAt cannot predate approval');
  if(typeof item.title!=='string'||item.title.length<18||item.title.length>135)fail('title out of range');
  if(typeof item.description!=='string'||item.description.length<80||item.description.length>160)fail('description out of range');
  if(!Array.isArray(item.paragraphs)||item.paragraphs.length<4||item.paragraphs.some(p=>typeof p!=='string'||p.length<100)||item.paragraphs.join(' ').length<650)fail('original text below editorial threshold');
  if(!Array.isArray(item.hashtags)||item.hashtags.length>5||item.hashtags.some(s=>!/^#[\p{L}\p{N}_]+$/u.test(s)))fail('invalid hashtags');
  if(!Array.isArray(item.sources)||item.sources.length<2)fail('two independent sources required');
  const domains=new Set();
  for(const s of item.sources){
    if(!s||typeof s.name!=='string'||!s.name.trim()||!isHttps(s.url)||typeof s.factSupported!=='string'||s.factSupported.length<15)fail('source evidence incomplete');
    const checked=safeDate(s.checkedAt,'source.checkedAt',now);
    if(now-checked>72*3600000)fail('source check older than 72 hours');
    domains.add(new URL(s.url).hostname.toLowerCase());
  }
  if(domains.size<2)fail('independent domains required');
  const age=Math.max(0,now-approvedAt),deadline=approvedAt+10*60000;
  return {ok:true,publicationStatus:'READY_FOR_CONTROLLED_RELEASE_NOT_LIVE',slug,sourceDomains:domains.size,approvedAt:new Date(approvedAt).toISOString(),elapsedSinceApprovalSeconds:Math.floor(age/1000),targetSeconds:600,deadline:new Date(deadline).toISOString(),alreadyLate:now>deadline,route:'/news/clanci/'+slug+'/'};
}
export function verifyApprovedPath(requested,{cwd=process.cwd()}={}){
  const relative=String(requested||'').replaceAll('\\','/');
  if(!/^content\/hr-news\/approved\/[a-z0-9][a-z0-9-]*\.json$/.test(relative))throw new Error('Only reviewed files under content/hr-news/approved are permitted');
  const root=path.resolve(cwd),file=path.resolve(root,relative);
  const actual=fs.realpathSync(file),approved=fs.realpathSync(path.join(root,'content/hr-news/approved'));
  if(path.dirname(actual)!==approved)throw new Error('Approval file escapes approved directory');
  const stat=fs.statSync(actual);if(!stat.isFile()||stat.size>200000)throw new Error('Invalid file size/type');
  return actual;
}
const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
  const file=verifyApprovedPath(process.argv[2]);
  const item=JSON.parse(fs.readFileSync(file,'utf8'));
  const root=path.resolve(process.env.HR_NEWS_BUILD_ROOT||'apps/portal');
  const out=assessFastlane(item,{exists:(slug)=>fs.existsSync(path.join(root,'news/clanci',slug,'index.html'))});
  process.stdout.write(JSON.stringify(out)+'\n');
}
