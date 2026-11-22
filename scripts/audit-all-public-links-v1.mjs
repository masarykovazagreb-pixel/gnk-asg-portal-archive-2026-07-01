#!/usr/bin/env node
/**
 * GNK ASG: comprehensive READ-ONLY static HTML/link/resource audit.
 * Never follows external links and never sends forms. Every HTML page is scanned.
 * A local path absent from the static tree is a CANDIDATE, not proof of a
 * live 404: the production Worker may own the route.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const OUT=path.resolve('artifacts/quality/all-pages-link-audit-v1.json');
const SITE='https://gnk-asg.hr';
const files=new Set(),pages=[];
const IGNORE_DIRS=new Set(['.github','node_modules','test-results','playwright-report']);
function walk(folder) {
  if(!fs.existsSync(folder))return;
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
    const abs=path.join(folder,entry.name);
    if(entry.isDirectory()){if(!IGNORE_DIRS.has(entry.name))walk(abs);}
    else if(entry.isFile()) {
      files.add(abs);
      if(/\.html?$/i.test(entry.name))pages.push(abs);
    }
  }
}
walk(ROOT);
const counts={pages:0,links:0,internal:0,external:0,assets:0,fragments:0,malformed:0,missingLocal:0,dynamic:0,templates:0,unsafe:0};
const missing=new Map(),external=new Map(),bad=[],unsafe=[];
const byKind={page:0,image:0,script:0,style:0,icon:0,media:0};
const cap=(v,n=160)=>String(v||'').slice(0,n);
const decode=(s)=>String(s||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const attr=(tag,name)=>{
 const rx=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i');
 const m=tag.match(rx);return m?decode(m[1]??m[2]??m[3]??''):'';
};
const isLocalHost=h=>h==='gnk-asg.hr'||h==='www.gnk-asg.hr';
const existsRoute=pathname=>{
 let decoded;
 try{decoded=decodeURIComponent(pathname)}catch{return false}
 if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').includes('..'))return false;
 const normalized=path.posix.normalize('/'+decoded.replace(/^\/+/,'')); 
 const base=path.resolve(ROOT,'.'+normalized);
 if(!base.startsWith(ROOT+path.sep)&&base!==ROOT)return false;
 return files.has(base)||files.has(path.join(base,'index.html'))||
   (normalized==='/'&&files.has(path.join(ROOT,'index.html')));
};
const record=(map,key,example,kind)=>{
 let v=map.get(key);
 if(!v){v={target:key,hits:0,sources:[],kind};map.set(key,v)}
 v.hits++;
 if(v.sources.length<3&&!v.sources.includes(example))v.sources.push(example);
};
function check(ref,kind,source,baseHref='') {
 const raw=String(ref||'').trim();
 if(!raw||raw==='#'||raw.startsWith('#')){if(raw.startsWith('#'))counts.fragments++;return;}
 if(/^(?:mailto|tel|sms|data|blob|about):/i.test(raw))return;
 counts.links++;
 if(/^(?:javascript|vbscript):/i.test(raw)){counts.unsafe++;if(unsafe.length<40)unsafe.push({source,kind,example:cap(raw)});return;}
 if(/^(?:\{\{|\$\{|<%|javascript:void)/.test(raw)||/['"`]\s*\+|\+\s*['"`]|\$\{/.test(raw)){counts.templates++;return;}
 let target;
 try{target=new URL(raw,baseHref?new URL(baseHref,SITE+source):SITE+source)}catch{
   counts.malformed++;if(bad.length<40)bad.push({source,kind,value:cap(raw)});return;
 }
 if(!/^https?:$/.test(target.protocol))return;
 if(!isLocalHost(target.hostname.toLowerCase())){
   counts.external++;record(external,target.origin,source,kind);return;
 }
 counts.internal++;
 if(/^\/(?:api|cdn-cgi)\//.test(target.pathname)||/^\/\.well-known\//.test(target.pathname)){counts.dynamic++;return;}
 if(kind!=='page')counts.assets++;
 if(!existsRoute(target.pathname)){
   counts.missingLocal++;
   record(missing,target.pathname,source,kind);
   byKind[kind]=(byKind[kind]||0)+1;
 }
}
const parseSrcset=(value)=>String(value||'').split(',').map(part=>part.trim().split(/\s+/)[0]).filter(Boolean);
for(const file of pages.sort()){
  const html=fs.readFileSync(file,'utf8');
  const route='/'+path.relative(ROOT,file).split(path.sep).join('/').replace(/(?:index)?\.html?$/,'');
  counts.pages++;
  const baseTag=(html.match(/<base\b[^>]*>/i)||[])[0]||'';
  const baseHref=attr(baseTag,'href');
  // Ignore literal snippets inside scripts/styles: they are not DOM links.
  const scanned=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>')
                    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi,'$1</style>');
  // Inspect actual elements, not script/template text or SEO descriptor URLs.
  for(const tag of scanned.match(/<(?:a|img|script|link|source)\b[^>]{0,4096}>/gi)||[]){
    const t=tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
    if(t==='a')check(attr(tag,'href'),'page',route,baseHref);
    if(t==='img'){
      check(attr(tag,'src'),'image',route,baseHref);
      for(const u of parseSrcset(attr(tag,'srcset')))check(u,'image',route,baseHref);
    }
    if(t==='source'){
      check(attr(tag,'src'),'media',route,baseHref);
      for(const u of parseSrcset(attr(tag,'srcset')))check(u,'media',route,baseHref);
    }
    if(t==='script')check(attr(tag,'src'),'script',route,baseHref);
    if(t==='link'){
      const rel=attr(tag,'rel').toLowerCase();
      if(/\bstylesheet\b/.test(rel))check(attr(tag,'href'),'style',route,baseHref);
      else if(/\bicon\b/.test(rel))check(attr(tag,'href'),'icon',route,baseHref);
      else if(/\bpreload\b/.test(rel)&&/^(image|style|script)$/i.test(attr(tag,'as')))check(attr(tag,'href'),attr(tag,'as').toLowerCase(),route,baseHref);
    }
  }
}
const ordered=(map)=>[...map.values()].sort((a,b)=>b.hits-a.hits||a.target.localeCompare(b.target));
const fullMissing=ordered(missing);
const result={
  version:'GNK_ASG_ALL_PUBLIC_LINKS_V1',generatedAt:new Date().toISOString(),
  scope:'All public HTML files under apps/portal (excluding repository tooling); cross-domain destinations counted but not fetched',
  counts:{...counts,staticFiles:files.size,uniqueMissingLocalTargets:missing.size,uniqueExternalOrigins:external.size},
  missingByKind:byKind,
  missingLocalTargets:fullMissing.slice(0,300),
  externalOrigins:ordered(external).slice(0,80),malformed:bad,unsafe,
  caveat:'Missing static routes can be served by a production Worker; verify before claiming broken. No remote access performed by this script.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
const md=[
'# All public HTML links — static audit',
'','Pages scanned: '+counts.pages,
'Local links examined: '+counts.internal,
'External link references: '+counts.external,
'Unique local paths needing live verification: '+missing.size,
'Malformed link references: '+counts.malformed,
'Unsafe JavaScript protocol references: '+counts.unsafe,
'','## Most frequent unresolved static paths',
'| Local path | References | Examples |','|---|---:|---|',
...fullMissing.slice(0,30).map(x=>'| '+x.target.replace(/\|/g,'')+' | '+x.hits+' | '+x.sources.slice(0,2).join(', ').replace(/\|/g,'')+' |'),
'','**Important:** These are static-package findings; Worker-owned routes may be live. The live audit independently checks representative paths.'
].join('\n');
fs.writeFileSync(OUT.replace(/\.json$/,'.md'),md+'\n');
console.log(JSON.stringify({version:result.version,counts:result.counts,missingByKind:byKind,topMissing:fullMissing.slice(0,70)},null,2));
