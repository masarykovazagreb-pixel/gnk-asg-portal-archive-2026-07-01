#!/usr/bin/env node
// AKTUAL MEDIA: free-only publisher and city research agents. No publishing side effects.
// 23 source desks perform 150+ real source/route/quality checks in one low-cost CI run.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseFeed, looksLikeFeed } from '../apps/region/engine/feed.mjs';

const ROOT=process.cwd(),OUT=path.join(ROOT,'artifacts/aktual-editorial-network');
const EXPECTED_REPO='masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01';
const now=new Date(process.env.ASG_EDITORIAL_NOW||Date.now());
function read(p){return JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'))}
function exists(p){return fs.existsSync(path.join(ROOT,p))}
function write(p,data){const full=path.join(OUT,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(data,null,2)+'\n')}
function safeUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
function isoAge(s){const t=Date.parse(String(s||''));return Number.isFinite(t)?(now.getTime()-t)/3600000:Infinity}
function digest(v){return createHash('sha256').update(String(v)).digest('hex').slice(0,24)}
const config=read('config/control-plane/aktual-editorial-network-v1.json');
const region=read(config.regional.registry);
const history=read('apps/region/data/_status.json');
const control=read('ops/automation-kill-switches.json');
if(!Number.isFinite(now.getTime())||config.canonicalRepository!==EXPECTED_REPO)throw Error('Wrong time or canonical repository');
if(config.budget.maxAICallsPerRun!==0||config.execution.allowExternalPosting!==false||config.execution.allowDirectMainWrites!==false||config.execution.allowProdDeploy!==false||config.noExtraCloudflareWorkers!==true)throw Error('Free-only and no-mutation safety policy must remain enabled');
if(!Array.isArray(config.national.sources)||config.national.sources.length!==15)throw Error('Expected 15 national source desks');
if(!Array.isArray(region.channels)||region.channels.length!==8||!Array.isArray(config.regional.expected))throw Error('Expected 8 regional source desks');
if(control?.channels?.regionPublish?.enabled!==true)throw Error('Regional workflow disabled: no news release assumptions');
const seenAgent=new Set(),tasks=[],desks=[],packets=[],usedSourceLinks=new Set();
const task=(desk,id,ok,detail,missingIsWarning=false)=>{
 const key=desk+':'+id;
 if(tasks.some(t=>t.id===key))throw Error('Duplicate micro-agent check '+key);
 const state=ok?'pass':missingIsWarning?'warning':'fail';
 tasks.push({id:key,desk,check:id,state,detail:String(detail??'').slice(0,200)});
};
function register(d){if(seenAgent.has(d.id))throw Error('Duplicate desk '+d.id);seenAgent.add(d.id);desks.push(d)}
const languagePrompt={
 hr:'Koji je lokalni gospodarski i društveni kontekst koji izvor ne objašnjava?',
 sr:'Koji lokalni ekonomski i društveni kontekst nedostaje izvoru?',
 bs:'Koji lokalni ekonomski i društveni kontekst nedostaje izvoru?',
 hu:'Mi az a helyi gazdasági és társadalmi összefüggés, amelyet a forrás nem mutat be?',
 sl:'Kateri lokalni gospodarski in družbeni kontekst v viru manjka?',
 it:'Quale contesto economico e sociale locale manca nella fonte?',
 bg:'Какъв местен икономически и обществен контекст липсва в източника?',
 ro:'Ce context economic și social local lipsește din sursa citată?'
};
const langs=new Set(Object.keys(languagePrompt));
for(const channel of region.channels){
 const desk='REG-'+channel.id.toUpperCase();
 register({id:desk,kind:'regional',sourceRegistry:config.regional.registry,language:channel.lang,city:channel.city,route:channel.base,sourceCount:channel.sources.length,mode:'local-source-provenance-and-HOLD'});
 task(desk,'registry-id',config.regional.expected.includes(channel.id),channel.id);
 task(desk,'native-language',langs.has(channel.lang),channel.lang);
 task(desk,'language-is-specific',channel.lang!=='en',channel.lang);
 task(desk,'official-canonical-url',safeUrl(channel.base)&&channel.base==='https://gnk-asg.hr/kanal/'+channel.id+'/',channel.base);
 task(desk,'brand',/^AKTUAL MEDIA/i.test(channel.title||''),channel.title);
 task(desk,'timezone',Boolean(channel.timezone),channel.timezone);
 task(desk,'source-count',channel.sources.length>=4,channel.sources.length);
 task(desk,'published-route-file',exists('apps/portal/kanal/'+channel.id+'/index.html'),'apps/portal/kanal/'+channel.id+'/index.html');
 task(desk,'archive-json',exists('apps/region/data/'+channel.id+'.json'),channel.id);
 task(desk,'editorial-source-license',config.execution.allowUnlicensedFullText===false,'source title/excerpt only');
 const status=history?.lastRun?.channels?.[channel.id];
 task(desk,'feed-health-record',Boolean(status),status?JSON.stringify({ok:status.sourcesOk,total:status.sourcesTotal}):'not observed',true);
 const lastRunAge=isoAge(history?.lastRun?.at);
 task(desk,'feed-last-run-age',lastRunAge<=72,Math.round(lastRunAge)+' hours',true);
 const sourceNames=new Set();
 for(const source of channel.sources){
  const s=source.id||'unknown';
  const srcId='source-'+s;
  task(desk,srcId+'-id',Boolean(s)&&s!=='unknown',s);
  task(desk,srcId+'-name',Boolean(source.name?.trim()),source.name);
  task(desk,srcId+'-unique',!sourceNames.has(s),s);
  sourceNames.add(s);
  task(desk,srcId+'-https',Array.isArray(source.urls)&&source.urls.some(safeUrl),source.urls?.[0]||'',true);
  task(desk,srcId+'-quota',Number.isInteger(source.cap)&&source.cap>0&&source.cap<=20,source.cap,true);
 }
 let data=null;
 try{data=read('apps/region/data/'+channel.id+'.json')}catch{}
 const items=Array.isArray(data?.items)?data.items:[];
 task(desk,'archive-has-content',items.length>0,items.length,true);
 const urls=new Set(),candidates=[];
 for(const item of items){
  const url=String(item?.url||''),age=isoAge(item?.date);
  if(!safeUrl(url)||!item.title||!Number.isFinite(age)||age>config.execution.maxAgeHours||age<0||urls.has(url)||usedSourceLinks.has(url))continue;
  urls.add(url);usedSourceLinks.add(url);
  candidates.push({id:digest(channel.id+'|'+url+'|'+item.title),language:channel.lang,city:channel.city,sourceTitle:item.title,sourceUrl:url,sourceName:item.sourceName||item.source||'',sourcePublishedAt:item.date,sourceSnippet:String(item.summary||'').slice(0,180),editorialAngle:languagePrompt[channel.lang],editorialStatus:'HOLD-source-review',requiresOriginalArticle:true,needsHumanSourceVerification:true});
  if(candidates.length===config.regional.maxCandidatesPerChannelPerDay)break;
 }
 task(desk,'recent-candidate-availability',candidates.length>0,candidates.length,true);
 task(desk,'candidate-language',candidates.every(x=>x.language===channel.lang),channel.lang);
 task(desk,'candidate-source-provenance',candidates.every(x=>safeUrl(x.sourceUrl)&&x.id&&x.sourcePublishedAt),'candidate source links');
 task(desk,'no-personal-authorship',candidates.every(x=>!('author' in x)),'AI candidate is not signed as a named person');
 const packet={agent:desk,kind:'regional',language:channel.lang,city:channel.city,edition:channel.base,generatedAt:now.toISOString(),status:'HOLD',sourceCandidates:candidates,publicPublication:false,externalDistribution:false};
 packets.push(packet);write('drafts/'+channel.id+'.json',packet);
}
const feedEnabled=process.env.AKTUAL_FREE_FEEDS==='1';
if(!['0','1',undefined].includes(process.env.AKTUAL_FREE_FEEDS))throw Error('Invalid free feed opt-in');
for(const source of config.national.sources){
 const desk='NAT-'+source.id.toUpperCase(),urls=source.feedUrls||[];
 register({id:desk,kind:'national',language:'hr',outlet:source.name,homepage:source.homepage,mode:'public-feed-observe-and-HOLD'});
 task(desk,'name-present',Boolean(source.name?.trim()),source.name);
 task(desk,'source-homepage-https',safeUrl(source.homepage),source.homepage);
 task(desk,'language-croatian',config.national.language==='hr',config.national.language);
 task(desk,'no-paid-model',config.budget.maxAICallsPerRun===0,'zero AI model requests');
 task(desk,'official-rss-only',urls.every(safeUrl),urls[0]||'no official feed configured');
 task(desk,'feed-discovery-proven',urls.length>0,urls.length?urls[0]:'Needs independently verified official feed',true);
 task(desk,'publisher-identity',config.primaryBrand==='AKTUAL MEDIA',config.primaryBrand);
 task(desk,'candidate-cap',config.national.maxCandidatesPerAgentPerDay<=5,config.national.maxCandidatesPerAgentPerDay);
}
async function readNationalFeed(source){
 const allowed=(source.feedUrls||[]).filter(safeUrl).slice(0,config.execution.maxFeedsPerNationalAgent);
 if(!feedEnabled)return {status:'not-attempted-free-traffic-opt-in-required',items:[]};
 if(!allowed.length)return {status:'official-rss-not-configured',items:[]};
 for(const url of allowed){
  try{
   const response=await fetch(url,{headers:{accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'},signal:AbortSignal.timeout(config.execution.requestTimeoutMs)});
   if(!response.ok)continue;
   const len=Number(response.headers.get('content-length')||0);
   if(len>1200000)continue;
   const raw=await response.text();
   if(raw.length>1200000||!looksLikeFeed(raw))continue;
   const parsed=parseFeed(raw,{base:url,sourceId:source.id,sourceName:source.name});
   if(parsed.length)return {status:'source-feed-read',items:parsed.slice(0,config.execution.maxItemsReadPerFeed),url};
  }catch{}
 }
 return {status:'source-feed-unavailable',items:[]};
}
const results=new Array(config.national.sources.length);
async function workerLoop(cursor){
 for(;;){
  const index=cursor.next++;
  if(index>=config.national.sources.length)return;
  results[index]=await readNationalFeed(config.national.sources[index]);
 }
}
const cursor={next:0};
await Promise.all(Array.from({length:Math.min(3,config.execution.concurrency)},()=>workerLoop(cursor)));
for(let i=0;i<config.national.sources.length;i++){
 const source=config.national.sources[i],outcome=results[i],desk='NAT-'+source.id.toUpperCase();
 task(desk,'live-feed-status',outcome.status==='source-feed-read',outcome.status,true);
 const candidates=[],links=new Set();
 for(const item of outcome.items){
  const age=isoAge(item?.date);
  if(!safeUrl(item.url)||!item.title||!Number.isFinite(age)||age<0||age>config.execution.maxAgeHours||links.has(item.url)||usedSourceLinks.has(item.url))continue;
  links.add(item.url);usedSourceLinks.add(item.url);
  candidates.push({id:digest(source.id+'|'+item.url+'|'+item.title),language:'hr',sourceTitle:item.title,sourceUrl:item.url,sourceName:source.name,sourcePublishedAt:item.date,sourceSnippet:String(item.summary||'').slice(0,180),editorialAngle:languagePrompt.hr,editorialStatus:'HOLD-source-review',requiresOriginalArticle:true,needsHumanSourceVerification:true});
  if(candidates.length>=config.national.maxCandidatesPerAgentPerDay)break;
 }
 task(desk,'candidate-source-links',candidates.every(x=>safeUrl(x.sourceUrl)),'verified syntax; factual reliability not verified');
 task(desk,'candidate-deduplicated',candidates.length===new Set(candidates.map(x=>x.sourceUrl)).size,candidates.length);
 const packet={agent:desk,kind:'national',language:'hr',publisher:config.primaryBrand,outlet:source.name,generatedAt:now.toISOString(),status:'HOLD',researchStatus:outcome.status,sourceCandidates:candidates,publicPublication:false,externalDistribution:false};
 packets.push(packet);write('drafts/national-'+source.id+'.json',packet);
}
const failed=tasks.filter(t=>t.state==='fail'),warnings=tasks.filter(t=>t.state==='warning');
const report={version:config.version,generatedAt:now.toISOString(),canonicalRepository:EXPECTED_REPO,publisher:'AKTUAL MEDIA',editionAlias:'Aktual mediji',operatingMode:'free-only-inspect-and-prepare-no-publication',
 deskAgents:desks.length,regionalAgents:desks.filter(d=>d.kind==='regional').length,nationalAgents:desks.filter(d=>d.kind==='national').length,
 executableMicroChecks:tasks.length,freeNationalFeedFetchEnabled:feedEnabled,freeOnly:true,paidApiCalls:0,
 sourceCandidates:packets.reduce((n,p)=>n+p.sourceCandidates.length,0),sourcePackets:packets.length,
 stats:{passed:tasks.filter(t=>t.state==='pass').length,warnings:warnings.length,failed:failed.length},
 observedRegionalLastRun:history?.lastRun?.at||null,observedRegionalLiveHealthy:history?.lastRun?.channels||{},
 findings:tasks,desks,limitations:['No Cloudflare Workers deployed','Source excerpts are not original articles','No live URL or publication asserted','No review notice delivered','No 30-minute publication clock started']};
write('report.json',report);
const lines=['# AKTUAL MEDIA — free-only editorial agent network','',
 '- Regional desks: '+report.regionalAgents,
 '- Croatian national desks: '+report.nationalAgents,
 '- Executed factual checks: '+report.executableMicroChecks+' (pass '+report.stats.passed+'; warnings '+warnings.length+'; fail '+failed.length+')',
 '- Source-linked editorial idea packets: '+report.sourcePackets+'; candidate references: '+report.sourceCandidates,
 '- Paid requests: 0; cloud deploys: 0; published articles: 0',
 '- Free RSS national scan: '+(feedEnabled?'requested; per source status in report':'off; set AKTUAL_FREE_FEEDS=1 for scheduled official RSS reads'),
 '- Review status: HOLD. No unverified author labels, delivery claims or automatic approvals.',
 '','## Regional health evidence'];
for(const d of desks.filter(x=>x.kind==='regional')){
 const health=history?.lastRun?.channels?.[d.id.slice(4).toLowerCase()];
 lines.push('- '+d.city+' ('+d.language+'): '+(health?health.sourcesOk+'/'+health.sourcesTotal+' RSS sources on '+history.lastRun.at:'no source health report'));
}
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'summary.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({desks:report.deskAgents,checks:report.executableMicroChecks,sourceCandidates:report.sourceCandidates,failed:failed.length,warnings:warnings.length,paidApiCalls:0,publication:false}));
if(failed.length)process.exitCode=1;
