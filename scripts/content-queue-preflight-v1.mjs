// Fail-closed Content Factory preflight. Does not create approvals or publish.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||process.cwd());
const file=p=>path.join(root,p);
function read(p,optional=false){
  if(!fs.existsSync(file(p))){if(optional)return null;throw Error('Missing required source: '+p);}
  const v=JSON.parse(fs.readFileSync(file(p),'utf8'));
  if(!v||typeof v!=='object')throw Error('Invalid JSON object: '+p);
  return v;
}
const q=read('content/factory-queue/queue.json'),state=read('apps/portal/data/content-queue-state.json');
if(!Array.isArray(q.items)||!Array.isArray(q.skipped)||!state.published||typeof state.published!=='object'||Array.isArray(state.published))throw Error('Invalid queue or publication state');
const now=new Date(process.env.ASG_EDITORIAL_NOW||Date.now());
if(!Number.isFinite(now.getTime()))throw Error('Invalid current time');
const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
const errors=[],ids=new Set(),skip=new Set(q.skipped);
for(const x of q.items){if(!x||typeof x.id!=='string'||ids.has(x.id))errors.push('Duplicate or missing queue ID: '+x?.id);else ids.add(x.id);}
const due=q.items.filter(x=>x&&!skip.has(x.id)&&!Object.hasOwn(state.published,x.id)&&(x.date<date||(x.date===date&&x.time<=time)));
if(!due.length&&!errors.length){console.log(JSON.stringify({ok:true,due:0,reason:'NO_DUE_ITEMS'}));process.exit(0);}
const approvals=read('content/factory-queue/publication-approvals.json',true);
const registry=read('apps/portal/data/editorial-registry.json');
const plan=read('apps/portal/data/editorial-plan/manifest.json',true);
const holds=read('apps/portal/data/editorial-plan/publication-holds.json',true);
if(!approvals||!Array.isArray(approvals.approvals))errors.push('Missing explicit approvals');
if(!Array.isArray(registry.items))errors.push('Invalid registry');
const active=new Set((holds?.holds||[]).filter(x=>x.active).map(x=>x.packageId)),heldSlugs=new Set();
for(const p of plan?.packages||[]){
 if(!active.has(p.id))continue;
 for(const sub of p.files||[]){
  const items=read('apps/portal/data/editorial-plan/'+sub);
  if(!Array.isArray(items))throw Error('Invalid held package content: '+sub);
  for(const x of items)if(x.slug)heldSlugs.add(x.slug);
 }
}
const routes=new Set();
for(const x of due){
 if(!['objave','komentari','analize','kolumne','tematske'].includes(x.category)||!/^[a-z0-9-]+$/.test(x.slug||'')||!/^20\d\d-\d\d-\d\d$/.test(x.date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time||'')){errors.push(x.id+': invalid item metadata');continue;}
 const source='content/factory-queue/'+x.category+'/'+x.slug+'.html';
 if(!fs.existsSync(file(source))){errors.push(x.id+': missing source '+source);continue;}
 const bytes=fs.readFileSync(file(source)),html=bytes.toString('utf8'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 const url=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
 if(!url||!/^https:\/\/gnk-asg\.hr\/(?:[a-z0-9-]+\/)+$/.test(url)){errors.push(x.id+': invalid canonical');continue;}
 const route=url.slice('https://gnk-asg.hr'.length);
 if(routes.has(route)||(registry.items||[]).some(v=>v.path===route||v.url===url)||fs.existsSync(file('apps/portal'+route+'index.html')))errors.push(x.id+': duplicate public route');
 routes.add(route);
 if(heldSlugs.has(x.slug))errors.push(x.id+': active editorial hold');
 const ap=(approvals?.approvals||[]).filter(v=>v.id===x.id);
 if(ap.length!==1||ap[0].approved!==true||!ap[0].editor||!Number.isFinite(Date.parse(ap[0].approvedAt))||ap[0].sourceSha256!==hash||ap[0].canonical!==url)errors.push(x.id+': missing or outdated approval for exact HTML');
}
console.log(JSON.stringify({ok:errors.length===0,due:due.length,errors},null,2));
if(errors.length)process.exitCode=1;
