import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const PORTAL=path.join(ROOT,'apps','portal');
const failures=[];
let checkedTargets=0;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
function routeFile(p){if(p==='/')return path.join(PORTAL,'index.html');const clean=p.replace(/^\/+|\/+$/g,'');return path.join(PORTAL,clean,'index.html');}
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*>/gi)){const lang=(m[1]||m[4]||'').trim();const href=(m[2]||m[3]||'').trim();if(!href)continue;let u;try{u=new URL(href,'https://gnk-asg.hr');}catch{failures.push(`${rel}: invalid hreflang target ${href}`);continue;}if(u.hostname.replace(/^www\./,'')!=='gnk-asg.hr')continue;checkedTargets++;const target=routeFile(u.pathname);if(!fs.existsSync(target)){failures.push(`${rel}: hreflang ${lang} target does not materialize ${u.pathname}`);continue;}const targetHtml=fs.readFileSync(target,'utf8');if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(targetHtml)||/<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(targetHtml)){failures.push(`${rel}: hreflang ${lang} points to noindex target ${u.pathname}`);}}
}
const report={version:'GNK_ASG_HREFLANG_TARGET_INDEXABILITY_V1',ok:failures.length===0,checkedTargets,failures};const out=path.join(ROOT,'artifacts','hreflang-target-indexability');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
