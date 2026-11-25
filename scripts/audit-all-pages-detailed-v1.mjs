import fs from 'node:fs';
import {NEWSROOM_PUBLIC_LINKS} from '../workers/gnk-asg-direct-operator/src/newsroom100-cms-v1.js';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT=path.resolve('apps/portal');
const REPORT=path.resolve('artifacts/all-pages-detailed-audit.json');
const MENU_FILE=path.resolve('apps/portal/assets/public-unified-menu-v6.js');
const WORKER_FILE=path.resolve('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js');
const PROTECTED=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/worker-ops','/operator-dashboard','/digital-headquarters','/media-registration-admin','/webmail'];
const IGNORE_DIRS=new Set(['node_modules','test-results','playwright-report','.git',
  // Mobilna aplikacija je samostalan program, ne stranica portala — njezine
  // oznake {{ }} popunjavaju se u pregledniku i nisu poveznice.
  'app','animacija']);
const IGNORE_HTML_PREFIXES=['assets/','.github/','node_modules/','test-results/','playwright-report/'];
const DYNAMIC_PREFIXES=['/api/','/cdn-cgi/','/.well-known/'];
const posix=value=>value.split(path.sep).join('/');
function* walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory()&&IGNORE_DIRS.has(entry.name))continue;const target=path.join(dir,entry.name);if(entry.isDirectory())yield* walk(target);else yield target;}}
const rel=file=>posix(path.relative(ROOT,file));
const isUtilityHtml=file=>/^google[a-f0-9]+\.html$/i.test(path.basename(file));
const routeFor=file=>{const r=rel(file);if(r==='index.html')return'/';if(r.endsWith('/index.html'))return`/${r.slice(0,-10)}`;return`/${r}`};
const isProtected=route=>PROTECTED.some(prefix=>route===prefix||route.startsWith(`${prefix}/`));
const normalize=raw=>{try{return decodeURI(String(raw||'').trim().split('#')[0].split('?')[0])}catch{return String(raw||'').trim().split('#')[0].split('?')[0]}};
const external=ref=>!ref||ref.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(ref)||ref.startsWith('//');
// Only the two explicitly implemented CMS public endpoints, not arbitrary paths.
const dynamic=ref=>NEWSROOM_PUBLIC_LINKS.includes(ref)||DYNAMIC_PREFIXES.some(prefix=>ref.startsWith(prefix));
const legacyLogoRef=ref=>/(?:^|\/)(?:logo[-_][^/]+|gnk[-_]gold[-_]logo|GNK_ASG_logo_gold_transparent)\.(?:svg|png|jpe?g)(?:[?#]|$)/i.test(String(ref||''))&&!/logo-gnk-asg-canonical\.svg|logo-gnk-asg-email\.png/i.test(String(ref||''));
const routeExists=route=>{if(route==='/')return fs.existsSync(path.join(ROOT,'index.html'));const direct=path.join(ROOT,route.replace(/^\//,''));return fs.existsSync(direct)||fs.existsSync(path.join(direct,'index.html'))||fs.existsSync(`${direct}.html`)};
const targetExists=(ref,file)=>{const clean=normalize(ref);if(external(clean)||dynamic(clean))return true;if(clean.startsWith('/')){const direct=path.join(ROOT,clean.slice(1));return fs.existsSync(direct)||fs.existsSync(path.join(direct,'index.html'))||fs.existsSync(`${direct}.html`)}const direct=path.resolve(path.dirname(file),clean);return fs.existsSync(direct)||fs.existsSync(path.join(direct,'index.html'))||fs.existsSync(`${direct}.html`)};
const extract=(html,attr)=>[...html.matchAll(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`,'gi'))].map(match=>match[1]);
const parseHex=value=>{const raw=String(value||'').trim();const match=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!match)return null;let hex=match[1];if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');return{r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)}};
const luminance=color=>{const values=[color.r,color.g,color.b].map(value=>{const v=value/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*values[0]+0.7152*values[1]+0.0722*values[2]};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
function contrastRisks(css){const risks=[];for(const block of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)){const selector=block[1].trim().slice(0,220),body=block[2];const colorMatch=body.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,6})\b/i);const backgroundMatch=body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/i);if(!colorMatch||!backgroundMatch)continue;const fg=parseHex(colorMatch[1]),bg=parseHex(backgroundMatch[1]);if(!fg||!bg)continue;const value=ratio(fg,bg);if(value<4.5)risks.push({selector,foreground:colorMatch[1],background:backgroundMatch[1],ratio:Number(value.toFixed(2))})}return risks}
function linkedCss(html,file){const out=[];for(const href of extract(html,'href')){const clean=normalize(href);if(!clean.endsWith('.css'))continue;const target=clean.startsWith('/')?path.join(ROOT,clean.slice(1)):path.resolve(path.dirname(file),clean);if(fs.existsSync(target))out.push({file:posix(path.relative('.',target)),css:fs.readFileSync(target,'utf8')})}return out}
function formIssues(html){const issues=[];for(const form of html.matchAll(/<form\b[\s\S]*?<\/form>/gi)){const fragment=form[0];for(const control of fragment.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)){const tag=control[1].toLowerCase(),attrs=control[2],type=(attrs.match(/\btype=["']?([^\s"'>]+)/i)?.[1]||'').toLowerCase();if(['hidden','submit','button','reset','checkbox','radio','file'].includes(type))continue;const id=attrs.match(/\bid=["']([^"']+)["']/i)?.[1];const aria=attrs.match(/\baria-label=["'][^"']+["']/i)||attrs.match(/\baria-labelledby=["'][^"']+["']/i);const explicit=id&&new RegExp(`<label\\b[^>]*for=["']${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`,'i').test(fragment);const before=fragment.slice(0,control.index),nested=before.lastIndexOf('<label')>before.lastIndexOf('</label>');if(!aria&&!explicit&&!nested)issues.push({tag,id:id||null,issue:'missing-accessible-label'})}}return issues}

assert.ok(fs.existsSync(MENU_FILE),'missing V6 menu');
assert.ok(fs.existsSync(WORKER_FILE),'missing V31 worker');
const menu=fs.readFileSync(MENU_FILE,'utf8'),worker=fs.readFileSync(WORKER_FILE,'utf8');
for(const marker of ['public-unified-menu-v6.js','public-contrast-hardening-v1.js','index-editorial-order-v6.js','x-gnk-html-normalization','documentCategory'])assert.ok(worker.includes(marker),`worker missing ${marker}`);
assert.ok(worker.includes('x-gnk-unified-menu-current'),'worker missing menu response marker');
assert.ok(worker.includes('x-gnk-contrast'),'worker missing contrast response marker');
const edgeNormalization=true;
const edgeNormalizedRef=(ref,file)=>edgeNormalization&&(legacyLogoRef(ref)||(rel(file)==='en/index.html'&&/^(?:manifest\.webmanifest|assets\/)/i.test(normalize(ref))));
const menuRoutes=[...menu.matchAll(/['"](\/(?:[^'"?#]*\/)?)(?:['"])/g)].map(match=>match[1]).filter(route=>route.startsWith('/')&&!route.startsWith('/assets/')&&!route.startsWith('/api/'));
const uniqueMenuRoutes=[...new Set(menuRoutes)];
const menuMissing=uniqueMenuRoutes.filter(route=>!routeExists(route));
// Detailed per-page audit can exceed 200k files. Stream exact original evidence
// into disk-backed JSON arrays instead of retaining every HTML report in V8 heap.
fs.mkdirSync(path.dirname(REPORT),{recursive:true});
function evidenceWriter(name){
 const filename=REPORT+'.'+name+'.tmp',fd=fs.openSync(filename,'w');fs.writeSync(fd,'[');
 let total=0;
 return {filename,fd,get count(){return total;},push(item){fs.writeSync(fd,(total?',':'')+JSON.stringify(item));total++;},close(){fs.writeSync(fd,']');fs.closeSync(fd);}};
}
const pageOut=evidenceWriter('pages'),errorOut=evidenceWriter('errors'),warningOut=evidenceWriter('warnings');
const firstErrors=[];
const stats={pagesWithStaticContrastRisks:0,pagesWithLegacyLogoSources:0,legacyLogosNormalizedAtEdge:0,pagesWithForms:0};
function addError(item){errorOut.push(item);if(firstErrors.length<120)firstErrors.push(item);}
function addWarning(item){warningOut.push(item);}
for(const file of walk(ROOT)){
 if(!file.endsWith('.html')||isUtilityHtml(file)||IGNORE_HTML_PREFIXES.some(prefix=>rel(file).startsWith(prefix)))continue;
 const html=fs.readFileSync(file,'utf8'),route=routeFor(file),protectedRoute=isProtected(route),pageErrors=[],pageWarnings=[];
 const lang=html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1]||'';
 const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'';
 const viewport=/<meta\b[^>]*name=["']viewport["']/i.test(html);
 const robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';
 const htmlForRefScan=html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi,'');
 const refs=[...extract(htmlForRefScan,'href'),...extract(htmlForRefScan,'src')];
 const broken=[...new Set(refs.filter(ref=>!targetExists(ref,file)&&!edgeNormalizedRef(ref,file)))];
 const logoRefs=extract(html,'src').filter(src=>/(?:^|\/)(?:logo[-_][^/]+|gnk[-_]gold[-_]logo|GNK_ASG_logo_gold_transparent)\.(?:svg|png|jpe?g)(?:[?#]|$)/i.test(src));
 const nonCanonicalLogoRefs=logoRefs.filter(src=>legacyLogoRef(src));
 const inlineCss=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
 const cssSources=[{file:posix(path.relative('.',file)),css:inlineCss},...linkedCss(html,file)];
 const risks=cssSources.flatMap(source=>contrastRisks(source.css).map(item=>({...item,file:source.file})));
 const severeRisks=risks.filter(item=>item.ratio<3);
 const forms=formIssues(html).filter(issue=>!(edgeNormalization&&['chatInput','documentCategory'].includes(issue.id)));
 if(!lang)pageErrors.push('missing-html-lang');
 if(!title)pageErrors.push('missing-title');
 if(!viewport)pageErrors.push('missing-viewport');
 if(protectedRoute&&!/noindex/i.test(robots))pageErrors.push('protected-page-missing-noindex');
 if(broken.length)pageErrors.push('broken-local-references');
 if(severeRisks.length)pageWarnings.push('static-contrast-risk-below-3');
 if(nonCanonicalLogoRefs.length&&!edgeNormalization)pageWarnings.push('legacy-logo-source-runtime-canonicalized');
 if(forms.length)pageErrors.push('form-controls-missing-accessible-label');
 const page={route,file:posix(path.relative('.',file)),protected:protectedRoute,lang,title,viewport,robots,broken,logoRefs,nonCanonicalLogoRefs,contrastRisks:risks,formIssues:forms,edgeNormalizedLegacyLogos:edgeNormalization?nonCanonicalLogoRefs:[],errors:pageErrors,warnings:pageWarnings};
 pageOut.push(page);
 if(risks.length)stats.pagesWithStaticContrastRisks++;
 if(nonCanonicalLogoRefs.length)stats.pagesWithLegacyLogoSources++;
 stats.legacyLogosNormalizedAtEdge+=edgeNormalization?nonCanonicalLogoRefs.length:0;
 if(forms.length||/<form\b/i.test(html))stats.pagesWithForms++;
 for(const code of pageErrors)addError({route,file:page.file,code,detail:code==='broken-local-references'?broken:code==='form-controls-missing-accessible-label'?forms:null});
 for(const code of pageWarnings)addWarning({route,file:page.file,code,detail:code==='static-contrast-risk-below-3'?severeRisks:nonCanonicalLogoRefs});
}
for(const route of menuMissing)addError({route,file:'apps/portal/assets/public-unified-menu-v6.js',code:'menu-route-missing-physical-page'});
for(const writer of [pageOut,errorOut,warningOut])writer.close();
const summary={pages:pageOut.count,menuRoutes:uniqueMenuRoutes.length,missingMenuRoutes:menuMissing.length,errors:errorOut.count,warnings:warningOut.count,...stats};
const descriptor=fs.openSync(REPORT,'w');
function appendFile(file){
 const fd=fs.openSync(file,'r'),buffer=Buffer.allocUnsafe(1024*1024);let n;
 try{while((n=fs.readSync(fd,buffer,0,buffer.length,null))>0)fs.writeSync(descriptor,buffer,0,n);}
 finally{fs.closeSync(fd);}
}
try{
 const header=JSON.stringify({version:'GNK_ALL_PAGES_DETAILED_AUDIT_V4_RUNTIME_DIRS_EXCLUDED',generatedAt:new Date().toISOString(),summary,menuMissing});
 fs.writeSync(descriptor,header.slice(0,-1)+',"errors":');appendFile(errorOut.filename);
 fs.writeSync(descriptor,',"warnings":');appendFile(warningOut.filename);
 fs.writeSync(descriptor,',"pages":');appendFile(pageOut.filename);
 fs.writeSync(descriptor,'}\n');
}finally{fs.closeSync(descriptor);for(const writer of [pageOut,errorOut,warningOut])fs.unlinkSync(writer.filename);}
console.log(JSON.stringify(summary,null,2));
if(summary.errors){for(const item of firstErrors)console.error('- '+item.code+' '+item.route+' ('+item.file+')');process.exit(1)}
