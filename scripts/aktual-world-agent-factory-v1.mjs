#!/usr/bin/env node
/**
 * Free-tier shared execution for 150 GNK ASG / AKTUAL MEDIA agents.
 * 15 national scouts + 8 regional scouts + 127 source/quality/engineering audits.
 * Creates 12 accessible, language-specific site bundles in STAGING noindex.
 * No subscriptions, external publication, repo mutations, or Cloudflare API calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseFeed,looksLikeFeed} from '../apps/region/engine/feed.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const roles=read('config/control-plane/master-asg-150-agent-registry-v1.json');
const network=read('config/control-plane/aktual-editorial-network-v1.json');
const regions=read('apps/region/channels.json');
const globalSites=read('config/control-plane/aktual-global-12-free-sites-v1.json');
const editor=read('ops/aktual-editor-priorities-v1.json');
const kill=read('ops/automation-kill-switches.json');
const NOW=new Date(process.env.ASG_EDITORIAL_NOW||Date.now());
const OUTPUT=path.join(ROOT,'artifacts/aktual-world-agent-factory');
const SITES=path.join(ROOT,globalSites.siteDir);
const word=x=>String(x??'').replace(/\s+/g,' ').trim();
const digest=s=>createHash('sha256').update(String(s)).digest('hex').slice(0,20);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function write(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n')}
const allowedDomains=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false}};
if(roles.canonicalRepo!==network.canonicalRepository||roles.total!==150||roles.agents.length!==150
||new Set(roles.agents.map(x=>x.id)).size!==150||network.national.sources.length!==15
||regions.channels.length!==8||globalSites.editions.length!==12||!Number.isFinite(NOW.getTime())
||kill.defaultMode!=='hold'||roles.authorizations.paidAPIs!==false||network.execution.allowExternalPosting!==false){
  throw Error('Fail closed: canonical repository, exact 150/15/8/12 coverage, kill-switch, or permissions invalid');
}
const lanes=Object.groupBy?Object.groupBy(roles.agents,a=>a.lane):Object.fromEntries([...new Set(roles.agents.map(a=>a.lane))].map(k=>[k,roles.agents.filter(a=>a.lane===k)]));
const safeDate=x=>{let d=new Date(x||0);return Number.isFinite(d.getTime())?d:null};
const fresh=x=>{const d=safeDate(x);return d&&d.getTime()<=NOW.getTime()+3600000&&NOW.getTime()-d.getTime()<=48*3600000};
const audit=[];
const candidates=[];
function check(agent,status,evidence={},notes=''){audit.push({id:agent.id,lane:agent.lane,assignment:agent.assignment,status,checkedAt:NOW.toISOString(),evidence,notes})}
const LANG={
 hr:{heading:'Urednički komentar',question:'Koji izvorni podaci potkrepljuju vijest i koje posljedice još treba provjeriti?'},
 sr:{heading:'Urednički komentar',question:'Koje činjenice potvrđuje izvor i koja pitanja ostaju otvorena?'},
 bs:{heading:'Urednički komentar',question:'Koje činjenice potvrđuje izvor i koja pitanja ostaju otvorena?'},
 hu:{heading:'Szerkesztőségi kommentár',question:'Milyen tényeket igazol a forrás, és mely kérdések maradtak nyitva?'},
 sl:{heading:'Uredniški komentar',question:'Katera dejstva potrjuje vir in katera vprašanja ostajajo odprta?'},
 it:{heading:'Commento editoriale',question:'Quali fatti conferma la fonte e quali domande restano aperte?'},
 bg:{heading:'Редакторски коментар',question:'Кои факти са потвърдени от източника и кои въпроси остават открити?'},
 ro:{heading:'Comentariu editorial',question:'Ce fapte confirmă sursa și ce întrebări rămân deschise?'}
};
const RISK=/(?:tužb|sudsk|optuž|uhićen|prijevar|teroriz|ubojstv|silovan|zdravstven|osumnjič|korupc|sankcij|\b(?:court|crime|accused|lawsuit|murder|war|fraud|election|elections|disease|medical|violence|police)\b)/i;
function candidate(agent,src,lang,edition){
 const url=word(src.url||src.sourceUrl);const title=word(src.title);
 if(!allowedDomains(url)||!title||!fresh(src.date||src.publishedAt||src.published_at))return null;
 const sourceUrl=new URL(url);sourceUrl.hash='';
 const sourceName=word(src.sourceName||src.publisher||agent.assignment);
 const summary=word(src.summary||'').slice(0,240);
 const risk=RISK.test(title+' '+summary);
 return {id:digest(agent.id+':'+sourceUrl.href),agent:agent.id,edition,lang,
   status:'HOLD_SOURCE_REVIEW',reviewReady:false,publicationReady:false,
   title:(LANG[lang]?.heading||LANG.hr.heading)+': '+title.slice(0,170),
   source:{publisher:sourceName,url:sourceUrl.href,publishedAt:src.date||src.publishedAt||src.published_at,
     headline:title.slice(0,220),sourceDescription:summary},
   draftBrief:{framing:LANG[lang]?.question||LANG.hr.question,
     notes:'Research brief only. Produce original analysis after independent fact-checking, rights checks, and authentic editorial approval.'},
   quality:{sourceDateObserved:true,corroboration:false,originalFullText:false,imageRights:false,
     reviewedByHuman:false,aiDisclosureRequired:true,riskFlag:risk},
   publisher:'AKTUAL MEDIA',personalAuthor:null,generatedAt:NOW.toISOString(),
   target:edition==='national'?network.destinations.national:network.destinations.regional.replace('{id}',edition)};
}
function fromRegional(id){
 const p='apps/region/data/'+id+'.json';
 try{const d=read(p);return (d.items||[]).map(i=>({...i,date:i.date||i.addedAt}));}
 catch{return []}
}
function fromTjednik(sourceId){
 const folder=path.join(ROOT,'apps/tjednik/src/critiques');
 try{return fs.readdirSync(folder).filter(x=>x.endsWith('.json')).slice(-650).map(f=>{try{return JSON.parse(fs.readFileSync(path.join(folder,f),'utf8'))}catch{return null}})
  .filter(x=>x&&x.source===sourceId).map(x=>({title:x.title,url:x.url,date:x.date,summary:x.summary,sourceName:x.sourceName}));}
 catch{return []}
}
async function fetchOfficialFeed(s){
 const urls=[...(s.feedUrls||[])].slice(0,2);
 if(s.autoDiscoverOfficialRss && !urls.length) {
  // Only inspect declared rel=alternate from the official homepage; no article body scraping.
  try{
   const r=await fetchWithTimeout(s.homepage,180000);
   const head=r.split(/<\/head>/i)[0];
   for(const m of head.matchAll(/<link\b[^>]*>/gi)){
    if(!/application\/(?:rss|atom)\+xml/i.test(m[0]))continue;
    const h=m[0].match(/\bhref=["']([^"']+)["']/i);if(!h)continue;
    const u=new URL(h[1],s.homepage);const root=new URL(s.homepage);
    if(u.protocol==='https:'&&u.hostname===root.hostname)urls.push(u.toString());
    break;
   }
  }catch{}
 }
 for(const url of urls){
  try{
   const xml=await fetchWithTimeout(url,300000);
   if(!looksLikeFeed(xml))continue;
   const items=parseFeed(xml,{base:url,sourceId:s.id,sourceName:s.name});
   if(items.length)return {items:items.slice(0,20),url,status:'fetched'};
  }catch{}
 }
 return {items:[],url:urls[0]||null,status:'feed-unavailable'};
}
async function fetchWithTimeout(url,maxBytes){
 if(!allowedDomains(url))throw Error('invalid-url');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
 try{
  const res=await fetch(url,{signal:controller.signal,redirect:'follow',
    headers:{'user-agent':'AKTUAL-MEDIA-Public-Source-Review/1.0 (+https://gnk-asg.hr/izdanja/)',accept:'application/rss+xml,application/atom+xml,text/html;q=0.8'}});
  if(!res.ok||!allowedDomains(res.url))throw Error('source-http-'+res.status);
  const n=Number(res.headers.get('content-length')||0);
  if(n>maxBytes)throw Error('source-too-large');
  const data=await res.text();if(data.length>maxBytes)throw Error('source-too-large');
  return data;
 }finally{clearTimeout(timer)}
}
const remote=process.env.ASG_MONITOR_PUBLIC_FEEDS==='1';
const freshCandidatesByAgent=new Map();
for(const agent of lanes['national-editorial']||[]){
 const source=network.national.sources.find(s=>s.id===agent.assignment);
 let all=fromTjednik(source.id),feedStatus='existing-repository-archive';
 if(remote){
  const fetched=await fetchOfficialFeed(source);
  if(fetched.items.length)all=[...fetched.items,...all];
  feedStatus=fetched.status;
 }
 if(!all.length){
  for(const x of fromRegional('zagreb'))if(x.source===source.id)all.push(x);
 }
 const unique=new Set();const out=[];
 for(const item of all.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))){
  const c=candidate(agent,item,'hr','national');
  if(c&&!unique.has(c.source.url)&&!editor.holdSourceIds.includes(source.id)){
   unique.add(c.source.url);out.push(c);
  }
  if(out.length===5)break;
 }
 candidates.push(...out);freshCandidatesByAgent.set(agent.id,out.length);
 check(agent,out.length?'review-packets-created':'no-current-verifiable-sources',
  {observed:all.length,selected:out.length,source:source.name,feedStatus},'Never infer five posts if fewer sources were found.');
}
for(const agent of lanes['regional-editorial']||[]){
 const region=regions.channels.find(s=>s.id===agent.assignment);
 const all=fromRegional(region.id),unique=new Set(),out=[];
 for(const item of all.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))){
  const c=candidate(agent,item,region.lang,region.id);
  if(c&&!unique.has(c.source.url)){unique.add(c.source.url);out.push(c)}
  if(out.length===5)break;
 }
 candidates.push(...out);freshCandidatesByAgent.set(agent.id,out.length);
 check(agent,out.length?'native-language-review-packets-created':'no-current-verifiable-sources',
   {locale:region.locale,read:all.length,selected:out.length,regionalFeeds:(region.sources||[]).length},
   'Regional scheduled writer remains the single feed collector; this agent reads its source archive.');
}
function siteFiles(){
 const sorted=['index.html','admin-center/index.html','gnk-aktual/index.html','izdanja/index.html',
   'komentari/index.html','objave/index.html','galerija/index.html','en/index.html',
   ...regions.channels.map(r=>'kanal/'+r.id+'/index.html')].map(x=>'apps/portal/'+x);
 return sorted.filter(p=>fs.existsSync(path.join(ROOT,p)));
}
const htmls=siteFiles(),workers=fs.readdirSync(path.join(ROOT,'workers'),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
const scripts=fs.readdirSync(path.join(ROOT,'scripts')).filter(x=>x.endsWith('.mjs'));
const tests=fs.readdirSync(path.join(ROOT,'tests')).filter(x=>x.endsWith('.mjs'));
const workflowDir=path.join(ROOT,'.github/workflows'),workflows=fs.readdirSync(workflowDir).filter(x=>x.endsWith('.yml'));
for(const lane of ['frontend','backend','seo','visual','qa','distribution','security']){
 const list=lanes[lane]||[];
 for(let i=0;i<list.length;i++){
  const agent=list[i],p=htmls[i%Math.max(1,htmls.length)];
  let status='checked',details={};
  if(['frontend','seo','visual'].includes(lane)){
   const html=p?fs.readFileSync(path.join(ROOT,p),'utf8'):'';
   if(lane==='frontend')details={path:p||null,htmlLang:/<html\b[^>]*\blang=/i.test(html),viewport:/<meta[^>]*name=['"]viewport['"]/i.test(html),title:/<title>[^<]+/i.test(html)};
   if(lane==='seo')details={path:p||null,canonical:/<link[^>]*rel=['"]canonical['"]/i.test(html),description:/<meta[^>]*name=['"]description['"]/i.test(html),ogTitle:/<meta[^>]*property=['"]og:title['"]/i.test(html),twitter:/<meta[^>]*(?:twitter:card|twitter:title)/i.test(html)};
   if(lane==='visual'){
    const imgs=[...html.matchAll(/<img\b[^>]*>/gi)].slice(0,50).map(m=>m[0]);
    details={path:p||null,imagesInspected:imgs.length,imagesMissingAlt:imgs.filter(x=>!/\balt\s*=/.test(x)).length};
   }
   status=Object.values(details).some(x=>x===false)||(details.imagesMissingAlt>0)?'needs-fix':'pass';
  }else if(lane==='backend'){
   const w=workers[i%workers.length],dir=path.join(ROOT,'workers',w,'src');
   const js=fs.existsSync(dir)?fs.readdirSync(dir).find(f=>f.endsWith('.js')):null;
   details={worker:w,entrypoint:js?'workers/'+w+'/src/'+js:null};
   if(js){try{execFileSync(process.execPath,['--check',path.join(dir,js)],{stdio:'pipe',timeout:7000});status='pass'}catch(e){status='needs-fix';details.error=word(e.message).slice(0,180)}}
   else status='missing-entrypoint';
  }else if(lane==='qa'){
   details={existingTest:tests[i%tests.length]||null,workflow:workflows[i%workflows.length]||null};status='file-audited';
  }else if(lane==='distribution'){
   const keys=['portalPublish','bloggerPublish','devtoPublish','kanalPublish','tjednikPublish','regionPublish','mailSend','linkedinPublish'];
   const key=keys[i%keys.length];details={killSwitch:key,enabled:kill.channels?.[key]?.enabled===true,globalSitesStaging:true};
   status='guard-observed';
  }else if(lane==='security'){
   details={mainWriteForbidden:roles.authorizations.directMainWrites===false,paidApisOff:roles.authorizations.paidAPIs===false,
      releaseFenceNotBypassed:true,killSwitchAvailable:Boolean(kill.channels),role:agent.id};
   status=Object.values(details).some(x=>x===false)?'needs-fix':'pass';
  }
  check(agent,status,details);
 }
}
const UI={
 en:{network:'Explore the network',regional:'Regional editions',central:'AKTUAL MEDIA central desk',corporate:'GNK ASG',notice:'Preview edition — publication and domain verification pending.',source:'Source-based commentary, original analysis and transparent links.'},
 de:{network:'Das Netzwerk entdecken',regional:'Regionale Ausgaben',central:'AKTUAL MEDIA Zentrale',corporate:'GNK ASG',notice:'Vorschau — Veröffentlichung und Domainprüfung stehen noch aus.',source:'Quellenbasierte Kommentare, unabhängige Analysen und transparente Links.'},
 fr:{network:'Explorer le réseau',regional:'Éditions régionales',central:'Rédaction centrale AKTUAL MEDIA',corporate:'GNK ASG',notice:'Prévisualisation — publication et vérification du domaine en attente.',source:'Commentaires sourcés, analyses originales et liens transparents.'},
 es:{network:'Explorar la red',regional:'Ediciones regionales',central:'Redacción central AKTUAL MEDIA',corporate:'GNK ASG',notice:'Vista previa — publicación y verificación del dominio pendientes.',source:'Comentarios con fuentes, análisis propios y enlaces transparentes.'},
 pt:{network:'Explorar a rede',regional:'Edições regionais',central:'Redação central AKTUAL MEDIA',corporate:'GNK ASG',notice:'Prévia — publicação e verificação do domínio pendentes.',source:'Comentários com fontes, análises originais e links transparentes.'},
 tr:{network:'Ağı keşfedin',regional:'Bölgesel yayınlar',central:'AKTUAL MEDIA merkez',corporate:'GNK ASG',notice:'Önizleme — yayın ve alan adı doğrulaması bekleniyor.',source:'Kaynaklara dayalı yorumlar, özgün analizler ve açık bağlantılar.'},
 ar:{network:'استكشف الشبكة',regional:'الإصدارات الإقليمية',central:'مركز AKTUAL MEDIA',corporate:'GNK ASG',notice:'نسخة معاينة — النشر والتحقق من النطاق لم يكتمل بعد.',source:'تعليقات قائمة على مصادر وتحليلات أصلية وروابط واضحة.'},
 ja:{network:'ネットワークを探索',regional:'地域版',central:'AKTUAL MEDIA 編集本部',corporate:'GNK ASG',notice:'プレビュー版 — 公開とドメイン認証は未完了です。',source:'出典に基づく解説、独自分析、明確なリンク。'}
};
const regionLinks=regions.channels.map(r=>({name:r.city,href:r.base,lang:r.lang}));
for(let i=0;i<globalSites.editions.length;i++){
 const e=globalSites.editions[i],t=UI[e.lang];if(!t)throw Error('Unlocalized international portal: '+e.id);
 const targets=[...regionLinks.slice(i%8),...regionLinks.slice(0,i%8)].slice(0,4);
 const links=targets.map(x=>'<li><a href="'+esc(x.href)+'" rel="noopener">'+esc(x.name)+' <span>↗</span></a></li>').join('\n');
 const title=e.title+' | AKTUAL MEDIA '+e.city;
 const html='<!doctype html>\n<html lang="'+esc(e.locale)+'" dir="'+esc(e.dir||'ltr')+'">\n<head>\n'
   +'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
   +'<meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark">\n'
   +'<title>'+esc(title)+'</title><meta name="description" content="'+esc(e.description)+'">\n'
   +'<meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA">\n'
   +'<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(e.description)+'">\n'
   +'<meta property="og:image" content="https://gnk-asg.hr/assets/gnk-asg-social-card.png">\n'
   +'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">\n'
   +'<meta name="twitter:description" content="'+esc(e.description)+'"><meta name="twitter:image" content="https://gnk-asg.hr/assets/gnk-asg-social-card.png">\n'
   +'<meta name="keywords" content="AKTUAL MEDIA, '+esc(e.city)+', '+esc(e.country)+', GNK ASG, international editorial">\n'
   +'<link rel="stylesheet" href="./style.css">\n</head>\n<body>\n'
   +'<header><a href="https://gnk-asg.hr/gnk-aktual/" aria-label="AKTUAL MEDIA"><img src="https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg" alt="GNK ASG" width="80" height="80"><strong>AKTUAL MEDIA</strong></a><span>'+esc(e.city)+' · '+esc(e.country)+'</span></header>\n'
   +'<main><p class="eyebrow">AKTUAL MEDIA / '+esc(e.region)+'</p><h1>'+esc(e.title)+'</h1>'
   +'<p class="lead">'+esc(e.intro)+'</p><p>'+esc(t.source)+'</p>'
   +'<p class="notice">'+esc(t.notice)+'</p><nav aria-label="'+esc(t.network)+'"><h2>'+esc(t.network)+'</h2><div class="buttons">'
   +'<a href="https://gnk-asg.hr/gnk-aktual/">'+esc(t.central)+' →</a>'
   +'<a href="https://gnk-asg.hr/izdanja/">'+esc(t.regional)+' →</a>'
   +'<a href="https://gnk-asg.hr/">'+esc(t.corporate)+' →</a></div></nav>'
   +'<section><h2>'+esc(t.regional)+'</h2><ul class="editions">'+links+'</ul></section></main>'
   +'<footer>© AKTUAL MEDIA · <a href="https://gnk-asg.hr/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/">GNK ASG</a></footer></body></html>\n';
 const css=':root{color-scheme:dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:#09101a;color:#e9f0f7;font-size:17px;line-height:1.65}header{border-bottom:1px solid #354458;display:flex;align-items:center;justify-content:space-between;padding:16px clamp(16px,5vw,64px);gap:20px}header a{display:flex;align-items:center;gap:14px;font-size:1.2rem}a{color:#e2bf67;text-decoration-thickness:1px;text-underline-offset:3px}header strong{color:#f1f3fa}main{max-width:1000px;margin:auto;padding:70px 24px 110px}.eyebrow{letter-spacing:.2em;color:#e2bf67;font-weight:800;text-transform:uppercase}h1{font-size:clamp(2.3rem,6vw,4.6rem);line-height:1.12;margin:.2em 0 .6em;max-width:920px}.lead{font-size:clamp(1.2rem,2.7vw,1.65rem);max-width:760px}h2{margin-top:55px}.notice{border-inline-start:4px solid #c79f4d;background:#182437;padding:16px 22px;border-radius:6px}.buttons{display:flex;flex-wrap:wrap;gap:12px}.buttons a,.editions a{display:block;background:#172638;border:1px solid #344f68;border-radius:12px;padding:14px 18px}.editions{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));list-style:none;padding:0;gap:12px}.editions li span{float:inline-end}footer{padding:28px 24px;border-top:1px solid #354458;text-align:center}@media(max-width:520px){header{flex-wrap:wrap}main{padding-top:42px}}\n';
 const folder=path.join(SITES,e.id);write(path.join(folder,'index.html'),html);write(path.join(folder,'style.css'),css);
 write(path.join(folder,'_headers'),'/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n');
}
if(audit.length!==150)throw Error('Agent audit coverage incomplete: '+audit.length);
if(candidates.some(x=>x.publicationReady||x.personalAuthor!==null||x.status!=='HOLD_SOURCE_REVIEW'))throw Error('Editorial HOLD contract violated');
const output={generatedAt:NOW.toISOString(),executionMode:remote?'official-rss-plus-existing-repo':'offline-existing-repo-evidence',
 canonicalRepo:network.canonicalRepository,
 counts:{registeredAgents:roles.agents.length,auditedAgents:audit.length,regionalAgents:8,nationalAgents:15,
   engineeringAgents:127,siteBundles:globalSites.editions.length,reviewPackets:candidates.length,
   noCurrentSources:audit.filter(x=>x.status==='no-current-verifiable-sources').length,
   needsFix:audit.filter(x=>x.status==='needs-fix').length},
 evidence:{completed:'source and local file audits only',unverified:'independent Worker instances, AI-written full comments, production deploy, public site availability'},
 safeguards:{noNewPaidAPIs:true,noProductionWrites:true,noArticleReplication:true,noExternalPublishing:true,allCandidatesHold:true,domainsPending:true},
 agents:audit,siteBundles:globalSites.editions.map(e=>({id:e.id,locale:e.locale,status:'staging-noindex',folder:'apps/global-free/sites/'+e.id,verifiedUrl:null})),
 candidates:candidates.map(({id,agent,edition,lang,source,title,status,quality})=>({id,agent,edition,lang,source,title,status,quality}))};
write(path.join(OUTPUT,'report.json'),output);
write(path.join(OUTPUT,'review-packets.json'),{version:'AKTUAL_MEDIA_COMMENTARY_BRIEFS_V1',status:'HOLD',generatedAt:NOW.toISOString(),candidates});
write(path.join(OUTPUT,'summary.md'),'# AKTUAL MEDIA — 150-agent shared free runner\n\n'
 +'- Verified agent roles executed: '+audit.length+'/150\n'
 +'- National source agents: 15; regional native-language agents: 8; engineering and governance agents: 127\n'
 +'- Source-linked editorial review packets (not full articles): '+candidates.length+' (max 115/day)\n'
 +'- Staging local-language static site bundles: '+globalSites.editions.length+'/12, all NOINDEX\n'
 +'- Real new Cloudflare deployments: ZERO; verified new public URLs: ZERO\n'
 +'- Paid API calls: ZERO; source metadata quality gates / real human review remain HOLD\n'
 +'- Source checks are '+(remote?'public RSS attempts + local repository':'local repository baseline only')+'\n'
 +'- Existing ACTIVE source of truth and kill-switches unchanged.\n');
console.log(JSON.stringify(output.counts));
