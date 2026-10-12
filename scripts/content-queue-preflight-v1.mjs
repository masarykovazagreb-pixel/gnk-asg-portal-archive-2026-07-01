// Fail-closed Content Factory preflight. It validates publication safety but does not publish.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SITE='https://gnk-asg.hr';
const ALLOWED_CATEGORIES=new Set(['objave','komentari','analize','kolumne','tematske']);
const SCRIPT_PATH=fileURLToPath(import.meta.url);

function file(root,rel){return path.join(root,rel)}
function readJson(root,rel,{optional=false}={}){
  const target=file(root,rel);
  if(!fs.existsSync(target)){
    if(optional)return null;
    throw new Error('Missing required source: '+rel);
  }
  const value=JSON.parse(fs.readFileSync(target,'utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid JSON object: '+rel);
  return value;
}
function zagrebParts(now){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('Invalid current time');
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  return {date,time};
}
function canonicalFrom(html){
  return (html.match(/<link\b[^>]*\brel=["'][^"']*canonical[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    ||html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'][^"']*canonical[^"']*["'][^>]*>/i)
    ||[])[1]||'';
}
function heldSlugs(root){
  const manifest=readJson(root,'apps/portal/data/editorial-plan/manifest.json',{optional:true});
  const holds=readJson(root,'apps/portal/data/editorial-plan/publication-holds.json',{optional:true});
  if(!manifest&&!holds)return new Set();
  if(!manifest||!Array.isArray(manifest.packages))throw new Error('Invalid editorial manifest');
  if(!holds||!Array.isArray(holds.holds))throw new Error('Invalid publication holds');
  const active=new Set(holds.holds.filter(x=>x?.active===true).map(x=>x.packageId));
  const slugs=new Set();
  for(const pack of manifest.packages){
    if(!active.has(pack?.id))continue;
    for(const sub of pack.files||[]){
      const target=file(root,'apps/portal/data/editorial-plan/'+sub);
      if(!fs.existsSync(target))throw new Error('Missing held package content: '+sub);
      const items=JSON.parse(fs.readFileSync(target,'utf8'));
      if(!Array.isArray(items))throw new Error('Invalid held package content: '+sub);
      for(const item of items)if(item?.slug)slugs.add(String(item.slug));
    }
  }
  return slugs;
}

export function preflightContentQueue({root=process.cwd(),now=new Date(process.env.ASG_EDITORIAL_NOW||Date.now())}={}){
  const queue=readJson(root,'content/factory-queue/queue.json');
  const state=readJson(root,'apps/portal/data/content-queue-state.json');
  const registry=readJson(root,'apps/portal/data/editorial-registry.json');
  if(!Array.isArray(queue.items)||!Array.isArray(queue.skipped))throw new Error('Invalid queue structure');
  if(!state.published||typeof state.published!=='object'||Array.isArray(state.published))throw new Error('Invalid publication state');
  if(!Array.isArray(registry.items))throw new Error('Invalid editorial registry');

  const {date,time}=zagrebParts(now);
  const errors=[];
  const ids=new Set();
  for(const item of queue.items){
    if(!item||typeof item.id!=='string'||!item.id.trim()){
      errors.push('Missing queue ID');
      continue;
    }
    if(ids.has(item.id))errors.push('Duplicate queue ID: '+item.id);
    ids.add(item.id);
  }

  const skipped=new Set(queue.skipped);
  const due=queue.items.filter(item=>item&&!skipped.has(item.id)&&!Object.hasOwn(state.published,item.id)
    &&(item.date<date||(item.date===date&&item.time<=time)));
  const held=heldSlugs(root);
  const registryRoutes=new Set(registry.items.flatMap(item=>[item?.path,item?.url].filter(Boolean)));
  const dueRoutes=new Set();
  const checked=[];

  for(const item of due){
    if(!ALLOWED_CATEGORIES.has(item.category)
      ||!/^[a-z0-9-]+$/.test(item.slug||'')
      ||!/^20\d\d-\d\d-\d\d$/.test(item.date||'')
      ||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time||'')){
      errors.push(item.id+': invalid item metadata');
      continue;
    }
    const source='content/factory-queue/'+item.category+'/'+item.slug+'.html';
    const sourcePath=file(root,source);
    if(!fs.existsSync(sourcePath)){
      errors.push(item.id+': missing source '+source);
      continue;
    }
    const bytes=fs.readFileSync(sourcePath);
    const html=bytes.toString('utf8');
    const canonical=canonicalFrom(html);
    if(!canonical||!/^https:\/\/gnk-asg\.hr\/(?:[a-z0-9-]+\/)+$/.test(canonical)){
      errors.push(item.id+': invalid canonical');
      continue;
    }
    const route=canonical.slice(SITE.length);
    if(dueRoutes.has(route)||registryRoutes.has(route)||fs.existsSync(file(root,'apps/portal'+route+'index.html'))){
      errors.push(item.id+': duplicate public route');
    }
    dueRoutes.add(route);
    if(held.has(item.slug))errors.push(item.id+': active editorial hold');
    checked.push({
      id:item.id,
      source,
      canonical,
      route,
      sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')
    });
  }

  return {
    ok:errors.length===0,
    version:'GNK_ASG_CONTENT_QUEUE_PREFLIGHT_V2_20261010',
    now:now.toISOString(),
    zagreb:{date,time},
    due:due.length,
    checked,
    errors
  };
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(SCRIPT_PATH);
if(invoked){
  const result=preflightContentQueue({root:path.resolve(process.argv[2]||process.cwd())});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
