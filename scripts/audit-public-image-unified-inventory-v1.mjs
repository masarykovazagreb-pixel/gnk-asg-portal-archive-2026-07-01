import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const PORTAL=path.join(ROOT,'apps','portal');
const OUT=path.join(ROOT,'artifacts','public-image-unified-inventory');
const refs=[]; const failures=[]; const warnings=[];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(tag,name)=>tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`,'i'))?.[1]?.trim()||'';
const clean=u=>String(u||'').trim().split('#')[0];
const add=(route,surface,url)=>{url=clean(url); if(!url)return; refs.push({route,surface,url});};
const addSrcset=(route,surface,value)=>String(value||'').split(',').forEach(c=>add(route,surface,c.trim().split(/\\s+/)[0]));
const localPath=u=>{if(!u||/^(?:https?:|data:|blob:|\/\/)/i.test(u))return null; const x=u.split(/[?#]/)[0]; return path.join(PORTAL,x.replace(/^\/+/,''));};
const indexable=h=>!/(?:^|[,\\s])noindex(?:$|[,\\s])/i.test(h.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1]||'');

for(const file of walk(PORTAL).filter(f=>f.endsWith('index.html'))){
 const html=fs.readFileSync(file,'utf8'); if(!indexable(html))continue;
 const rel=path.relative(PORTAL,path.dirname(file)).replaceAll(path.sep,'/'); const route=rel?`/${rel}/`:'/';
 for(const m of html.matchAll(/<img\\b[^>]*>/gi)){const t=m[0];add(route,'img:src',attr(t,'src'));addSrcset(route,'img:srcset',attr(t,'srcset'));}
 for(const m of html.matchAll(/<source\\b[^>]*>/gi)){const t=m[0];add(route,'source:src',attr(t,'src'));addSrcset(route,'source:srcset',attr(t,'srcset'));}
 for(const m of html.matchAll(/<meta\\b[^>]*>/gi)){const t=m[0];const k=attr(t,'property')||attr(t,'name');if(['og:image','og:image:secure_url','twitter:image'].includes(k))add(route,`meta:${k}`,attr(t,'content'));}
 for(const m of html.matchAll(/<link\\b[^>]*>/gi)){const t=m[0];if(/\\brel=["'][^"']*preload[^"']*["']/i.test(t)&&/^image$/i.test(attr(t,'as'))) {add(route,'preload:image',attr(t,'href'));addSrcset(route,'preload:imagesrcset',attr(t,'imagesrcset'));}}
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\\s\\S]*?)<\/script>/gi)){
   try{const data=JSON.parse(m[1]); const visit=o=>{if(!o)return;if(Array.isArray(o)){o.forEach(visit);return;}if(typeof o!=='object')return;if(o['@type']==='ImageObject'){add(route,'jsonld:ImageObject:url',o.url);add(route,'jsonld:ImageObject:contentUrl',o.contentUrl);}if(typeof o.image==='string')add(route,'jsonld:image',o.image);else if(o.image)visit(o.image);Object.values(o).forEach(v=>{if(v&&typeof v==='object'&&v!==o.image)visit(v);});};visit(data);}catch(e){warnings.push(`${route}: invalid JSON-LD skipped: ${e.message}`);}
 }
}

const sitemap=path.join(PORTAL,'image-sitemap.xml'); if(fs.existsSync(sitemap)){const xml=fs.readFileSync(sitemap,'utf8');for(const m of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/gi))add('/','image-sitemap:image:loc',m[1]);}
for(const r of refs){const p=localPath(r.url); if(p&&!fs.existsSync(p))failures.push(`${r.route} ${r.surface}: local image reference does not materialize: ${r.url}`); if(/^javascript:/i.test(r.url))failures.push(`${r.route} ${r.surface}: forbidden image URL scheme: ${r.url}`);}
const key=r=>`${r.surface}|${r.url}`; const uniq=new Map(); for(const r of refs)uniq.set(key(r),r);
const bySurface={}; for(const r of uniq.values())bySurface[r.surface]=(bySurface[r.surface]||0)+1;
const report={version:'GNK_ASG_PUBLIC_IMAGE_UNIFIED_INVENTORY_V1',scope:'PUBLIC_INDEXABLE_HTML_PLUS_IMAGE_SITEMAP',ok:failures.length===0,evidenceSemantics:{remoteHttpAndMime:'RUNTIME_EVIDENCE_REQUIRED',indexed:'NOT_INFERRED'},stats:{references:refs.length,uniqueReferences:uniq.size,surfaces:bySurface},failures,warnings,references:[...uniq.values()]};
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
