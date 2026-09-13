import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const PORTAL=path.join(ROOT,'apps','portal');
const failures=[];
let checked=0;
function routeFile(p){if(p==='/')return path.join(PORTAL,'index.html');const clean=p.replace(/^\/+|\/+$/g,'');return path.join(PORTAL,clean,'index.html');}
function canonical(html){const a=html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);const b=html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);return (a?.[1]||b?.[1]||'').trim();}
for(const name of fs.readdirSync(PORTAL).filter(n=>/^sitemap.*\.xml$/i.test(n))){const xml=fs.readFileSync(path.join(PORTAL,name),'utf8');for(const m of xml.matchAll(/<loc>\s*(https:\/\/(?:www\.)?gnk-asg\.hr([^<]*))\s*<\/loc>/gi)){const full=m[1].trim();const pathname=new URL(full).pathname;const file=routeFile(pathname);if(!fs.existsSync(file))continue;checked++;const c=canonical(fs.readFileSync(file,'utf8'));if(!c){failures.push(`${name}: ${pathname} has no canonical`);continue;}const cu=new URL(c,full);const normalize=p=>(p.replace(/\/+$/,'')||'/');if(cu.hostname.replace(/^www\./,'')!=='gnk-asg.hr'||normalize(cu.pathname)!==normalize(pathname)){failures.push(`${name}: ${full} canonical mismatch -> ${cu.href}`);}}}
const report={version:'GNK_ASG_SITEMAP_CANONICAL_TARGET_PARITY_V1',ok:failures.length===0,checked,failures};const out=path.join(ROOT,'artifacts','sitemap-canonical-target-parity');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
