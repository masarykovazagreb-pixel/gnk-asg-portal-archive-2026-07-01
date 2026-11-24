#!/usr/bin/env node
/**
 * AKTUAL MEDIA bounded specialist fleet: executable read-only SEO audits
 * and source-gated editorial assignments, not 20 model instances.
 * No network, no keys, no public writes, no merge or deploy.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>readFileSync(join(ROOT,p),'utf8');
const parse=(p)=>JSON.parse(read(p));
const matches=(html,re)=>re.test(html);
const content=(html,re)=>html.match(re)?.[1]?.trim()||'';
const ORIGIN='https://gnk-asg.hr';
const tags=(html,name)=>[...String(html).matchAll(new RegExp('<'+name+'\\b[^>]*>','gi'))]
  .map(m=>Object.fromEntries([...m[0].matchAll(/([a-z][a-z0-9:-]*)\s*=\s*(["'])(.*?)\2/gi)]
    .map(a=>[a[1].toLowerCase(),a[3]])));
const AUDITS=[
  ['seo-title',(h)=>{const t=content(h,/<title[^>]*>([^<]*)<\/title>/i);return t.length>=20&&t.length<=100?'ok':'review-title-length';}],
  ['seo-description',(h)=>{const d=tags(h,'meta').find(x=>x.name?.toLowerCase()==='description')?.content||'';return d.length>=65&&d.length<=165?'ok':'review-meta-description';}],
  ['canonical',(h,c)=>tags(h,'link').some(x=>x.rel?.toLowerCase()==='canonical'&&x.href===ORIGIN+'/kanal/'+c.id+'/')?'ok':'canonical-mismatch'],
  ['hreflang',(h)=>tags(h,'link').some(x=>x.rel?.toLowerCase()==='alternate'&&x.hreflang)?'ok':'missing-hreflang'],
  ['jsonld',(h)=>tags(h,'script').some(x=>x.type?.toLowerCase()==='application/ld+json')?'ok':'missing-jsonld'],
  ['sitemap',(_h,c,ctx)=>ctx.index.includes(ORIGIN+'/kanal/'+c.id+'/sitemap.xml')?'ok':'missing-channel-sitemap-index'],
  ['robots',(h,_,ctx)=>!tags(h,'meta').some(x=>x.name?.toLowerCase()==='robots'&&/\bnoindex\b/i.test(x.content||''))&&ctx.robots.includes('Sitemap:')?'ok':'robots-review'],
  ['open-graph',(h)=>tags(h,'meta').some(x=>x.property?.toLowerCase()==='og:title')&&tags(h,'meta').some(x=>x.property?.toLowerCase()==='og:url')?'ok':'missing-og-metadata'],
  ['favicon',(h)=>tags(h,'link').some(x=>x.rel?.toLowerCase()==='icon')?'ok':'missing-icon'],
  ['freshness',(h)=>{
    // Either an explicitly marked freshness widget or a visible, dated
    // edition dateline is acceptable metadata. Neither proves source activity.
    if(matches(h,/data-(?:region-)?fresh(?:ness)?/i))return 'ok';
    const dateline=h.match(/<p\b[^>]*class=["'][^"']*\bdateline\b[^"']*["'][^>]*>[\s\S]{0,400}?<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1];
    if(!dateline)return 'missing-visible-update-datetime';
    const date=Date.parse(dateline);
    if(!Number.isFinite(date)||date>Date.now()+300_000)return 'invalid-or-future-update-datetime';
    return Date.now()-date<=72*3600_000?'ok':'stale-update-datetime-over-72h';
  }],
  ['accessibility',(h)=>matches(h,/<html\b[^>]*lang=["'][^"']+["']/i)&&matches(h,/<h1\b/i)?'ok':'missing-language-or-h1']
];
export function evaluateChannel(channel,html,context){
  if(!/^[a-z0-9-]+$/.test(channel?.id||''))throw Error('Unsafe channel identifier');
  const checks=AUDITS.map(([workerId,fn])=>({workerId,result:fn(html,channel,context)}));
  return {channel:channel.id,checks,findings:checks.filter(x=>x.result!=='ok')};
}
/** Metadata-only review. Not independent fact-checking or editorial approval. */
const EDITORIAL_ROLES=['source-discovery','source-independence','fact-evidence','rights-review','original-draft','copy-editor','translation-review','release-readiness','distribution-review'];
export function evaluateEditorialDraft(draft){
  if(!draft || typeof draft!=='object'||!/^DRAFT-[0-9-]+$/.test(draft.id||''))
    throw Error('Invalid editorial draft identifier');
  if(draft.publish!==false||draft.approved!==false||
     draft.status!=='draft_requires_source_review'||draft.publication_url!==null)
    throw Error('Unverified draft must remain unpublished');
  const wordCount=Array.isArray(draft.body)?draft.body.join(' ').trim().split(/\s+/).filter(Boolean).length:0;
  const state={
    'source-discovery':'needs-verified-original-sources',
    'source-independence':'needs-independent-publisher-check',
    'fact-evidence':'needs-primary-and-secondary-evidence',
    'rights-review':draft.image_rights==='not_applicable_no_image'?'no-image-to-license':'needs-image-rights-evidence',
    'original-draft':wordCount>=140&&String(draft.title||'').length>=25?'original-draft-present':'insufficient-draft',
    'copy-editor':'needs-substantive-editorial-review',
    'translation-review':draft.language==='hr'?'no-translation-submitted':'needs-language-review',
    'release-readiness':'blocked-until-full-ci-and-cloudflare-exact-sha',
    'distribution-review':'blocked-until-independent-public-https-proof'
  };
  return {id:draft.id,title:draft.title,words:wordCount,publishable:false,
    checks:EDITORIAL_ROLES.map(workerId=>({workerId,result:state[workerId]}))};
}
export function validateFleet(fleet,channels,ideas,drafts=[]){
  if(fleet.schema_version!=='AKTUAL_WORKER_FLEET_V1')throw Error('Unknown fleet schema');
  if(fleet.execution?.no_new_cron!==true||fleet.execution?.max_ai_model_calls!==0||
    fleet.execution?.write_private_artifact_only!==true||fleet.execution?.max_source_network_requests!==0||
    fleet.governance?.editorial_review_required!==true||fleet.governance?.rights_clearance_required!==true||
    fleet.governance?.full_release_gate_required!==true||fleet.governance?.cloudflare_only!==true)
    throw Error('Fleet safety policy cannot be weakened');
  const roles=fleet.roles||[];
  if(roles.length!==20||new Set(roles.map(r=>r.id)).size!==roles.length||
    roles.some(r=>r.enabled!==true||r.publish!==false||r.deploy!==false||r.merge!==false)||
    AUDITS.some(([id])=>!roles.some(r=>r.id===id&&r.mode==='audit'))||
    EDITORIAL_ROLES.some(id=>!roles.some(r=>r.id===id&&r.mode==='queue')))
    throw Error('Unsafe or incomplete fleet role registry');
  if(!Array.isArray(channels)||channels.length<1||channels.length>fleet.execution.max_channels_per_run||
    new Set(channels.map(c=>c.id)).size!==channels.length)
    throw Error('Channel inventory cannot be processed safely');
  if(!Array.isArray(ideas)||ideas.length<1||new Set(ideas.map(i=>i.id)).size!==ideas.length||
    ideas.some(i=>i.status!=='research_required'||i.publish!==false||!i.title||!i.angle))
    throw Error('Unreviewed editorial ideas cannot enter public publishing');
  if(!Array.isArray(drafts)||new Set(drafts.map(d=>d.id)).size!==drafts.length||
     drafts.some(d=>d.publish!==false||d.approved!==false||d.publication_url!==null))
    throw Error('Unsafe or duplicate unpublished draft');
  return true;
}
export function buildReport({fleet,channels,ideas,drafts=[],pages,index,robots,sha='unverified'}){
  validateFleet(fleet,channels,ideas,drafts);
  const coverage=channels.map(c=>evaluateChannel(c,pages[c.id]||'',{index,robots}));
  const findings=coverage.flatMap(c=>c.findings.map(x=>({channel:c.channel,...x})));
  const editorial=drafts.map(evaluateEditorialDraft);
  const roleSummary=fleet.roles.map(r=>({
    id:r.id,mode:r.mode,enabled:r.enabled,
    inspected:r.mode==='audit'?channels.length:drafts.length,
    findings:r.mode==='audit'?findings.filter(f=>f.workerId===r.id).length:
      editorial.flatMap(e=>e.checks).filter(x=>x.workerId===r.id&&x.result.startsWith('needs-')).length,
    work_state:r.mode==='audit'?'read-only-completed':'metadata-reviewed-no-source-verification'
  }));
  return {
    schema_version:'AKTUAL_WORKER_AUDIT_V1',source_sha:sha,release_status:'NOT_RELEASE_EVIDENCE',
    no_publish:true,no_deploy:true,no_model_execution:true,verified_live_channels:null,
    stated_world201_goal:201,inspected_channels:channels.length,
    audits_executed:channels.length*AUDITS.length,worker_roles:roleSummary.length,
    editorial_ideas_queued:ideas.length,editorial_ideas_publishable:0,
    editorial_drafts_reviewed_metadata:editorial.length,
    editorial_checks_executed:editorial.length*EDITORIAL_ROLES.length,
    editorial_drafts_publishable:0,
    findings,editorial,roles:roleSummary,
    next_action:'Review findings and source evidence in existing editorial workflow; publish only after full CI, Cloudflare exact-SHA release and public HTTPS proof'
  };
}
export function run({writePrivate=false,sha=process.env.SOURCE_SHA||'unverified'}={}){
  const fleet=parse('ops/aktual-worker-fleet-v1.json');
  const channels=parse('apps/region/channels.json').channels;
  const ideas=parse('content/editorial/aktual-ideas-2026-11-23.json').items;
  const drafts=parse('content/editorial/aktual-original-drafts-2026-11-23.json').articles;
  const pages={};
  for(const c of channels){
    const name='apps/portal/kanal/'+c.id+'/index.html';
    pages[c.id]=existsSync(join(ROOT,name))?read(name):'';
  }
  const report=buildReport({fleet,channels,ideas,drafts,pages,
    index:read('apps/portal/sitemap-index.xml'),robots:read('apps/portal/robots.txt'),sha});
  if(writePrivate){
    const dir=resolve(process.env.AGENT_OUT||'');
    const rel=relative(join(ROOT,'artifacts'),dir);
    if(!process.env.AGENT_OUT||rel.startsWith('..')||rel==='..'||rel.startsWith('/')||rel==='') {
      throw Error('Output must be an explicit private artifacts/ subdirectory');
    }
    mkdirSync(dir,{recursive:true});
    writeFileSync(join(dir,'worker-fleet-audit.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  }
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=run({writePrivate:process.argv.includes('--write-private')});
  console.log(JSON.stringify({roles:report.worker_roles,channels:report.inspected_channels,
    audits:report.audits_executed,findings:report.findings.length,
    ideas:report.editorial_ideas_queued,drafts:report.editorial_drafts_reviewed_metadata,
    editorial_checks:report.editorial_checks_executed,published:0,deploy:false,output:process.argv.includes('--write-private')?'private-artifact':'stdout-only'}));
}
