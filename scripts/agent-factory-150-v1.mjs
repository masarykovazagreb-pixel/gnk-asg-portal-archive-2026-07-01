#!/usr/bin/env node
// 150 deterministic, zero-paid-API execution roles. NOT 150 deployed Cloudflare Workers.
// Audits only, writes evidence artifacts. Does not deploy, publish or alter protected repo files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=process.cwd();
const TARGET='artifacts/agent-factory-150';
const SELF=fileURLToPath(import.meta.url);
const read=(p)=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const exists=(p)=>fs.existsSync(path.join(ROOT,p));
const write=(p,value)=>{const file=path.join(ROOT,TARGET,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const safe=(x)=>String(x??'').replace(/\s+/g,' ').trim();
const hasValidUrl=(v)=>{try{const u=new URL(v);return u.protocol==='https:'&&!!u.hostname;}catch{return false}};
const CONTROL=['governance','security','budget','brand-seo','editorial-review','release-proof'];

export function planRoles(regional,world,factory){
 const regionalRoles=factory.regional.roles;
 const worldRoles=factory.world.roles;
 if(regional.length!==8||world.length!==12||regionalRoles.length!==12||worldRoles.length!==4||factory.supervisors.length!==6)throw Error('150-role configuration topology mismatch');
 const agents=[
 ...regional.flatMap(c=>regionalRoles.map(role=>({id:'REG-'+c.id.toUpperCase()+'-'+role,group:'regional',channel:c.id,lang:c.lang,role,publicRoute:c.base}))),
 ...world.flatMap(c=>worldRoles.map(role=>({id:'WORLD-'+c.id.toUpperCase()+'-'+role,group:'world',channel:c.id,lang:c.lang,role,project:c.projectName}))),
 ...factory.supervisors.map(role=>({id:'CTRL-'+role.toUpperCase(),group:'supervisor',role}))
 ];
 const ids=agents.map(x=>x.id);
 if(agents.length!==150||new Set(ids).size!==150||factory.totalAgentRoles!==150)throw Error('150-role unique coverage failed');
 return agents;
}

export function runFactory({root=ROOT,now=new Date()}={}){
 const originalRoot=root;
 const load=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const presence=(p)=>fs.existsSync(path.join(root,p));
 const regional=load('apps/region/channels.json').channels;
 const regionalProfiles=load('config/control-plane/regional-newsroom-agents-v1.json').agents;
 const world=load('config/control-plane/world-free-portal-network-v1.json');
 const factory=load('config/control-plane/agent-factory-150-v1.json');
 const switches=load('ops/automation-kill-switches.json');
 const status=load('apps/region/data/_status.json').lastRun;
 const agents=planRoles(regional,world.sites,factory);
 if(factory.constraints.paidApiCalls!==0||factory.constraints.autoDeploy!==false||world.release.state!=='STAGING_ONLY')throw Error('Free tier/production controls invalid');
 if(world.editor.name!=='Nermin Sefić'||regionalProfiles.length!==regional.length)throw Error('Editorial identity/profile coverage mismatch');
 if(switches?.channels?.regionPublish?.enabled!==true)throw Error('Regional channel kill-switch is off; do not presume writer active');
 const statuses=[];
 const sourcePackets=[];
 const worldPlans=[];
 const add=(agent,result,detail,evidence={})=>statuses.push({...agent,status:result,detail,evidence});
 for(const region of regional){
  const profile=regionalProfiles.find(x=>x.channel===region.id);
  if(!profile||profile.lang!==region.lang)throw Error('Regional language mismatch: '+region.id);
  const file='apps/region/data/'+region.id+'.json';
  const data=load(file),items=data.items||[];
  const htmlPath='apps/portal/kanal/'+region.id+'/index.html';
  const html=presence(htmlPath)?fs.readFileSync(path.join(root,htmlPath),'utf8'):'';
  const healthy=(status.channels?.[region.id]?.sourcesOk)||0;
  const total=(status.channels?.[region.id]?.sourcesTotal)||region.sources.length;
  const current=items[0]||{};
  const sample=items.slice(0,30);
  const invalid=sample.filter(x=>!hasValidUrl(x.url)||!safe(x.title)||!safe(x.sourceName)||!Number.isFinite(Date.parse(x.date))).length;
  const duplicates=sample.length-new Set(sample.map(x=>x.url)).size;
  const unsafe=sample.filter(x=>/^\s*$/.test(x.summary||'')).length;
  const id=role=>agents.find(a=>a.group==='regional'&&a.channel===region.id&&a.role===role);
  add(id('source-health'),healthy===total?'pass':'warn','RSS sources reachable according to last recorded regional run',{healthy,total,failed:status.channels?.[region.id]?.failed||[]});
  const latest=Date.parse(current.date);
  const ageHours=Number.isFinite(latest)?(now.getTime()-latest)/3600000:null;
  add(id('source-freshness'),ageHours!==null&&ageHours>=0&&ageHours<72?'pass':'warn','Freshness of latest source entry; not verification of facts',{latestAt:current.date||null,ageHours});
  add(id('provenance'),invalid===0?'pass':'warn','HTTPS source, title, publisher and dated provenance scan',{inspected:sample.length,invalid});
  add(id('duplicates'),duplicates===0?'pass':'warn','Source URL uniqueness within latest 30 entries',{duplicates,inspected:sample.length});
  add(id('source-claims'),'hold','Machine inspection does not substantiate factual claims',{requiresHumanSourceCheck:true});
  const packet={channel:region.id,language:region.lang,city:region.city,storyCandidates:sample.slice(0,5).filter(x=>hasValidUrl(x.url)).map(x=>({title:safe(x.title),source:safe(x.sourceName),url:x.url,date:x.date,summary:safe(x.summary).slice(0,350)})),publicationStatus:'HOLD',editor:'Nermin Sefić',writer:'regional desk / attribution not assigned'};
  sourcePackets.push(packet);
  add(id('draft-source-packet'),packet.storyCandidates.length?'pass':'warn','Structured candidates collected; no AI-generated article',{candidates:packet.storyCandidates.length,output:'regional-source-packets.json'});
  const langOk=new RegExp('<html[^>]+lang=["\x27]'+region.lang+'(?:-[^"\x27]+)?["\x27]','i').test(html);
  add(id('local-language'),langOk?'pass':'warn','HTML lang matches editorial profile; prose language not linguistically validated',{expected:region.lang,markupMatch:langOk,writerLanguage:profile.promptLanguage});
  const seo={title:/<title>/.test(html),description:/name=["']description["']/.test(html),canonical:/rel=["']canonical["']/.test(html),social:/og:title/.test(html)&&/twitter:card/.test(html)};
  add(id('seo-head'),Object.values(seo).every(Boolean)?'pass':'warn','Static SEO and social graph metadata check',seo);
  const imageRatio=sample.length?sample.filter(x=>x.image&&x.imageAlt).length/sample.length:0;
  add(id('visual-rights'),'hold','Image metadata exists but source reuse/license is not verified',{sampleWithImageAlt:sample.filter(x=>x.image&&x.imageAlt).length,sampleSize:sample.length,imageRatio});
  add(id('cross-links'),html.includes('gnk-asg.hr/gnk-aktual/')?'pass':'warn','Regional edition links back to central AKTUAL MEDIA',{centralLink:html.includes('gnk-asg.hr/gnk-aktual/')});
  add(id('release-preflight'),'hold','Regional publishing is managed by existing guarded region-daily job; 30min non-objection not source review',{noDirectDeploy:true,reviewMinutes:30,deliveryProofNeeded:true});
  add(id('quality-report'),unsafe===0?'pass':'warn','Source abstract presence for recent records',{checked:sample.length,missingAbstracts:unsafe,stored:items.length});
 }
 for(const site of world.sites){
  const htmlPath='apps/world/site/'+site.id+'/index.html';
  const html=presence(htmlPath)?fs.readFileSync(path.join(root,htmlPath),'utf8'):'';
  const id=role=>agents.find(a=>a.group==='world'&&a.channel===site.id&&a.role===role);
  const plan={channel:site.id,country:site.country,lang:site.lang,project:site.projectName,state:'staged-not-deployed',editor:'Nermin Sefić',marketResearch:'original sourced articles required before launch',imagePolicy:'owned/licensed visual needed before launch',distribution:'no cross-post duplicates; deep-link to canonical GNK ASG edition',publicUrl:null};
  worldPlans.push(plan);
  add(id('market-research'),'staged','Market lane with local language and editorial focus; source feeds not verified',{region:site.region,focus:site.focus});
  add(id('local-language-draft'),html.includes('lang="'+site.lang+'"')?'pass':'warn','Native-language briefing rendered; independent news articles not yet written',{lang:site.lang,title:site.title,stagingOnly:true});
  const metadata={description:/name="description"/.test(html),og:/property="og:image"/.test(html),twitter:/name="twitter:card"/.test(html),image:/<img/.test(html),noindex:/name="robots" content="noindex/.test(html)};
  add(id('seo-visual'),Object.values(metadata).every(Boolean)?'pass':'warn','Staging metadata, image credit and noindex fence',metadata);
  add(id('portal-health'),presence(htmlPath)?'staged':'warn','Static staged HTML exists; public DNS, Cloudflare project and live URL unverified',{file:htmlPath,publicUrl:null,freeProvider:'Cloudflare Pages'});
 }
 const supervisor={
  governance:{ok:agents.length===150&&world.sites.length===12,detail:'150 unique roles; 8 regional and 12 world editions'},
  security:{ok:factory.constraints.autoDeploy===false,detail:'No live credentials, secrets or publishing privileges in this engine'},
  budget:{ok:factory.constraints.paidApiCalls===0&&factory.constraints.newScheduledWorkflows===0,detail:'No paid APIs, no additional cron schedule'},
  'brand-seo':{ok:world.brand==='AKTUAL MEDIA',detail:'AKTUAL MEDIA / Aktual mediji; no misleading bylines'},
  'editorial-review':{ok:world.editor.name==='Nermin Sefić'&&world.release.reviewMinutes===30,detail:'30-minute objection tracking is only valid with independent delivery proof; no invented human review'},
  'release-proof':{ok:world.release.hostStatus==='NOT_PROVISIONED',detail:'No live URL claimed; exact production release and HTTP proof required'}
 };
 for(const [role,x] of Object.entries(supervisor))add(agents.find(a=>a.group==='supervisor'&&a.role===role),x.ok?'pass':'warn',x.detail);
 if(statuses.length!==150||statuses.some(x=>!x.id||!x.status))throw Error('Incomplete execution coverage');
 const counts=statuses.reduce((r,x)=>(r[x.status]=(r[x.status]||0)+1,r),{});
 return {version:factory.version,generatedAt:now.toISOString(),canonicalRepository:world.sourceRepository,execution:'actual deterministic evidence checks (not hosted Worker processes)',rolesExecuted:statuses.length,regionalEditions:regional.length,worldPortalsStaged:world.sites.length,paidApiCalls:0,deploys:0,externalPublications:0,publicUrlsVerified:0,summary:counts,statuses,sourcePackets,worldPlans,sourceStatusLastAt:status.at,operatingBoundary:'PR-first; 30m objection only with verifiable delivery and independently satisfied editorial/release gates'};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===SELF;
if(invoked){
 try{const outcome=runFactory();write('report.json',{...outcome,sourcePackets:undefined,worldPlans:undefined});write('regional-source-packets.json',outcome.sourcePackets);write('world-publishing-roadmap.json',outcome.worldPlans);
 const lines=['# GNK ASG · Free-tier 150 agent roles','', '- Executed checks: '+outcome.rolesExecuted+'/150','- Regional desks: 8; world portals staged: 12','- Outcome: '+JSON.stringify(outcome.summary),'- Paid AI/API calls: 0; external publications: 0; verified new public portals: 0','- Last regional cycle: '+outcome.sourceStatusLastAt,'','Stages are not independently hosted Cloudflare Workers. Drafts/claims/images/portal publication require review, permissions and verifiable live checks.'];
 write('summary.md',lines.join('\n')+'\n');console.log(JSON.stringify({executed:outcome.rolesExecuted,counts:outcome.summary,worldPortalsStaged:outcome.worldPortalsStaged}));
 }catch(e){console.error('AGENT FACTORY BLOCKED:',e.message);process.exitCode=1;}
}
