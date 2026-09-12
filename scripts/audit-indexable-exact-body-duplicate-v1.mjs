import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),failures=[],warnings=[];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()&&!['assets','data'].includes(e.name)?walk(p):e.isFile()&&e.name==='index.html'?[p]:[]});
const route=f=>{const rel=path.relative(PORTAL,path.dirname(f)).split(path.sep).join('/');return rel?`/${rel}/`:'/'};
const visible=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<svg\b[\s\S]*?<\/svg>/gi,' ').replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim().toLocaleLowerCase('hr');
const groups=new Map();let checked=0,skippedShort=0,noindex=0;
for(const file of walk(PORTAL)){const html=fs.readFileSync(file,'utf8');const robots=html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1]||'';if(/(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots)){noindex++;continue;}const text=visible(html);if(text.length<200){skippedShort++;continue;}checked++;const hash=crypto.createHash('sha256').update(text).digest('hex');const arr=groups.get(hash)||[];arr.push({route:route(file),chars:text.length});groups.set(hash,arr);}
for(const [hash,rows] of groups){if(rows.length<2)continue;failures.push(`exact normalized visible-body duplicate ${hash.slice(0,12)}: ${rows.map(r=>r.route).join(', ')}`);}
const report={version:'GNK_ASG_INDEXABLE_EXACT_BODY_DUPLICATE_V1',ok:failures.length===0,stats:{checkedPages:checked,noindexPages:noindex,skippedShortPages:skippedShort,duplicateGroups:failures.length},failures,warnings};const out=path.join(ROOT,'artifacts','indexable-exact-body-duplicate');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
