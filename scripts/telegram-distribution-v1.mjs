#!/usr/bin/env node
// Optional fifth outlet for the existing 4/4 mirror workflow. Preview is safe;
// live requires a verified canonical, explicit run gate and configured bot credentials.
import fs from 'node:fs';
import path from 'node:path';
import {telegramCandidates,telegramMessage} from './lib/telegram-distribution-core-v1.mjs';
import {readDistributionState} from './distribution-safety-v1.mjs';
const LIVE=process.argv.includes('--live');
const STATE='apps/portal/data/telegram-distribution/published.json';
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const featured=read('apps/portal/data/editorial-featured.json');
const registry=read('apps/portal/data/editorial-registry.json');
const state=readDistributionState(STATE,{allowMissing:!LIVE,version:1});
const perRun=Math.max(1,Math.min(5,Number(process.env.TELEGRAM_PER_RUN||3)||3));
const candidates=telegramCandidates({featured,registry,posted:state.posted,maxAgeDays:7}).slice(0,perRun);
const summary={mode:LIVE?'live':'preview',candidates:candidates.length,posted:[],skipped:[],errors:[]};
const token=process.env.TELEGRAM_BOT_TOKEN||'';
const chat=process.env.TELEGRAM_CHAT_ID||'';
if(LIVE&&(!token||!chat))throw new Error('Telegram live blocked: missing bot token or destination chat ID');
if(LIVE&&process.env.GNK_ASG_EXTERNAL_DISTRIBUTION!=='true')throw new Error('Telegram live blocked by global distribution kill switch');
const preflight=async(item)=>{
  const res=await fetch(item.canonical,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html'}});
  if(res.status!==200||!String(res.headers.get('content-type')||'').includes('text/html'))return false;
  const url=new URL(res.url);
  if(url.protocol!=='https:'||url.hostname!=='gnk-asg.hr'||url.pathname!==item.path)return false;
  const html=await res.text();
  const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]||'';
  return canonical.includes('href="'+item.canonical+'"') && !/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
};
const save=()=>{
  fs.mkdirSync(path.dirname(STATE),{recursive:true});
  fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');
};
for(const item of candidates){
  if(!LIVE){summary.skipped.push({path:item.path,reason:'preview-only'});continue;}
  let ok=false;
  try{ok=await preflight(item);}catch{}
  if(!ok){summary.skipped.push({path:item.path,reason:'not-live-canonical'});continue;}
  // No account ID, token or private chat address is stored in public repository state.
  const payload={chat_id:chat,text:telegramMessage(item),parse_mode:'HTML',
    link_preview_options:{is_disabled:false},disable_notification:true};
  let answer;
  try{
    const res=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)
    });
    answer=await res.json();
    if(!res.ok||!answer.ok||!Number.isInteger(answer.result?.message_id))
      throw new Error('Telegram did not confirm message');
  }catch{
    // Ambiguous network outcome: do not automatically retry this item.
    state.posted[item.path]={status:'pending-verification',at:new Date().toISOString()};
    save();summary.errors.push({path:item.path,reason:'delivery status uncertain; manual verification required'});continue;
  }
  const messageId=answer.result.message_id;
  const publicName=chat.startsWith('@')?chat.slice(1):null;
  const url=publicName && /^[A-Za-z0-9_]{5,32}$/.test(publicName)
    ? 'https://t.me/'+publicName+'/'+messageId : null;
  state.posted[item.path]={status:'sent',messageId,at:new Date().toISOString(),canonical:item.canonical,...(url?{url}:{})};
  save();summary.posted.push({path:item.path,url});
}
console.log(JSON.stringify(summary));
if(summary.errors.length)process.exitCode=1;
