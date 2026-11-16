#!/usr/bin/env node
/**
 * Read-only end-to-end verification of the 201-country directory, not publishing.
 * Exact static manifest is the source of truth. No fabricated "LIVE" result.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ORIGIN = process.env.AKTUAL_WORLD_ORIGIN || 'https://gnk-asg.hr';
const VERIFY_ALL = process.env.AKTUAL_WORLD_VERIFY_ALL !== 'false';
const CONCURRENCY = 12;
const raw=readFileSync('apps/portal/world/index.html','utf8');
const relative=[...raw.matchAll(/class="tile" data-key="[^"]+" href="(\/world\/[^"]+\/)"/g)].map(m=>m[1]);
if(relative.length!==201 || new Set(relative).size!==201) {
  console.error('Bad manifest: expected 201 unique country links'); process.exit(1);
}
const paths=['/world/',...(VERIFY_ALL?relative:relative.slice(0,10))];
const results=[]; let pos=0;
async function probe(path){
  const route=new URL(path,ORIGIN);
  if(route.origin!==ORIGIN)throw Error('unsafe origin');
  const res=await fetch(route,{signal:AbortSignal.timeout(16000),redirect:'manual',headers:{'Cache-Control':'no-cache','Accept':'text/html'}});
  const type=res.headers.get('content-type')||'';
  if(res.status!==200 || !type.includes('text/html'))return {path,status:res.status,ok:false,type,reason:'non-200 or not HTML'};
  const text=await res.text();
  const isRoot=path==='/world/';
  const ok=isRoot?text.includes('AKTUAL MEDIA WORLD')&&text.includes('href="/world/hrvatska/"')&&text.includes('id="q"'):text.includes('AKTUAL MEDIA WORLD')&&text.includes('rel="canonical"')&&text.includes('name="robots"')&&text.includes('noindex,follow');
  return {path,status:res.status,ok,reason:ok?'':'missing expected page markup',bytes:text.length};
}
async function worker(){while(pos<paths.length){const i=pos++;try{results[i]=await probe(paths[i]);}catch(e){results[i]={path:paths[i],ok:false,reason:String(e.message||e).slice(0,120)}}}}
await Promise.all(Array.from({length:CONCURRENCY},worker));
const failed=results.filter(x=>!x.ok);
const report={checkedAt:new Date().toISOString(),origin:ORIGIN,total:paths.length,success:paths.length-failed.length,failedCount:failed.length,failures:failed.slice(0,50)};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/world201-public-http-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
