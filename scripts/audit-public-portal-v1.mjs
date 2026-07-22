import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const REPORT=path.resolve('artifacts/public-portal-audit.json');
const WORKER_FILE=path.resolve('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js');
const MENU_FILE=path.resolve('apps/portal/assets/public-unified-menu-v6.js');
const CONTRAST_FILE=path.resolve('apps/portal/assets/public-contrast-hardening-v1.js');
const PROTECTED=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/worker-ops','/operator-dashboard','/digital-headquarters','/media-registration-admin','/webmail'];
const REQUIRED=['/','/en/','/newsroom/','/en/newsroom/','/contact/','/en/contact/','/objave/','/analize/','/komentari/','/en/publications/','/en/analyses/','/en/commentary/','/trzista/','/en/markets/','/the-code/','/en/the-code/','/media-application/','/workers/','/admin-login/'];
const REQUIRED_ASSETS=['/assets/public-unified-menu-v6.js','/assets/public-contrast-hardening-v1.js','/assets/public-design-tokens-v1.css','/assets/logo-gnk-asg-canonical.svg','/assets/contact-form-v2.js','/assets/the-code-experience-loop-v1.html','/assets/editorial-content-v2.css','/assets/workers-directory-v1.js','/assets/protected-operations-v1.js'];
const DYNAMIC_PREFIXES=['/api/','/cdn-cgi/','/.well-known/'];
const EDGE_CANONICAL=new Map([['/about/','https://gnk-asg.hr/about/'],['/projects/','https://gnk-asg.hr/projects/'],['/the-code/media-memorandum/','https://gnk-asg.hr/the-code/media-memorandum/']]);
const IGNORE_DIRS=new Set(['node_modules','test-results','playwright-report','.git']);
const posix=value=>value.split(path.sep).join('/');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{if(entry.isDirectory()&&IGNORE_DIRS.has(entry.name))return[];const target=path.join(dir,entry.name);return entry.isDirectory()?walk(target):[target]});
const rel=file=>posix(path.relative(ROOT,file));
const utility=file=>rel(file).startsWith('assets/')||rel(file).startsWith('.github/')||rel(file).startsWith('node_modules/')||rel(file).startsWith('test-results/')||rel(file).startsWith('playwright-report/')||/^google[a-f0-9]+\.html$/i.test(path.basename(file));
const routeFor=file=>{const value=rel(file);if(value==='index.html')return'/';if(value.endsWith('/index.html'))return`/${value.slice(0,-10)}`;return`/${value}`};
const isProtected=route=>PROTECTED.some(prefix=>route===prefix||route.startsWith(`${prefix}/`));
const normalizeRef=raw=>{try{return decodeURI(String(raw||'').trim().split('#')[0].split('?')[0])}catch{return String(raw||'').trim().split('#')[0].split('?')[0]}};
const external=ref=>!ref||ref.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(ref)||ref.startsWith('//');
const dynamic=ref=>DYNAMIC_PREFIXES.some(prefix=>ref.startsWith(prefix));
const extract=(html,attr)=>[...html.matchAll(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`,'gi'))].map(match=>match[1]);
const canonical=html=>html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]||'';
const baseHref=html=>html.match(/<base\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||'';
const assetFiles=new Set(walk(ROOT).filter(file=>!rel(file).startsWith('.github/')).map(file=>`/${rel(file)}`));
const targetExists=(ref,file,base='')=>{const clean=normalizeRef(ref);if(external(clean)||dynamic(clean))return true;if(clean.startsWith('/')){if(assetFiles.has(clean))return true;const direct=path.join(ROOT,clean.slice(1));return fs.existsSync(direct)||fs.existsSync(path.join(direct,'index.html'))||fs.existsSync(`${direct}.html`)}let baseDir=path.dirname(file);const normalizedBase=normalizeRef(base);if(normalizedBase&&!external(normalizedBase))baseDir=normalizedBase.startsWith('/')?path.join(ROOT,normalizedBase.slice(1)):path.resolve(path.dirname(file),normalizedBase);const direct=path.resolve(baseDir,clean);return fs.existsSync(direct)||fs.existsSync(path.join(direct,'index.html'))||fs.existsSync(`${direct}.html`)};

if(!fs.existsSync(WORKER_FILE))throw new Error('Missing V31 worker');
const worker=fs.readFileSync(WORKER_FILE,'utf8');
for(const marker of ['zero-warning-canonical-logo-a11y-news-v3','public-floating-menu-v[12]','index-live-hub-v1','CANONICAL_ROUTES','public-unified-menu-v6.js','public-contrast-hardening-v1.js'])if(!worker.includes(marker))throw new Error(`Worker normalization marker missing: ${marker}`);

function edgeNormalize(html,route){
 let out=String(html||'');
 out=out.replace(/<script\b[^>]+(?:public-floating-menu-v[12]|index-live-hub-v1)\.js[^>]*><\/script>/gi,'');
 out=out.replace(/<script\b[^>]+public-unified-menu-v6\.js[^>]*><\/script>/gi,'');
 out=out.replace(/<script\b[^>]+public-contrast-hardening-v1\.js[^>]*><\/script>/gi,'');
 out=out.replace(/\b(href|src)=(['"])assets\//gi,(_match,attr,quote)=>`${attr}=${quote}/assets/`);
 out=out.replace(/\bhref=(['"])manifest\.webmanifest\1/gi,'href="/manifest.webmanifest"');
 out=out.replace(/(<img\b[^>]*\bsrc=['"])([^'"]*(?:logo-gnk-asg|logo-gnk-dinamo|logo-gnk-asg-gold|gnk-gold-logo|GNK_ASG_logo_gold_transparent)[^'"]*)(['"][^>]*>)/gi,(_match,start,_src,end)=>`${start}/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64${end}`);
 out=out.replace(/"logo"\s*:\s*"https:\/\/gnk-asg\.hr\/assets\/(?:logo-gnk-asg|logo-gnk-dinamo|logo-gnk-asg-gold|gnk-gold-logo)[^"]*"/gi,'"logo":"https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg"');
 if(/<input\b[^>]*\bid=['"]chatInput['"]/i.test(out)&&!/<input\b[^>]*\bid=['"]chatInput['"][^>]*\baria-label=/i.test(out))out=out.replace(/<input\b([^>]*\bid=['"]chatInput['"][^>]*)>/i,'<input $1 aria-label="GNK ASG Intelligence Desk question">');
 if(/<select\b[^>]*\bid=['"]documentCategory['"]/i.test(out)&&!/<select\b[^>]*\bid=['"]documentCategory['"][^>]*\baria-label=/i.test(out))out=out.replace(/<select\b([^>]*\bid=['"]documentCategory['"][^>]*)>/i,'<select $1 aria-label="Document category">');
 out=out.replace(/1\.536 digitalnih funkcija/gi,'1.573 digitalne funkcije').replace(/1,536 digital functions/gi,'1,573 digital functions');
 out=out.replace(/do 500 najnovijih/gi,'do 100 najnovijih').replace(/najnovijih 500/gi,'najnovijih 100').replace(/up to 500 latest/gi,'up to 100 latest').replace(/latest 500/gi,'latest 100');
 const canonicalHref=EDGE_CANONICAL.get(route);
 if(canonicalHref&&!canonical(out)){const tag=`<link rel="canonical" href="${canonicalHref}">`;out=out.includes('</head>')?out.replace('</head>',`${tag}</head>`):`${tag}${out}`}
 const scripts='<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script><script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>';
 return out.includes('</body>')?out.replace('</body>',`${scripts}</body>`):`${out}${scripts}`;
}

const htmlFiles=walk(ROOT).filter(file=>file.endsWith('.html')&&!utility(file));
const findings=[];
const pages=[];
for(const file of htmlFiles){
 const source=fs.readFileSync(file,'utf8'),route=routeFor(file),html=edgeNormalize(source,route),protectedRoute=isProtected(route),base=baseHref(html),htmlForRefScan=html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi,''),refs=[...extract(htmlForRefScan,'href'),...extract(htmlForRefScan,'src')];
 const broken=[...new Set(refs.filter(ref=>!targetExists(ref,file,base)))];
 const robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';
 const noindex=/noindex/i.test(robots),indexable=!protectedRoute&&!noindex,lang=html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1]||'',canon=canonical(html);
 const unifiedMenuCount=(html.match(/public-unified-menu-v6\.js/g)||[]).length,contrastCount=(html.match(/public-contrast-hardening-v1\.js/g)||[]).length;
 const legacy=[...html.matchAll(/(?:public-floating-menu-v[12]|index-live-hub-v1)\.js/gi)].map(match=>match[0]);
 const page={route,file:posix(path.relative('.',file)),protected:protectedRoute,indexable,noindex,lang,canonical:canon,broken,legacy,unifiedMenuCount,contrastCount};
 pages.push(page);
 if(broken.length)findings.push({severity:'error',code:'BROKEN_LOCAL_REFERENCE',route,file:page.file,value:broken});
 if(legacy.length)findings.push({severity:'error',code:'LEGACY_RUNTIME_REMAINING_AFTER_EDGE_NORMALIZATION',route,file:page.file,value:legacy});
 if(unifiedMenuCount!==1)findings.push({severity:'error',code:'UNIFIED_MENU_COUNT_INVALID',route,file:page.file,value:unifiedMenuCount});
 if(contrastCount!==1)findings.push({severity:'error',code:'CONTRAST_RUNTIME_COUNT_INVALID',route,file:page.file,value:contrastCount});
 if(indexable&&!canon)findings.push({severity:'warning',code:'MISSING_CANONICAL',route,file:page.file});
 if(indexable&&!lang)findings.push({severity:'warning',code:'MISSING_HTML_LANG',route,file:page.file});
 if(protectedRoute&&!noindex)findings.push({severity:'error',code:'PROTECTED_PAGE_MISSING_NOINDEX',route,file:page.file});
}
for(const route of REQUIRED){const target=route==='/'?path.join(ROOT,'index.html'):path.join(ROOT,route.slice(1),'index.html');if(!fs.existsSync(target))findings.push({severity:'error',code:'MISSING_REQUIRED_ROUTE',route,file:posix(path.relative('.',target))})}
for(const asset of REQUIRED_ASSETS)if(!assetFiles.has(asset))findings.push({severity:'error',code:'MISSING_REQUIRED_ASSET',value:asset});
if(!fs.existsSync(MENU_FILE))findings.push({severity:'error',code:'MISSING_UNIFIED_MENU',file:posix(path.relative('.',MENU_FILE))});else{const menu=fs.readFileSync(MENU_FILE,'utf8');for(const marker of ['__GNK_UNIFIED_MENU_V6__','logo-gnk-asg-canonical.svg','ADMIN CENTER','WORKERI I OPERACIJE','/workers/','/admin-login/'])if(!menu.includes(marker))findings.push({severity:'error',code:'UNIFIED_MENU_MARKER_MISSING',value:marker,file:posix(path.relative('.',MENU_FILE))})}
if(!fs.existsSync(CONTRAST_FILE))findings.push({severity:'error',code:'MISSING_CONTRAST_RUNTIME',file:posix(path.relative('.',CONTRAST_FILE))});else if(!fs.readFileSync(CONTRAST_FILE,'utf8').includes('__GNK_CONTRAST_HARDENING_V1__'))findings.push({severity:'error',code:'CONTRAST_RUNTIME_MARKER_MISSING',file:posix(path.relative('.',CONTRAST_FILE))});
const errors=findings.filter(item=>item.severity==='error'),warnings=findings.filter(item=>item.severity==='warning');
const report={version:'PUBLIC_PORTAL_AUDIT_V8_RUNTIME_DIRS_EXCLUDED',generatedAt:new Date().toISOString(),summary:{htmlFiles:htmlFiles.length,pages:pages.length,requiredRoutes:REQUIRED.length,requiredAssets:REQUIRED_ASSETS.length,errors:errors.length,warnings:warnings.length},findings,pages};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));
if(errors.length||warnings.length){for(const item of findings.slice(0,120))console.error(`- ${item.severity} ${item.code} ${item.route||''} ${JSON.stringify(item.value||'')} (${item.file||''})`);process.exit(1)}
