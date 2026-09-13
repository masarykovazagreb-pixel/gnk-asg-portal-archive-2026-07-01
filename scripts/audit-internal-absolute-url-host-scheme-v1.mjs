import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),failures=[];const stats={htmlFiles:0,canonicalHosts:0,absoluteInternalLinks:0,violations:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(t,n)=>t.match(new RegExp(`\\s${n}=["']([^"']*)["']`,'i'))?.[1]?.trim()||'';
const files=walk(PORTAL).filter(f=>f.endsWith('.html'));const hosts=new Set();
for(const file of files){const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<link\b[^>]*>/gi)){if(!/\brel=["'][^"']*canonical[^"']*["']/i.test(m[0]))continue;try{hosts.add(new URL(attr(m[0],'href')).hostname.toLowerCase())}catch{}}}
stats.canonicalHosts=hosts.size;
for(const file of files){stats.htmlFiles++;const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<a\b[^>]*>/gi)){const href=attr(m[0],'href');if(!/^https?:\/\//i.test(href))continue;let u;try{u=new URL(href)}catch{continue}if(!hosts.has(u.hostname.toLowerCase()))continue;stats.absoluteInternalLinks++;if(u.protocol!=='https:'||u.username||u.password){stats.violations++;failures.push(`${rel}: internal absolute link must use HTTPS and no userinfo (${href})`);}}}
const report={version:'GNK_ASG_INTERNAL_ABSOLUTE_URL_HOST_SCHEME_V1',ok:failures.length===0,stats,canonicalHosts:[...hosts].sort(),failures};const out=path.join(ROOT,'artifacts','internal-absolute-url-host-scheme');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
