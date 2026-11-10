#!/usr/bin/env node
/**
 * Sitewide metadata enhancement for gnk-asg.hr, based on existing authored HTML.
 * Use AFTER canonical generators; never overwrite editorial metadata or authorship.
 * Audit/dry-run by default. Use --write only after reviewing output and safeguarding
 * the full generated file diff. Does not invent external backlinks.
 *
 * node scripts/sitewide-seo-meta-v1.mjs
 * node scripts/sitewide-seo-meta-v1.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import {enrichSitewideMeta} from './lib/sitewide-meta-enrichment-v1.mjs';

const ROOT=path.resolve('apps/portal');
const WRITE=process.argv.includes('--write');
const LIMIT=Number(process.env.SEO_MAX_CHANGES || 10000);
if(!Number.isSafeInteger(LIMIT)||LIMIT<1)throw new Error('SEO_MAX_CHANGES must be a positive integer');
const SKIP_DIRS=new Set(['node_modules','.git','admin','admin-center','api','workers','data','assets','__preview']);
function walk(dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ent.name.startsWith('.')||SKIP_DIRS.has(ent.name))continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory())walk(full,out);
    else if(ent.isFile()&&ent.name.endsWith('.html')&&!/^(404|50\d)\.html$/.test(ent.name))out.push(full);
  }
  return out;
}
const files=walk(ROOT).sort();
const changed=[];
let scanned=0, skipped=0;
for(const file of files){
  const original=fs.readFileSync(file,'utf8');
  const rel=path.relative(ROOT,file).split(path.sep).join('/');
  const route=rel==='index.html'?'/':('/'+rel.replace(/(?:^|\/)index\.html$/,function(){return '/';}));
  const normalized=route.endsWith('/')?route:route.replace(/\.html$/,'/');
  const updated=enrichSitewideMeta(original,{route:normalized});
  scanned++;
  if(updated===original){skipped++;continue}
  changed.push({file:rel,before:original.length,after:updated.length});
  if(changed.length>LIMIT)throw Error('SEO guard: more than '+LIMIT+' files would change');
  if(WRITE)fs.writeFileSync(file,updated);
}
console.log(JSON.stringify({
  version:'SITEWIDE_SEMANTIC_META_V1',
  mode:WRITE?'write':'dry-run',
  scanned,unchanged:skipped,changed:changed.length,
  sample:changed.slice(0,15).map(x=>x.file),
  note:'Only missing Open Graph and social metadata; no title, description, canonical, person, robots or authorship rewritten'
},null,2));
