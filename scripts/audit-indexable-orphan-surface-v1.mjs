import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),failures=[];const stats={htmlFiles:0,indexablePages:0,orphanPages:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(t,n)=>t.match(new RegExp(`\\s${n}=["']([^"']*)["']`,'i'))?.[1]?.trim()||'';
const canonical=html=>{for(const m of html.matchAll(/<link\b[^>]*>/gi)){const t=m[0];if(/\brel=["'][^"']*canonical[^"']*["']/i.test(t))return attr(t,'href')}return''};
const noindex=html=>[...html.matchAll(/<meta\b[^>]*>/gi)].some(m=>{const t=m[0];return attr(t,'name').toLowerCase()==='robots'&&/\bnoindex\b/i.test(attr(t,'content'))});
const pages=[];for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const html=fs.readFileSync(file,'utf8'),can=canonical(html);if(!can||noindex(html))continue;try{const u=new URL(can);pages.push({file,html,origin:u.origin,path:u.pathname});}catch{}}
stats.indexablePages=pages.length;const indexable=new Set(pages.map(p=>p.path)),incoming=new Map([...indexable].map(p=>[p,0]));
for(const p of pages){for(const m of p.html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)){const href=m[1].trim();if(!href||/^(?:#|mailto:|tel:|javascript:)/i.test(href))continue;let u;try{u=new URL(href,p.origin+p.path)}catch{continue}if(u.origin!==p.origin||!indexable.has(u.pathname)||u.pathname===p.path)continue;incoming.set(u.pathname,(incoming.get(u.pathname)||0)+1);}}
for(const p of pages){if(p.path==='/'||incoming.get(p.path)>0)continue;stats.orphanPages++;failures.push(`${path.relative(PORTAL,p.file)}: indexable canonical ${p.path} has no inbound internal link from another indexable page`);}
const report={version:'GNK_ASG_INDEXABLE_ORPHAN_SURFACE_V1',ok:failures.length===0,stats,failures};const out=path.join(ROOT,'artifacts','indexable-orphan-surface');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);