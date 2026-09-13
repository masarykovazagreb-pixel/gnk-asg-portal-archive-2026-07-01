import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),failures=[];const stats={htmlFiles:0,indexablePages:0,metaRefreshTags:0,violations:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(t,n)=>t.match(new RegExp(`\\s${n}=["']([^"']*)["']`,'i'))?.[1]?.trim()||'';
const isNoindex=html=>[...html.matchAll(/<meta\b[^>]*>/gi)].some(m=>/\bname=["']robots["']/i.test(m[0])&&/\bnoindex\b/i.test(attr(m[0],'content')));
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const html=fs.readFileSync(file,'utf8');if(isNoindex(html))continue;stats.indexablePages++;for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const t=m[0];if(!/\bhttp-equiv=["']refresh["']/i.test(t))continue;stats.metaRefreshTags++;stats.violations++;failures.push(`${rel}: indexable page must not use meta refresh (${attr(t,'content')||'missing content'})`);}}
const report={version:'GNK_ASG_META_REFRESH_INDEXABILITY_V1',ok:failures.length===0,stats,failures};const out=path.join(ROOT,'artifacts','meta-refresh-indexability');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
