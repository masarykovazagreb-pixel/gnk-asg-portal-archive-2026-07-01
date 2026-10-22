#!/usr/bin/env node
// Executable specialists bound to existing Masarykova Workers.
// Inspections and research packets are NOT deployed Workers or human approvals.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.resolve(ROOT,'artifacts/worker-agent-swarm');
const read=(p,f=null)=>{try{return JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'))}catch{return f}};
const exists=p=>fs.existsSync(path.resolve(ROOT,p));
const text=p=>fs.readFileSync(path.resolve(ROOT,p),'utf8');
const priority={P0:0,P1:1,P2:2,P3:3};
const cfg=read('config/control-plane/worker-agent-swarm-v1.json');
const registry=read('config/control-plane/workforce-bot-registry-v1.json');
const board=read('config/control-plane/workforce-bot-taskboard-v1.json');
const switches=read('ops/automation-kill-switches.json');
if(!cfg||!registry||!board||!switches)throw new Error('Missing governance inputs: fail closed');
if(cfg.primaryRepository!=='masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01')throw new Error('Wrong writer repository');
if(cfg.policy?.writeToMain!==false||cfg.policy?.deploy!==false||cfg.policy?.publishExternally!==false||cfg.policy?.editorialHumanApprovalRequired!==true)throw new Error('Unsafe governance change');

const byBot=new Map((registry.bots||[]).map(b=>[b.botId,b]));
const workers=fs.readdirSync('workers',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();
const agents=cfg.agents||[];
const ids=new Set();
for(const a of agents){
  if(!byBot.has(a.bot))throw new Error('Unregistered parent bot: '+a.bot);
  if(!workers.includes(byBot.get(a.bot).worker))throw new Error('Missing Worker: '+a.bot);
  if(ids.has(a.id))throw new Error('Duplicate agent ID: '+a.id);
  ids.add(a.id);
}
for(const bot of registry.bots||[])if(!agents.some(a=>a.bot===bot.botId))throw new Error('No agent for Worker bot '+bot.botId);
if(workers.length!==(registry.bots||[]).length)throw new Error('Worker directory / registry mismatch');
const out=(id,status,evidence,proposals=[])=>({id,status,evidence,proposals});
const pages=['apps/portal/index.html','apps/portal/en/index.html','apps/portal/gnk-aktual/index.html','apps/portal/objave/index.html','apps/portal/komentari/index.html'];
const htmls=()=>pages.filter(exists).map(file=>({file,html:text(file)}));
const tasksFor=bot=>(board.tasks||[]).filter(t=>t.ownerBot===bot&&t.status!=='done').sort((a,b)=>(priority[a.priority]??9)-(priority[b.priority]??9));
const news=()=>{
  const raw=read('apps/portal/data/news.json',[]);
  return Array.isArray(raw)?raw:(raw?.items||raw?.articles||[]);
};
const sourceClips=(count=6)=>news().filter(x=>x&&typeof(x.title||x.headline)==='string'&&/^https:\/\//.test(x.url||x.link||x.sourceUrl||'')).slice(0,count).map(x=>({
  title:String(x.title||x.headline).slice(0,180),
  url:String(x.url||x.link||x.sourceUrl).slice(0,400),
  source:String(x.source||x.publisher||'unverified').slice(0,100),
  publishedAt:x.publishedAt||x.published_at||null
}));
const actions={
  taskboard(a){
    const tasks=tasksFor(a.bot);
    return out(a.id,'executed',{openTasks:tasks.length,next:tasks.slice(0,3).map(t=>({id:t.id,priority:t.priority,title:t.title,status:t.status}))},tasks.length?[]:['Propose a narrow code or UX improvement based on evidence']);
  },
  'worker-check'(a){
    const worker=byBot.get(a.bot).worker;
    const base='workers/'+worker;
    const src=base+'/src';
    const names=exists(src)?fs.readdirSync(src,{withFileTypes:true}).filter(x=>x.isFile()&&/\.(m?js|cjs)$/.test(x.name)).map(x=>x.name).sort():[];
    const selected=names.filter(n=>/^(index|worker|main)\.(m?js|cjs)$/.test(n)).slice(0,2);
    const syntax=selected.map(name=>{
      const file=src+'/'+name;
      const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:10000});
      return {file,ok:r.status===0,error:r.status===0?null:String(r.stderr||r.error||'syntax failed').slice(0,240)};
    });
    const ok=exists(base+'/wrangler.toml')&&names.length>0&&syntax.every(s=>s.ok);
    return out(a.id,ok?'executed':'needs-fix',{worker,wranglerExists:exists(base+'/wrangler.toml'),sourceFiles:names.length,syntax},ok?[]:['Inspect entry point and Wrangler config; prepare isolated PR']);
  },
  'seo-check'(a){
    const patterns=[['title',/<title[^>]*>\s*[^<]{5,}<\/title>/i],['description',/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i],['canonical',/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i],['og:title',/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i],['og:image',/<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i],['twitter:card',/<meta\b(?=[^>]*\bname=["']twitter:card["'])[^>]*>/i]];
    const sample=htmls().map(({file,html})=>({file,missing:patterns.filter(([,re])=>!re.test(html)).map(([k])=>k)}));
    const defects=sample.filter(x=>x.missing.length);
    return out(a.id,defects.length?'needs-fix':'executed',{sampled:sample.length,defects},defects.map(d=>'Prepare metadata repair PR for '+d.file+': '+d.missing.join(', ')));
  },
  'frontend-check'(a){
    const sample=htmls().map(({file,html})=>({file,language:/<html\b[^>]*\blang=["'][a-z]{2}(-[a-z]{2})?["']/i.test(html),viewport:/<meta\b(?=[^>]*name=["']viewport["'])[^>]*>/i.test(html),h1:/<h1[\s>]/i.test(html),main:/<main[\s>]/i.test(html)}));
    const broken=sample.filter(x=>!x.language||!x.viewport||!x.h1);
    return out(a.id,broken.length?'needs-fix':'executed',{sampled:sample.length,broken},broken.map(x=>'Fix semantics or mobile readiness in '+x.file));
  },
  'image-check'(a){
    let images=0,missingAlt=0,missingLocal=0;
    for(const {html} of htmls())for(const m of html.matchAll(/<img\b[^>]*>/gi)){
      images++;const tag=m[0];
      if(!/\balt\s*=\s*["'][^"']*["']/i.test(tag))missingAlt++;
      const src=tag.match(/\bsrc\s*=\s*["'](\/[a-zA-Z0-9_./-]+)["']/i)?.[1];
      if(src&&!exists('apps/portal'+src)&&!exists('apps/portal'+src+'/index.html'))missingLocal++;
    }
    return out(a.id,missingAlt||missingLocal?'needs-fix':'executed',{sampledPages:htmls().length,images,missingAlt,missingLocal},missingAlt||missingLocal?['Repair broken asset paths and accessible alt text; do not invent personal identity']:[]);
  },
  'links-check'(a){
    const missing=[];let inspected=0;
    for(const {file,html} of htmls())for(const m of html.matchAll(/\bhref\s*=\s*["'](\/[a-zA-Z0-9_./-]+)["']/gi)){
      const h=m[1];if(h.startsWith('//')||h.startsWith('/api/'))continue;
      inspected++;if(inspected>300)break;
      if(!exists('apps/portal'+h)&&!exists('apps/portal'+h+'index.html')&&!exists('apps/portal'+h+'/index.html'))missing.push({file,href:h});
    }
    return out(a.id,missing.length?'needs-fix':'executed',{linksChecked:inspected,missing:missing.slice(0,15)},missing.length?['Investigate missing paths; do not overwrite Worker-served routes blindly']:[]);
  },
  'news-review'(a){
    const raw=news(),clips=sourceClips(80);
    let sourceCount=0;const hosts=new Set();
    for(const s of clips){try{hosts.add(s.source==='unverified'?new URL(s.url).hostname:s.source)}catch{}}
    sourceCount=hosts.size;
    return out(a.id,clips.length?'executed':'needs-fix',{feedItems:raw.length,sourceLinkedSample:clips.length,sourceCount,headlines:clips.slice(0,5),sourceURLsExternallyChecked:false},clips.length?[]:['Review missing source URLs before writing or distributing content']);
  },
  draft(a){
    const clips=sourceClips(3);
    const draft={type:'journalist-research-packet',status:'source-review',writerAgent:a.id,generatedAt:new Date().toISOString(),topic:'AKTUAL MEDIA public-source developments',headlines:clips,editorialApproval:false,sourceURLsVerified:false,publicLive:false,proposedAngle:'Compare developments using primary sources; distinguish facts from opinion. No interviews or quotations are invented.',disclosure:'AI-assisted preparation; substantive human editorial review absent',next:'Independent source verification -> original article -> factual/legal review -> named human editorial signoff'};
    fs.mkdirSync(path.join(OUT,'drafts'),{recursive:true});
    fs.writeFileSync(path.join(OUT,'drafts','AG-JOURNALIST.json'),JSON.stringify(draft,null,2)+'\n');
    return out(a.id,clips.length?'draft-created':'needs-fix',{sourceCount:clips.length,artifact:'drafts/AG-JOURNALIST.json',state:'HOLD',published:false},['Turn packet into original source-verified reporting, then submit to human editor']);
  },
  'source-check'(a){
    const draft=read('artifacts/worker-agent-swarm/drafts/AG-JOURNALIST.json');
    return out(a.id,'review-hold',{draftFound:!!draft,sourceCount:draft?.headlines?.length||0,externalEvidenceVerified:false,humanFactCheck:false},['Verify links, primary source documents, quotes and dates; do not certify from RSS metadata']);
  },
  'editorial-hold'(a){
    const draft=read('artifacts/worker-agent-swarm/drafts/AG-JOURNALIST.json');
    return out(a.id,'review-hold',{draftPresent:!!draft,editorialState:'HOLD',automatedEditorCannotSignForHuman:true,humanApproval:false},['Get substantive review and documented accountability; AI text must follow disclosure policy']);
  },
  'release-gate'(a){
    const channels=Object.fromEntries(Object.entries(switches.channels||{}).map(([key,value])=>[key,value.enabled===true]));
    return out(a.id,'executed',{defaultMode:switches.defaultMode,releaseFenceEnabled:switches.releaseFence?.enabled===true,channels,productionSHA:'unverified',mayDeploy:false},['Check exact SHA deploy and independent live HTTP evidence; merge is not publication']);
  }
};
fs.mkdirSync(OUT,{recursive:true});
const results=[];
for(const a of agents){
  const runner=actions[a.action];if(!runner)throw new Error('Unknown action '+a.action);
  try{
    results.push({...runner(a),parentBot:a.bot,worker:byBot.get(a.bot).worker,role:a.role,action:a.action,assignedTask:tasksFor(a.bot)[0]?.id||null});
  }catch(err){
    results.push({id:a.id,parentBot:a.bot,worker:byBot.get(a.bot).worker,role:a.role,action:a.action,status:'error',evidence:{error:String(err.message||err).slice(0,300)},proposals:['Investigate isolated agent failure']});
  }
}
const summary={agents:results.length,workers:workers.length,executed:results.filter(r=>r.status==='executed').length,needsFix:results.filter(r=>r.status==='needs-fix').length,reviewHolds:results.filter(r=>r.status==='review-hold').length,drafts:results.filter(r=>r.status==='draft-created').length,errors:results.filter(r=>r.status==='error').length};
const now=new Date().toISOString();
const report={version:cfg.version,writerRepository:cfg.primaryRepository,generatedAt:now,controls:{mutations:false,deploy:false,externalPublication:false,automaticHumanApproval:false},summary,results};
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Masarykova — Worker Agent Swarm','', 'Generated: '+now, 'Agents: '+summary.agents+' | Workers: '+summary.workers+' | Executed: '+summary.executed+' | Needs fix: '+summary.needsFix+' | Editorial holds: '+summary.reviewHolds+' | Draft packets: '+summary.drafts+' | Errors: '+summary.errors,'','| Agent | Worker | Task | Status |','|---|---|---|---|'];
for(const r of results)lines.push('| '+r.id+' | '+r.worker+' | '+r.action+' | '+r.status+' |');
lines.push('','No merge, deploy, mail or external publication executed.');
fs.writeFileSync(path.join(OUT,'summary.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({version:report.version,summary,report:'artifacts/worker-agent-swarm/report.json'},null,2));
if(summary.errors)process.exitCode=1;
