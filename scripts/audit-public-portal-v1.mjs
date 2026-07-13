import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const REPORT=path.resolve('artifacts/public-portal-audit.json');
const PROTECTED=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/worker-ops','/operator-dashboard','/digital-headquarters','/media-registration-admin','/webmail'];
const REQUIRED=['/','/en/','/newsroom/','/en/newsroom/','/objave/','/analize/','/komentari/','/trzista/','/en/markets/','/the-code/','/contact/','/media-application/'];
const LEGACY=['public-floating-menu-v1.js','public-floating-menu-v2.js','index-live-hub-v1.js'];
const MENU='public-compact-menu-v1.js';
const DYNAMIC_PREFIXES=['/api/','/cdn-cgi/','/.well-known/'];

const posix=p=>p.split(path.sep).join('/');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=path.join(dir,entry.name);return entry.isDirectory()?walk(p):[p]});
const htmlFiles=walk(ROOT).filter(p=>p.endsWith('.html'));
const assetFiles=new Set(walk(ROOT).map(p=>'/'+posix(path.relative(ROOT,p))));
const exists=p=>fs.existsSync(p);
const routeFor=file=>{const rel=posix(path.relative(ROOT,file));if(rel==='index.html')return '/';if(rel.endsWith('/index.html'))return '/'+rel.slice(0,-10);return '/'+rel;};
const isProtected=route=>PROTECTED.some(prefix=>route===prefix||route.startsWith(prefix+'/'));
const normalizeRef=raw=>{try{return decodeURI(String(raw||'').trim().split('#')[0].split('?')[0]);}catch{return String(raw||'').trim().split('#')[0].split('?')[0];}};
const external=ref=>!ref||ref.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(ref)||ref.startsWith('//');
const dynamic=ref=>DYNAMIC_PREFIXES.some(prefix=>ref.startsWith(prefix));
const targetExists=(ref,file)=>{
  const clean=normalizeRef(ref);if(external(clean)||dynamic(clean))return true;
  if(clean.startsWith('/')){
    if(assetFiles.has(clean))return true;
    const direct=path.join(ROOT,clean.replace(/^\//,''));
    return exists(direct)||exists(path.join(direct,'index.html'))||exists(direct+'.html');
  }
  const direct=path.resolve(path.dirname(file),clean);
  return exists(direct)||exists(path.join(direct,'index.html'))||exists(direct+'.html');
};
const extract=(html,attr)=>[...html.matchAll(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`,'gi'))].map(m=>m[1]);
const canonical=html=>html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]||'';

const findings=[];const pages=[];
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file),protectedRoute=isProtected(route),refs=[...extract(html,'href'),...extract(html,'src')];
  const broken=[...new Set(refs.filter(ref=>!targetExists(ref,file)))];
  const legacy=LEGACY.filter(token=>html.includes(token));
  const menuCount=(html.match(new RegExp(MENU.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
  const robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';
  const noindex=/noindex/i.test(robots),indexable=!protectedRoute&&!noindex;
  const canon=canonical(html),lang=html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1]||'';
  const item={route,file:posix(path.relative('.',file)),protected:protectedRoute,indexable,noindex,lang,canonical:canon,broken,legacy,menuCount};pages.push(item);

  for(const ref of broken)findings.push({severity:protectedRoute?'warning':'error',code:protectedRoute?'PROTECTED_LOCAL_REFERENCE_UNRESOLVED':'BROKEN_LOCAL_REFERENCE',route,file:item.file,value:ref});
  for(const token of legacy)findings.push({severity:protectedRoute?'warning':'error',code:protectedRoute?'PROTECTED_LEGACY_RUNTIME_REFERENCE':'LEGACY_RUNTIME_REFERENCE',route,file:item.file,value:token});
  if(!protectedRoute&&menuCount>1)findings.push({severity:'error',code:'DUPLICATE_COMPACT_MENU',route,file:item.file,value:menuCount});
  if(indexable&&!canon)findings.push({severity:'warning',code:'MISSING_CANONICAL',route,file:item.file});
  if(indexable&&!lang)findings.push({severity:'warning',code:'MISSING_HTML_LANG',route,file:item.file});
  if(protectedRoute&&!noindex)findings.push({severity:'error',code:'PROTECTED_PAGE_MISSING_NOINDEX',route,file:item.file});
}
for(const route of REQUIRED){
  const target=route==='/'?path.join(ROOT,'index.html'):path.join(ROOT,route.replace(/^\//,''),'index.html');
  if(!exists(target))findings.push({severity:'error',code:'MISSING_REQUIRED_ROUTE',route,file:posix(path.relative('.',target))});
}
const menuFile=path.join(ROOT,'assets',MENU);
if(!exists(menuFile))findings.push({severity:'error',code:'MISSING_CANONICAL_MENU',file:posix(path.relative('.',menuFile))});
else{
  const menu=fs.readFileSync(menuFile,'utf8');
  for(const route of REQUIRED.filter(r=>r!=='/en/'))if(!menu.includes(route))findings.push({severity:'warning',code:'MENU_ROUTE_NOT_DECLARED',route,file:posix(path.relative('.',menuFile))});
}
const errors=findings.filter(x=>x.severity==='error'),warnings=findings.filter(x=>x.severity==='warning');
const report={version:'PUBLIC_PORTAL_AUDIT_V2_20260713',generatedAt:new Date().toISOString(),summary:{htmlFiles:htmlFiles.length,pages:pages.length,errors:errors.length,warnings:warnings.length},findings,pages};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(errors.length){console.error('\nCritical public audit findings:');for(const x of errors.slice(0,100))console.error(`- ${x.code} ${x.route||''} ${x.value||''} (${x.file||''})`);process.exit(1)}
