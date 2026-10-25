#!/usr/bin/env node
// Workee coordinates deterministic page inspectors, not simulated LLM workers.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const PUBLIC_ROOTS=['apps/portal','apps/region/site','apps/sites/site','apps/world/site','apps/arhiva/site','apps/dnevnik/site','apps/tjednik/site'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
const text=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

export function inspectPage(source,html){
  const id=`PAGE-${hash(source).slice(0,20)}`;
  const tags=[...html.matchAll(/<(?:meta|link|img)\b[^>]*>/gi)].map(m=>({tag:m[0].slice(1).split(/\s/)[0].toLowerCase(),...attrs(m[0])}));
  const meta=name=>tags.find(t=>t.tag==='meta'&&(t.name?.toLowerCase()===name||t.property?.toLowerCase()===name))?.content?.trim();
  const title=text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const canonical=tags.find(t=>t.tag==='link'&&t.rel?.split(/\s+/).includes('canonical'))?.href||null;
  const indexable=!/\bnoindex\b/i.test(meta('robots')||'')&&!/\/(?:__preview|admin|operator|login)(?:\/|\.)/i.test(source);
  const findings=[];
  if(!title)findings.push({code:'title',evidence:'Missing non-empty title',priority:1});
  if(indexable){
    if(!meta('description'))findings.push({code:'description',evidence:'Missing non-empty meta description',priority:1});
    if(!canonical||!/^https:\/\//i.test(canonical))findings.push({code:'canonical',evidence:'Missing absolute HTTPS canonical',priority:1});
    if(!meta('og:image'))findings.push({code:'og-image',evidence:'Missing Open Graph image',priority:2});
    if(!meta('twitter:card'))findings.push({code:'twitter-card',evidence:'Missing Twitter card metadata',priority:2});
  }
  const missingAlt=tags.filter(t=>t.tag==='img'&&!Object.hasOwn(t,'alt')).length;
  if(missingAlt)findings.push({code:'image-alt',evidence:`${missingAlt} image(s) have no alt attribute`,priority:1});
  const label=(title||source).slice(0,180);
  const proposals=findings.map(f=>({id:`${id}:${f.code}`,kind:'repair',priority:f.priority,title:`${label}: ${f.code}`,evidence:f.evidence}));
  const context=`${source} ${label}`;
  const idea=!indexable?'jasnije upute i pristupačnost':/galer|album|foto/i.test(context)?'pretraga fotografija po temi, s autorom i pravima':/financ|bank|market|trži/i.test(context)?'izvori brojki, datumi i objašnjenje promjena':/kanal|region|world/i.test(context)?'lokalna vremenska crta i usporedba izvornih objava':/arhiv|dnevnik|tjednik/i.test(context)?'tematska navigacija između povezanih datuma':/komentar|news|vijest/i.test(context)?'jasno odvojene činjenice, komentar i povezani izvori':'povezani izvori i sljedeća pitanja';
  proposals.push({id:`${id}:development`,kind:'development',priority:3,title:`${label} — ${idea}`,evidence:`Rule-based proposal based on page title and source ${source}; reader demand not verified`,nextStep:'Urednik bira korisno pitanje, provjerava izvore i odobrava zaseban zadatak.'});
  return {id,source,canonical,title,indexable,contentHash:hash(html),status:'inspected-local-source',findings,proposals:proposals.map(p=>({...p,status:'proposed',humanReviewRequired:true,autoPublish:false}))};
}

export function buildReport(root=process.cwd(),roots=PUBLIC_ROOTS){
  const agents=[],missingRoots=[];
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
      const file=path.join(dir,entry.name);
      if(entry.isDirectory())walk(file);
      else if(entry.isFile()&&entry.name.endsWith('.html'))agents.push(inspectPage(path.relative(root,file).split(path.sep).join('/'),fs.readFileSync(file,'utf8')));
    }
  }
  for(const dir of roots){const full=path.join(root,dir);if(fs.existsSync(full))walk(full);else missingRoots.push(dir);}
  const sourceSha=process.env.GITHUB_SHA||null;
  return {version:'WORKEE_PAGE_AGENTS_V1',generatedAt:new Date().toISOString(),sourceSha,
    coordinator:{id:'WORKEE',mode:'deterministic-local-inspection',externalModel:false,liveHealthVerified:false},
    scope:{roots,missingRoots,semantics:'HTML files in available build outputs; not dynamically generated routes or proof of live deployment'},
    governance:{role:'deployer',purpose:'Page quality inspection and editorial development proposals',affectedPeople:'Site readers and editors',sensitiveInputs:false,prohibitedUseScreen:'No manipulation, biometrics, employment or credit decisions',highRiskAssessment:'Technical website maintenance only; reassess if purpose changes',publication:'Existing human editorial and exact-SHA release gates remain required'},
    total:agents.length,proposalCount:agents.reduce((n,a)=>n+a.proposals.length,0),findingCount:agents.reduce((n,a)=>n+a.findings.length,0),agents};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=buildReport();
  const output=path.resolve(process.env.WORKEE_REPORT||'artifacts/workforce-supervisor/page-agents.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ok:report.total>0,coordinator:'WORKEE',pages:report.total,proposals:report.proposalCount,findings:report.findingCount,missingRoots:report.scope.missingRoots,report:output}));
  if(!report.total)process.exitCode=1;
}
