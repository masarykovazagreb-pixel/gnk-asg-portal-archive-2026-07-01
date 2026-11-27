#!/usr/bin/env node
// IndexNow: canonical public URLs only. Receipt is not proof of indexing.
// https://www.indexnow.org/documentation.html
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const ORIGIN='https://gnk-asg.hr', HOST='gnk-asg.hr', ROOT='apps/portal';
const ENDPOINT='https://api.indexnow.org/indexnow';
const PRIVATE=/^(?:admin(?:-[^/]+)?|api|control|automation-status|webmail|mail(?:-[^/]+)?|campaign-mailer|email(?:-[^/]+)?|worker-ops|operator-dashboard|digital-headquarters|media-registration-admin|podijeli|assets|data|internal|private|node_modules|\..*)$/i;
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function publicUrl(raw){
 try{
  const u=new URL(raw);
  if(u.origin!==ORIGIN||u.username||u.password||u.search||u.hash)return null;
  const decoded=decodeURIComponent(u.pathname);
  if(/[\\\x00-\x1f]/.test(decoded)||/%(?:2f|5c)/i.test(u.pathname)||decoded.split('/').some(p=>p==='..'||PRIVATE.test(p)))return null;
  return u;
 }catch{return null}
}
function attrs(tag){
 const out={};for(const m of tag.matchAll(/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);
 return out;
}
export function eligiblePage(html,url){
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
 if(!head)return false;
 for(const m of head.matchAll(/<meta\b[^>]*>/gi)){
  const a=attrs(m[0]);
  if(/^(robots|googlebot|bingbot)$/i.test(a.name||'')&&/(^|[\s,])(noindex|none)(?=$|[\s,])/i.test(a.content||''))return false;
  if((a['http-equiv']||'').toLowerCase()==='refresh')return false;
 }
 const canonical=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).filter(a=>(a.rel||'').toLowerCase().split(/\s+/).includes('canonical'));
 if(canonical.length!==1||!canonical[0].href)return false;
 try{return new URL(canonical[0].href,url).href===url}catch{return false}
}
function sitemapCandidates(root){
 const pending=['/sitemap-index.xml'],visited=new Set(),urls=new Set();
 while(pending.length){
  const route=pending.pop();if(visited.has(route))continue;visited.add(route);
  if(visited.size>500)throw Error('Too many sitemap files');
  const file=path.join(root,route.slice(1));const xml=fs.readFileSync(file,'utf8');
  const index=/<sitemapindex\b/i.test(xml);
  if(!index&&!/<urlset\b/i.test(xml))throw Error('Invalid sitemap format');
  for(const m of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)){
   const u=publicUrl(decode(m[1].trim()));if(!u)continue;
   if(index){if(u.pathname.endsWith('.xml'))pending.push(u.pathname);continue;}
   if(!u.pathname.endsWith('/')&&!u.pathname.endsWith('.html'))continue;
   const relative=decodeURIComponent(u.pathname).replace(/^\//,'');
   const htmlPath=path.join(root,relative,u.pathname.endsWith('/')?'index.html':'');
   // Never follow symlinks outside the public root.
   if(!fs.existsSync(htmlPath))continue;
   const actual=fs.realpathSync(htmlPath),boundary=fs.realpathSync(root)+path.sep;
   if(!actual.startsWith(boundary)||!fs.statSync(actual).isFile())continue;
   if(eligiblePage(fs.readFileSync(actual,'utf8'),u.href))urls.add(u.href);
  }
 }
 return [...urls].sort();
}
function changedUrls(base){
 if(!/^[a-f0-9]{40}$/.test(base))throw Error('Expected full previous deployed SHA');
 execFileSync('git',['merge-base','--is-ancestor',base,'HEAD'],{stdio:'ignore'});
 const files=execFileSync('git',['diff','--name-only','-z',base,'HEAD','--',ROOT],{encoding:'utf8'}).split('\0');
 return new Set(files.filter(f=>f.startsWith(ROOT+'/')&&f.endsWith('.html')).map(f=>{
  const relative=f.slice(ROOT.length+1).replace(/(^|\/)index\.html$/,'$1');
  return new URL('/'+relative,ORIGIN).href;
 }));
}
export async function submitBatches(urls,key,{fetchImpl=fetch,batchSize=5000}={}){
 if(!/^[A-Za-z0-9-]{8,128}$/.test(key||''))throw Error('INDEXNOW_KEY missing or malformed');
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>10000)throw Error('Invalid batch size');
 let accepted=0,pendingValidation=0;
 for(let i=0;i<urls.length;i+=batchSize){
  const list=urls.slice(i,i+batchSize);
  if(list.some(u=>!publicUrl(u)))throw Error('Invalid public URL in submission');
  const response=await fetchImpl(ENDPOINT,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:HOST,key,keyLocation:ORIGIN+'/'+key+'.txt',urlList:list}),signal:AbortSignal.timeout(20000)});
  if(response.status===200)accepted+=list.length;
  else if(response.status===202)pendingValidation+=list.length;
  else throw Error('IndexNow HTTP '+response.status+'; stopped after '+accepted+' accepted and '+pendingValidation+' pending validation. Do not immediately retry rejected batches.');
 }
 return {accepted,pendingValidation,indexingConfirmed:false};
}
async function main(){
 const args=process.argv.slice(2),check=args.includes('--check'),base=args.find(a=>a.startsWith('--base='))?.slice(7);
 if(args.some(a=>a!=='--check'&&a!=='--all-public'&&!a.startsWith('--base=')))throw Error('Unknown argument');
 if(base&&args.includes('--all-public'))throw Error('Select changed or all-public mode');
 const all=sitemapCandidates(ROOT),changed=base?changedUrls(base):null,urls=changed?all.filter(u=>changed.has(u)):all;
 console.log(JSON.stringify({mode:check?'check':base?'changed':'all-public-legacy',eligible:urls.length,submissionConfirmed:false,indexingConfirmed:false}));
 if(check||!urls.length)return;
 console.log(JSON.stringify(await submitBatches(urls,process.env.INDEXNOW_KEY)));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(e=>{console.error(e.message);process.exitCode=1});
