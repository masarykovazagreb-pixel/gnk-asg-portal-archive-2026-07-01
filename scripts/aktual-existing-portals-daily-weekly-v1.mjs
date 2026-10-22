#!/usr/bin/env node
// Source-linked daily and weekly newsroom briefs, free and strictly HOLD.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const src=path.join(root,'artifacts/aktual-editorial-network');
const cfg=JSON.parse(fs.readFileSync('config/control-plane/aktual-editorial-network-v1.json','utf8'));
const regions=JSON.parse(fs.readFileSync('apps/region/channels.json','utf8'));
const now=new Date(process.env.ASG_EDITORIAL_NOW||Date.now());
if(!Number.isFinite(+now)||cfg.execution.allowExternalPosting!==false)throw Error('Unsafe environment');
const DAY=86400000;
const norm=x=>String(x??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const key=x=>createHash('sha256').update(x).digest('hex').slice(0,20);
const packetFiles=fs.readdirSync(path.join(src,'drafts')).filter(f=>f.endsWith('.json')).sort();
const packets=packetFiles.map(f=>JSON.parse(fs.readFileSync(path.join(src,'drafts',f),'utf8')));
const languages=new Map(regions.channels.map(r=>[r.id,r.lang]));
const daily=[],weekly=[];
for(const packet of packets){
 if(packet.status!=='HOLD'||packet.publicPublication!==false||packet.externalDistribution!==false)throw Error('Publication HOLD violated');
 const lang=packet.language;const edition=packet.kind==='regional'?packet.agent.slice(4).toLowerCase():'national';
 if(packet.kind==='regional'&&languages.get(edition)!==lang)throw Error('Regional language mismatch');
 const candidates=Array.isArray(packet.sourceCandidates)?packet.sourceCandidates:[];
 for(const item of candidates){
  const date=new Date(item.sourcePublishedAt);
  if(!Number.isFinite(+date)||+date>+now+3600000)continue;
  const age=+now-(+date);
  if(age<0||age>7*DAY)continue;
  let u;try{u=new URL(item.sourceUrl)}catch{continue}
  if(u.protocol!=='https:'||!item.sourceTitle)continue;
  const headline=norm(item.sourceTitle).slice(0,190);
  const summary=norm(item.sourceSnippet).slice(0,200);
  const risk=/(?:optuž|uboj|sud|prijevar|korup|silovan|rat\b|election|crime|lawsuit|fraud|murder|medical|terror|war\b)/i.test(headline+' '+summary);
  const score=(age<=DAY?50:10)+Math.min(15,Math.floor((summary.length)/20))+(packet.kind==='regional'?5:8)-(risk?10:0);
  const record={id:key(edition+'|'+u.href),edition,language:lang,sourcePublisher:norm(item.sourceName),
   sourceUrl:u.href,sourceHeadline:headline,sourcePublishedAt:date.toISOString(),sourceSnippet:summary,
   editorialAngle:item.editorialAngle,priorityScore:score,riskReviewRequired:risk,
   factCheck:'PENDING',originalCopy:'NOT_YET_WRITTEN',status:'HOLD',publisher:'AKTUAL MEDIA',
   editor: 'editorial desk (not a byline)',personalAuthor:null};
  weekly.push(record);
  if(age<=DAY)daily.push(record);
 }
}
function select(items,limit){
 const seen=new Set(),countEdition=new Map();
 return items.sort((a,b)=>b.priorityScore-a.priorityScore||b.sourcePublishedAt.localeCompare(a.sourcePublishedAt))
  .filter(x=>{
   const fingerprint=x.sourceUrl.toLowerCase().replace(/\/$/,'');
   if(seen.has(fingerprint)||countEdition.get(x.edition)>=5)return false;
   seen.add(fingerprint);countEdition.set(x.edition,(countEdition.get(x.edition)||0)+1);return true;
  }).slice(0,limit);
}
const out={version:'AKTUAL_MEDIA_DAILY_WEEKLY_HOLD_V1',generatedAt:now.toISOString(),free:true,
 publicationStatus:'HOLD',scope:'existing 8 regional and national editorial desks',daily:select(daily,60),
 weekly:select(weekly,115),totalInputs:packets.length,
 safety:{noAutoPublish:true,noExternalComments:true,noArticleBodiesCopied:true,
  verificationRequired:true,reviewNoticeSent:false,thirtyMinuteTimerStarted:false,paidCalls:0}};
if(out.daily.some(x=>x.status!=='HOLD')||out.weekly.some(x=>x.personalAuthor!==null))throw Error('Status violation');
fs.writeFileSync(path.join(src,'daily-weekly-brief.json'),JSON.stringify(out,null,2)+'\n');
const lines=['# AKTUAL MEDIA — dnevni i tjedni urednički izbor','',
 'Izvješće pripremljeno '+out.generatedAt+'; **HOLD, nije objavljeno**.',
 'Dnevno kandidata: '+out.daily.length+'; tjedno: '+out.weekly.length+'.',
 'Bez plaćenih poziva; bez slanja komentara drugim medijima; bez izmišljanja autorstva.',
 '',
 '## Dnevni prioriteti'];
for(const x of out.daily.slice(0,18))lines.push('- ['+x.edition+'/'+x.language+'] '+x.sourceHeadline+' — '+x.sourcePublisher+' ('+x.sourceUrl+')'+(x.riskReviewRequired?' — POSEBNA PROVJERA':''));
lines.push('','## Tjedni prioriteti');
for(const x of out.weekly.slice(0,18))lines.push('- ['+x.edition+'/'+x.language+'] '+x.sourceHeadline+' — '+x.sourcePublisher+' ('+x.sourceUrl+')');
fs.writeFileSync(path.join(src,'daily-weekly-brief.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({daily:out.daily.length,weekly:out.weekly.length,status:'HOLD',paid:0,published:0}));
