#!/usr/bin/env node
/**
 * Read-only approval preflight for 1–20 ORIGINAL HR NEWS articles in one CI/deploy.
 * No network, no publication and no credential or approval bypass.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessFastlane,verifyApprovedPath} from './hr-news-fastlane-preflight-v1.mjs';

export function parseApprovedBatch(input) {
 if(typeof input!=='string')throw Error('Approved batch must be a string');
 const paths=input.split(',').map(s=>s.trim());
 if(paths.length<1||paths.length>20||paths.some(s=>!/^content\/hr-news\/approved\/[a-z0-9][a-z0-9-]*\.json$/.test(s)))throw Error('Only 1–20 safe approved filenames allowed');
 if(new Set(paths).size!==paths.length)throw Error('Duplicate approved file');
 return paths;
}
export function checkApprovedBatch(input,{cwd=process.cwd(),now=Date.now(),siteRoot='apps/portal'}={}){
 const paths=parseApprovedBatch(input),out=[],slugs=new Set();
 for(const requested of paths){
  const file=verifyApprovedPath(requested,{cwd});
  const item=JSON.parse(fs.readFileSync(file,'utf8'));
  const result=assessFastlane(item,{now,exists:(slug)=>fs.existsSync(path.resolve(cwd,siteRoot,'news/clanci',slug,'index.html'))});
  if(slugs.has(result.slug))throw Error('Duplicate article slug');
  slugs.add(result.slug);
  out.push({path:requested,slug:result.slug,approvedAt:result.approvedAt,sourceDomains:result.sourceDomains});
 }
 const earliestApprovedAt=out.map(x=>x.approvedAt).sort()[0];
 return {ok:true,publicationStatus:'BATCH_REVIEWED_NOT_LIVE',count:out.length,slugs:[...slugs],earliestApprovedAt,items:out};
}
const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
 const result=checkApprovedBatch(process.argv[2]);
 process.stdout.write(JSON.stringify(result)+'\n');
}
