// GNK ASG — Content Factory queue: objavljuje READY stranice po kalendaru (Europe/Zagreb),
// upisuje ih u editorial-registry + editorial-sitemap, stanje u apps/portal/data/content-queue-state.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { preflightContentQueue } from './content-queue-preflight-v1.mjs';
import { addCommentListing, addAktualLink } from './lib/editorial-visibility-links-v1.mjs';
import { articleAuthorFor, isVerifiedNerminAuthor } from './lib/editorial-attribution-v1.mjs';
import { normalizeEditorialAttributionHtml, extractSocialHashtags } from './lib/editorial-html-attribution-v1.mjs';

const SITE='https://gnk-asg.hr';
const read=(p)=>{if(!existsSync(p))throw new Error('Missing required publication source: '+p);return JSON.parse(readFileSync(p,'utf8'));};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s)};
const CURRENT_NOW=new Date(process.env.ASG_EDITORIAL_NOW||Date.now());
if(!Number.isFinite(CURRENT_NOW.getTime()))throw new Error('Invalid ASG_EDITORIAL_NOW');
const nowZg=()=>{
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb'}).format(CURRENT_NOW);
  const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(CURRENT_NOW);
  return {date,time};
};
const zagrebOffsetFor=date=>{
  const zone=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Zagreb',timeZoneName:'shortOffset'})
    .formatToParts(new Date(date+'T12:00:00Z')).find(p=>p.type==='timeZoneName')?.value;
  const parts=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone||'');
  if(!parts)throw new Error('Cannot determine Zagreb offset for '+date);
  return parts[1]+parts[2].padStart(2,'0')+':'+(parts[3]||'00');
};
const TYPE={kolumne:'kolumna',komentari:'komentar',analize:'analiza',objave:'objava',tematske:'objava'};
const COLL={kolumna:'Kolumne',komentar:'Komentari',analiza:'Analize',objava:'Objave'};
const meta=(html,name)=>{const m=html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`,'i'))||html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`,'i'));return m?m[1]:''};
const hasVisibleNerminByline=html=>/<(?:div|p|span|aside)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|byline|author-box|author-card|article-author)\b[^"']*["'][^>]*>[\s\S]*?nermin\s+sefi[cć][\s\S]*?<\/(?:div|p|span|aside)>/i.test(html);
const COLUMN_INDEXES=['apps/portal/gnk-aktual/kolumne/index.html','apps/portal/en/gnk-aktual/columns/index.html'];
const runNode=(script,args=[])=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
function refreshColumnArchive(){
  const before=new Map(COLUMN_INDEXES.map(file=>[file,readFileSync(file,'utf8')]));
  runNode('scripts/build-aktual-columns-index-v1.mjs',['--write']);
  const changedFiles=COLUMN_INDEXES.filter(file=>readFileSync(file,'utf8')!==before.get(file));
  return {changed:changedFiles.length>0,changedFiles};
}
function materializeColumnCovers(routes,registry){
  if(!routes.length)return;
  runNode('scripts/generate-editorial-cover-assets-v1.mjs');
  const manifest=read('apps/portal/data/editorial-image-manifest.json');
  const coverByPath=new Map((manifest.items||[]).map(item=>[item.path,item]));
  for(const route of routes){
    const cover=coverByPath.get(route);
    const item=registry.items.find(entry=>entry.path===route);
    if(!cover||!item)throw new Error(`${route}: generated cover or published registry entry is missing.`);
    item.image=`${SITE}${cover.image}`;
  }
  const temp=mkdtempSync(join(os.tmpdir(),'gnk-column-route-filter-'));
  const routesFile=join(temp,'routes.json');
  try{
    writeFileSync(routesFile,JSON.stringify(routes,null,2)+'\n');
    runNode('scripts/apply-editorial-publication-completeness-v1.mjs',['--write','--routes-file',routesFile]);
  }finally{
    rmSync(temp,{recursive:true,force:true});
  }
}

// Repair newly published pages with missing thematic covers inside the existing
// fenced single-writer workflow. Do not create a second publisher or bypass CI.
function repairMissingEditorialCovers() {
  const registry=read('apps/portal/data/editorial-registry.json');
  const manifest=read('apps/portal/data/editorial-image-manifest.json');
  const byPath=new Map((manifest.items||[]).map(entry=>[entry.path,entry]));
  const missing=(registry.items||[]).filter(entry=>{
    if(!entry.path||!['komentar','kolumna','analiza','objava'].includes(entry.type))return false;
    if(entry.path.startsWith('/sports-performance-tracking/')||entry.path.startsWith('/banking/'))return false;
    const record=byPath.get(entry.path);
    return !record || !record.image || !existsSync('apps/portal'+record.image);
  }).map(entry=>entry.path);
  if(!missing.length)return {changed:false,repaired:[]};
  console.log('Missing source-linked covers: '+missing.join(', '));
  runNode('scripts/generate-editorial-cover-assets-v1.mjs');
  const after=read('apps/portal/data/editorial-image-manifest.json');
  const repairedByPath=new Map((after.items||[]).map(entry=>[entry.path,entry]));
  for(const route of missing){
    const img=repairedByPath.get(route)?.image;
    if(!img||!existsSync('apps/portal'+img))throw new Error('Generated cover missing for '+route);
  }
  // Only touch newly repaired routes; historical authorship/content stays intact.
  const temp=mkdtempSync(join(os.tmpdir(),'gnk-editorial-cover-repair-'));
  try{
    const routesFile=join(temp,'routes.json');
    writeFileSync(routesFile,JSON.stringify(missing)+'\n');
    runNode('scripts/apply-editorial-publication-completeness-v1.mjs',['--write','--routes-file',routesFile]);
  }finally{rmSync(temp,{recursive:true,force:true});}
  return {changed:true,repaired:missing};
}

const preflight=preflightContentQueue({root:process.cwd(),now:CURRENT_NOW});
if(!preflight.ok)throw new Error('Content queue preflight failed: '+preflight.errors.join('; '));
const queue=read('content/factory-queue/queue.json');
const skipped=new Set(queue.skipped);
const statePath='apps/portal/data/content-queue-state.json';
const state=read(statePath);
const {date,time}=nowZg();
const dueIds=new Set(preflight.checked.map(x=>x.id));
const due=queue.items.filter(x=>dueIds.has(x.id));
console.log(`Zagreb now: ${date} ${time} | due & unpublished: ${due.length} | skipped: ${skipped.size}`);
if(!due.length){
  const archive=refreshColumnArchive();
  const covers=repairMissingEditorialCovers();
  console.log(JSON.stringify({changed:archive.changed||covers.changed,archive,covers,preflight:preflight.version},null,2));
  process.exit(0);
}

const registryPath='apps/portal/data/editorial-registry.json';
const registry=read(registryPath);
const map=new Map((registry.items||[]).filter(x=>x&&x.path).map(x=>[x.path,x]));
const published=[];

for(const it of due){
  const src=`content/factory-queue/${it.category}/${it.slug}.html`;
  if(!existsSync(src)){console.log('MISSING SOURCE',src);continue;}
  let html=readFileSync(src,'utf8');
  const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/i)||[])[1];
  if(!canonical||!canonical.startsWith(SITE)){console.log('BAD CANONICAL',src);continue;}
  const path=canonical.slice(SITE.length);
  const publishedAt=`${it.date}T${it.time}:00${zagrebOffsetFor(it.date)}`;
  const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[,''])[1].replace(/<[^>]+>/g,'').trim();
  const description=meta(html,'description');
  const image=meta(html,'og:image')||`${SITE}/assets/gnk-asg-social-card.png`;
  const lang=(html.match(/<html[^>]+lang="(\w+)"/i)||[,'hr'])[1];
  const type=TYPE[it.category]||'objava';
  const brand=lang==='hr'?['GNKASG','gospodarstvo','poslovanje']:['GNKASG','Business','Leadership'];
  const hasVerifiedSourceByline=it.author==='Nermin Sefić'
    &&it.authorSchemaVerified===true
    &&it.authorAttributionBasis==='visible-editorial-byline-and-person-schema'
    &&hasVisibleNerminByline(html);
  const attributionItem=hasVerifiedSourceByline
    ? it
    : it.author==='GNK ASG Intelligence Desk'
      ? it
      : {...it,author:null,authorSchemaVerified:false,authorAttributionBasis:null};
  const extractedHashtags=extractSocialHashtags(html,attributionItem,brand);
  const attribution=normalizeEditorialAttributionHtml(html,attributionItem);
  html=attribution.html;
  const keywords=meta(html,'keywords').split(',').map(s=>s.trim()).filter(Boolean);
  const hashtags=extractedHashtags;
  if(!html.includes('article:published_time')) html=html.replace('</head>',`<meta property="article:published_time" content="${publishedAt}"></head>`);
  write('apps/portal'+path.replace(/\/$/,'/index.html'),html);
  // Materialize the same verified canonical post in /komentari/ and AKTUAL.
  // This executes only as part of the existing serialized Content Queue publisher.
  // A missing template marker is a release blocker, never a silent skip.
  const visibilityArticle={route:path,type,title,description,image};
  const visibilityDestinations = [
    ...(it.category === 'kolumne' ? [] : [['apps/portal/komentari/index.html', addCommentListing]]),
    ['apps/portal/gnk-aktual/index.html', addAktualLink],
  ];
  for (const [target, updater] of visibilityDestinations) {
    if(!existsSync(target))throw new Error('Missing static editorial destination: '+target);
    const current=readFileSync(target,'utf8');
    const next=updater(current,visibilityArticle);
    if(next.changed)write(target,next.html);
  }
  const author=articleAuthorFor(attributionItem);
  const authorSchemaVerified=isVerifiedNerminAuthor(attributionItem);
  map.set(path,{slug:it.slug,type,collection:COLL[type],path,url:canonical,title,description,keywords,hashtags,image,publishedAt,status:'published',inPlan:true,seoComplete:true,language:lang,author:author?.name||null,authorUrl:authorSchemaVerified?`${SITE}/nermin-sefic/`:null,authorSchemaVerified,authorAttributionBasis:authorSchemaVerified?'visible-editorial-byline-and-person-schema':null});
  state.published[it.id]={path,url:canonical,at:new Date().toISOString()};
  published.push({id:it.id,url:canonical,title,type,category:it.category});
  console.log('PUBLISH',it.id,canonical);
}

registry.items=[...map.values()].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
registry.total=registry.items.length;
registry.generatedAt=new Date().toISOString();
registry.inPlan=registry.items.filter(x=>x.inPlan).length;
registry.outsidePlan=registry.items.filter(x=>!x.inPlan).length;
registry.seoIncomplete=registry.items.filter(x=>!x.seoComplete).length;
registry.byType=registry.items.reduce((a,x)=>(a[x.type||'other']=(a[x.type||'other']||0)+1,a),{});
write(registryPath,JSON.stringify(registry,null,2)+'\n');
write(statePath,JSON.stringify(state,null,2)+'\n');

const smPath='apps/portal/editorial-sitemap.xml';
if(existsSync(smPath)&&published.length){
  let xml=readFileSync(smPath,'utf8');
  for(const p of published){
    if(xml.includes(`<loc>${p.url}</loc>`))continue;
    xml=xml.replace('</urlset>',`  <url><loc>${p.url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>`);
  }
  write(smPath,xml);
}
const newColumnRoutes=published.filter(item=>item.category==='kolumne').map(item=>item.url.slice(SITE.length));
if(newColumnRoutes.length){
  materializeColumnCovers(newColumnRoutes,registry);
  write(registryPath,JSON.stringify(registry,null,2)+'\n');
}
const archive=refreshColumnArchive();
const covers=repairMissingEditorialCovers();
console.log(JSON.stringify({changed:published.length>0||archive.changed||covers.changed,published,columnArchive:archive,covers},null,2));
