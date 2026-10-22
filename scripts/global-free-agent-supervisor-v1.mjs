#!/usr/bin/env node
// 150 zero-cost deterministic agent-role checks; no paid calls and no publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pathAt=p=>path.join(ROOT,p);
const exists=p=>fs.existsSync(pathAt(p));
const read=p=>exists(p)?fs.readFileSync(pathAt(p),'utf8'):'';
const json=p=>JSON.parse(read(p));
const regionalIds=['zagreb','beograd','sarajevo','budimpesta','ljubljana','rim','sofija','bukurest'];
function probe(agent,reg){
 const issues=[];
 const need=(p,label)=>{if(!exists(p))issues.push(label||('missing:'+p))};
 const check=(ok,label)=>{if(!ok)issues.push(label)};
 const site=reg.sites.find(s=>s.id===agent.channel);
 if(agent.scope==='platform'){
  const paths={'orchestrator':'scripts/master-asg-agent-network-v2.mjs','task-scheduler':'.github/workflows/workforce-bot-orchestrator.yml','source-provenance':'docs/EDITORIAL-REVIEW-GATE-V1.md','fact-check':'scripts/check-editorial-prepublication-readiness-v1.mjs','original-journalism':'workers/gnk-asg-ai-newsroom-writer/src/index.js','seo-audit':'apps/region/engine/audit.mjs','metadata-schema':'apps/world-network/engine/build.mjs','social-preview':'apps/portal/assets/izdanja/aktual-media-og.jpg','accessibility':'apps/portal/kanal/zagreb/index.html','performance':'lighthouserc.json','security':'AGENTS.md','uptime':'scripts/master-asg-agent-network-v2.mjs'};
  if(paths[agent.role])need(paths[agent.role]);
  else{
   const tests={'budget-watchdog':reg.policy.paidApis===false&&reg.policy.noNewCosts===true,'language-quality':reg.sites.every(s=>s.lang&&s.locale&&s.description),'editorial-hold':reg.policy.editorialHoldForUnverifiedClaims===true,'release-gate':!reg.policy.externalPublicationEnabled&&!reg.policy.autoApprovalEnabled,'image-rights':reg.policy.originalVisualsOnly===true,'search-indexing':reg.policy.hostnamesAreProposedNotVerified===true,'delivery-evidence':reg.policy.reviewWindowBeginsOnlyAfterVerifiedDelivery===true,'regional-synchronization':exists('apps/region/engine/hub.mjs')&&exists('apps/portal/world-network/index.html')};
   check(tests[agent.role]===true,'central-check:'+agent.role);
  }
 }else if(agent.scope==='regional'&&regionalIds.includes(agent.channel)){
  const src='apps/region/data/'+agent.channel+'.json',route='apps/portal/kanal/'+agent.channel+'/index.html';
  need(src);need(route);
  const html=read(route);
  let data;try{data=json(src)}catch{data=null}
  const tests={'source-monitor':Boolean(data?.sources?.length),'local-research':Boolean(data?.items?.length),'editorial-brief':Boolean(data?.items?.length)&&data.items.every(x=>x.title&&x.url&&x.date),'visual-qa':/assets\/izdanja\/[^"' ]+\.webp/.test(html),'seo-and-links':/rel="canonical"/.test(html)&&/AKTUAL MEDIA/.test(html)&&/Nermin Sefić/.test(html)};
  check(tests[agent.role]===true,'regional-check:'+agent.role);
 }else if(agent.scope==='world'&&site){
  const base='apps/world-network/site/'+site.id+'/',html=read(base+'index.html'),art=read(base+'assets/hero.svg'),status=read(base+'status.json');
  need(base+'index.html');need(base+'assets/hero.svg');need(base+'robots.txt');
  const tests={'source-monitor':site.sourceLinks.length>=2&&site.sourceLinks.every(s=>/^https:\/\//.test(s.url)),'research-desk':site.sourceLinks.every(s=>s.name&&s.url&&!s.url.includes('?utm_')),'original-draft':html.includes('noindex,nofollow')&&html.includes('AKTUAL MEDIA'),'localization-qa':html.includes('lang="'+site.lang+'"')&&Boolean(site.description),'art-direction':art.length>1500&&art.includes('<svg')&&art.includes('EDITORIAL NETWORK'),'seo-and-social':html.includes('og:site_name" content="AKTUAL MEDIA"')&&html.includes('twitter:card')&&html.includes('Nermin Sefić')&&html.includes('GNK ASG')&&html.includes('rel="canonical"'),'review-gate':status.includes('PREVIEW_NOT_DEPLOYED')&&reg.policy.reviewWindowMinutes===30&&reg.policy.autoApprovalEnabled===false};
  check(tests[agent.role]===true,'world-check:'+agent.role);
 }else issues.push('unknown-scope');
 return {id:agent.id,scope:agent.scope,channel:agent.channel||null,role:agent.role,result:issues.length?'HOLD':'PASS',issues};
}
export function run({write=true}={}){
 const reg=json('config/control-plane/global-150-free-network-v1.json');
 if(reg.repo!=='masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01')throw Error('wrong-canonical-repo');
 if(reg.agents.length!==150||reg.sites.length!==15)throw Error('incorrect-agent-count');
 if(reg.policy.paidApis!==false||reg.policy.externalPublicationEnabled!==false)throw Error('free-only-or-publication-guard-off');
 const reports=reg.agents.map(a=>probe(a,reg));
 const passed=reports.filter(x=>x.result==='PASS').length;
 const result={schema:'gnk-asg-free-agent-execution-v1',at:new Date().toISOString(),agentRolesExecuted:reports.length,passed,held:reports.length-passed,worldSitesPrepared:reg.sites.length,publication:'DISABLED_PREVIEW_ONLY',payment:'FREE_ONLY',reports};
 if(write){
  const dest=pathAt('artifacts/global-free-network');fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(dest,'summary.md'),'## AKTUAL MEDIA global free network\n\n- Agent-role checks: '+reports.length+'\n- PASS: '+passed+'\n- HOLD: '+(reports.length-passed)+'\n- World previews: '+reg.sites.length+'\n- Paid API calls: none\n- Public deploy: OFF\n- 30 minute authenticated notification and publication: NOT enabled\n\n'+reports.filter(x=>x.issues.length).slice(0,35).map(x=>'- HOLD '+x.id+': '+x.issues.join(', ')).join('\n')+'\n');
 }
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=run();console.log(JSON.stringify({agentRolesExecuted:result.agentRolesExecuted,passed:result.passed,held:result.held,worldSitesPrepared:result.worldSitesPrepared,publication:result.publication},null,2));if(result.held)process.exitCode=1;
}
