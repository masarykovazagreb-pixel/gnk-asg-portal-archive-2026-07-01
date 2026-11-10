#!/usr/bin/env node
/**
 * Read-only inventory of static INTERNAL link discoverability on gnk-asg.hr.
 * Not an external backlink count. Does not follow JS-rendered/runtime links.
 *
 * Usage: node scripts/audit-sitewide-link-equity-v1.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve('apps/portal');
const HIGHLIGHTS=[
  '/','/gnk-aktual/','/gnk-aktual/media/','/gnk-aktual/mreza/',
  '/gnk-aktual/tjedni/','/en/gnk-aktual/','/aktual-media/',
  '/tehnologija-buducnosti/','/autonomija/','/metodologije/'
];
const ignored=new Set(['node_modules','.git','api','assets','data','admin','admin-center','workers']);
function walk(dir,files=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('.')||ignored.has(e.name))continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p,files);
    else if(e.isFile()&&e.name==='index.html')files.push(p);
  }
  return files;
}
const normalize=raw=>{
  try {
    if(!raw||/^(?:mailto:|tel:|javascript:|data:|#)/i.test(raw))return null;
    const u=new URL(raw,'https://gnk-asg.hr/');
    if(u.protocol!=='https:'||u.hostname!=='gnk-asg.hr')return null;
    return u.pathname.replace(/\/+/g,'/').replace(/\/?$/,'/');
  }catch{return null;}
};
const pages=new Set(),incoming=new Map(),outgoing=new Map();
for(const file of walk(ROOT).sort()){
  const s=fs.readFileSync(file,'utf8'),head=s.split(/<\/head>/i)[0];
  if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(head))continue;
  const p=path.relative(ROOT,path.dirname(file)).split(path.sep).join('/');
  const route=p==='.'?'/':'/'+p+'/';
  pages.add(route);
  const links=new Set();
  for(const m of s.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)){
    const href=m[2],target=normalize(href.startsWith('../')||href.startsWith('./')?new URL(href,'https://gnk-asg.hr'+route).href:href);
    if(!target||target===route)continue;
    links.add(target);
  }
  outgoing.set(route,links.size);
  for(const target of links)incoming.set(target,(incoming.get(target)||0)+1);
}
const orphan=[...pages].filter(route=>route!=='/'&&!(incoming.get(route)>0));
const results={
  version:'STATIC_INTERNAL_LINK_AUDIT_V1',indexablePagesScanned:pages.size,
  linkTargets:[...incoming.keys()].length,
  zeroStaticInboundCount:orphan.length,
  sampleOrphans:orphan.slice(0,20),
  strategicTargets:HIGHLIGHTS.map(route=>({route,exists:pages.has(route),inboundLinkingPages:incoming.get(route)||0,outgoingTargets:outgoing.get(route)||0})),
  caveat:'Counts only static HTML anchor links, not JS runtime links or externally originating backlinks. External links require independent third-party verification.'
};
console.log(JSON.stringify(results,null,2));
