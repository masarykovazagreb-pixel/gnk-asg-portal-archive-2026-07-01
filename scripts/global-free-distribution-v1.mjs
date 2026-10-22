#!/usr/bin/env node
// AKTUAL MEDIA global distribution: PREVIEW by default; LIVE is gated twice.
// No credentials or approvals are written to files; only verified public URLs
// count as completed. A pending record prevents a blind duplicate retry.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {selectCandidates,buildCopy,postKey,publicUrl,ORIGIN,EDITIONS,INTRO,short} from './global-distribution-core-v1.mjs';

const LIVE=process.argv.includes('--live');
const STATE='apps/portal/data/global-distribution/published.json';
const PLAN='apps/portal/data/global-distribution/preview.json';
const REPORT='apps/portal/data/global-distribution/last-report.json';
const PER_RUN=Math.min(4,Math.max(1,Number(process.env.GLOBAL_PER_PLATFORM||2)||2));
const LANGS=String(process.env.GLOBAL_LANGS||'source,en').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
if(LANGS.some(l=>l!=='source'&&!INTRO[l]))throw new Error('Unsupported distribution locale');
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const save=(p,o)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(o,null,2)+'\n');};
const request=async(url,options={})=>fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),...options});
const json=async(res,label)=>{const raw=await res.text();let obj;try{obj=JSON.parse(raw)}catch{throw new Error(label+' returned non-JSON '+res.status)}if(!res.ok)throw new Error(label+' HTTP '+res.status+' '+JSON.stringify(obj).slice(0,170));return obj;};
const data={featured:read('apps/portal/data/editorial-featured.json',{items:[]}),registry:read('apps/portal/data/editorial-registry.json',{items:[]}),regions:{}};
for(const [id] of EDITIONS)data.regions[id]=read('apps/region/data/'+id+'.json',{items:[]});
const candidates=selectCandidates({...data,max:60});
const variants=[];
for(const item of candidates){
  const choices=[...new Set(LANGS.map(x=>x==='source'?item.lang:x))];
  for(const language of choices.slice(0,3)){ // never mass-translate/repost one article in many languages
    const copy=buildCopy(item,language,language==='en'&&item.lang!=='en'?280:300);
    variants.push({item,language,copy});
  }
}
const plan={
  version:'AKTUAL_GLOBAL_FREE_DISTRIBUTION_V1',generatedAt:new Date().toISOString(),
  sourceOfTruth:ORIGIN+'/gnk-aktual/',channels:['Bluesky','Mastodon'],
  candidateArticles:candidates.length,packageCount:variants.length,
  distributionRequiresExplicitApproval:true,actualPublishingEnabled:LIVE,
  targetLocales:LANGS,photoRights:'Only internal gnk-asg.hr owned JPG/PNG/WEBP media, never source-outlet images',
  notes:['Article headlines stay in the ORIGINAL language. Localized text is only a network introduction.',
    'Four existing Blogger/DEV.to/Tumblr/Telegraph channels remain unchanged.',
    'Free platforms are worldwide services, not a guarantee of indexed visibility in each country.'],
  packages:variants.slice(0,80).map(v=>({platforms:['bluesky','mastodon'],language:v.language,sourceLanguage:v.item.lang,canonical:v.item.canonical,
    text:v.copy.text,image:v.copy.image,alt:v.copy.alt,translatedArticle:false,disclosure:v.copy.disclosure}))
};
save(PLAN,plan);
const state=read(STATE,{version:'AKTUAL_GLOBAL_FREE_DISTRIBUTION_V1',posted:{}});
if(typeof state.posted!=='object'||Array.isArray(state.posted)||state.posted===null)throw new Error('Invalid durable distribution state');
const report={version:'AKTUAL_GLOBAL_DISTRIBUTION_RUN_V1',mode:LIVE?'live':'preview',createdAt:new Date().toISOString(),
  candidateArticles:candidates.length,packages:variants.length,platforms:{},verifiedUrls:[],errors:[]};
if(!LIVE){save(REPORT,report);console.log(JSON.stringify({mode:'PREVIEW',candidates:candidates.length,packages:variants.length,channels:plan.channels,plan:PLAN}));process.exit(0);}
if(process.env.CONFIRM_EXTERNAL_PUBLISH!=='AKTUAL_MEDIA_APPROVED_20261022'||process.env.GNK_ASG_EXTERNAL_DISTRIBUTION!=='true')
  throw new Error('External publication blocked: explicit per-run approval and repository opt-in required');
if(!process.env.GITHUB_RUN_ID)throw new Error('Live distribution is restricted to the reviewed GitHub Actions workflow');

const preflight=async(url)=>{
  try{
    const r=await request(url,{method:'GET',headers:{'User-Agent':'AKTUAL-MEDIA-Global-Distributor/1.0','Accept':'text/html'}});
    if(!r.ok||!String(r.headers.get('content-type')||'').includes('text/html'))return false;
    const actual=new URL(r.url);return actual.protocol==='https:'&&actual.hostname==='gnk-asg.hr'&&actual.pathname===new URL(url).pathname;
  }catch{return false;}
};
const mediaBytes=async(url,max)=>{
  if(!url)return null;
  try{
    const r=await request(url);const mime=String(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
    if(!r.ok||!['image/png','image/jpeg','image/webp'].includes(mime))return null;
    const len=Number(r.headers.get('content-length')||0);
    if(len>max)return null;
    const bytes=Buffer.from(await r.arrayBuffer());return bytes.length>0&&bytes.length<=max?{bytes,mime}:null;
  }catch{return null;}
};
const bskyCfg={id:process.env.BSKY_IDENTIFIER||'',pass:process.env.BSKY_APP_PASSWORD||''};
const mastoCfg={host:process.env.MASTODON_INSTANCE_URL||'',token:process.env.MASTODON_ACCESS_TOKEN||''};
const mastoHost=()=>{
  const u=new URL(mastoCfg.host);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||
    !u.hostname.includes('.')||/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(u.hostname))throw new Error('Unsafe Mastodon instance URL');
  return u.origin;
};
let bskySession;
const bskyCall=async(method,path,body,token)=>{
  const u='https://bsky.social/xrpc/'+path;
  const r=await request(u,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return json(r,path);
};
const loginBsky=async()=>{
  if(!bskySession)bskySession=await bskyCall('POST','com.atproto.server.createSession',{identifier:bskyCfg.id,password:bskyCfg.pass});
  if(!bskySession.did||!bskySession.accessJwt)throw new Error('Bluesky login returned incomplete session');
  return bskySession;
};
const bskyGet=async(rkey)=>{
  const ses=await loginBsky();
  const q=new URLSearchParams({repo:ses.did,collection:'app.bsky.feed.post',rkey});
  const res=await request('https://bsky.social/xrpc/com.atproto.repo.getRecord?'+q.toString(),{headers:{Authorization:'Bearer '+ses.accessJwt}});
  if(res.status===404)return null;
  return json(res,'Bluesky record verification');
};
const bskyPublish=async(copy,key)=>{
  const ses=await loginBsky();
  const rkey='am'+key.slice(0,20);
  const human='https://bsky.app/profile/'+encodeURIComponent(ses.did)+'/post/'+rkey;
  const existing=await bskyGet(rkey);
  if(existing)return {id:existing.uri,url:human,verified:true,existing:true};
  const payload={$type:'app.bsky.feed.post',text:copy.text,createdAt:new Date().toISOString(),langs:[copy.sourceLanguage]};
  const at=copy.text.lastIndexOf(copy.canonical);
  if(at>=0){
    const byteStart=Buffer.byteLength(copy.text.slice(0,at),'utf8');
    payload.facets=[{index:{byteStart,byteEnd:byteStart+Buffer.byteLength(copy.canonical,'utf8')},
      features:[{$type:'app.bsky.richtext.facet#link',uri:copy.canonical}]}];
  }
  const photo=await mediaBytes(copy.image,1000000);
  if(photo){
    const r=await request('https://bsky.social/xrpc/com.atproto.repo.uploadBlob',{method:'POST',headers:{Authorization:'Bearer '+ses.accessJwt,'Content-Type':photo.mime},body:photo.bytes});
    const uploaded=await json(r,'Bluesky image');
    if(uploaded.blob)payload.embed={$type:'app.bsky.embed.images',images:[{alt:copy.alt,image:uploaded.blob}]};
  }
  const posted=await bskyCall('POST','com.atproto.repo.createRecord',{repo:ses.did,collection:'app.bsky.feed.post',rkey,record:payload},ses.accessJwt);
  return {id:posted.uri,url:human,verified:Boolean(await bskyGet(rkey)),image:Boolean(payload.embed)};
};
const mastoGet=async(host,id)=>{
  const r=await request(host+'/api/v1/statuses/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+mastoCfg.token}});
  if(r.status===404)return null;
  return json(r,'Mastodon status verification');
};
const mastoPublish=async(copy,key)=>{
  const host=mastoHost();
  const media=await mediaBytes(copy.image,8000000);
  let attachment;
  if(media){
    const form=new FormData();
    form.append('file',new Blob([media.bytes],{type:media.mime}),'aktual-media.'+media.mime.split('/')[1]);
    form.append('description',copy.alt);
    const upload=await request(host+'/api/v2/media',{method:'POST',headers:{Authorization:'Bearer '+mastoCfg.token},body:form});
    attachment=await json(upload,'Mastodon media upload');
    if(upload.status===202){
      for(let i=0;i<3;i++){await new Promise(resolve=>setTimeout(resolve,1100));const status=await request(host+'/api/v1/media/'+encodeURIComponent(attachment.id),{headers:{Authorization:'Bearer '+mastoCfg.token}});
        if(status.ok){const p=await status.json();if(p.url){attachment=p;break;}}}
      if(!attachment.url)attachment=null;
    }
  }
  const form=new URLSearchParams({status:copy.text,visibility:'public',language:copy.sourceLanguage});
  if(attachment?.id)form.append('media_ids[]',String(attachment.id));
  const submitted=await request(host+'/api/v1/statuses',{method:'POST',
    headers:{Authorization:'Bearer '+mastoCfg.token,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':key.slice(0,64)},body:form});
  const post=await json(submitted,'Mastodon status publish');
  if(!post.id||!publicUrl(post.url)||post.visibility!=='public')throw new Error('Mastodon response missing public post metadata');
  const checked=await mastoGet(host,post.id);
  return {id:post.id,url:post.url,verified:Boolean(checked&&checked.id===post.id),image:Boolean(attachment)};
};
const platforms=[
  {name:'bluesky',ready:Boolean(bskyCfg.id&&bskyCfg.pass),publish:bskyPublish},
  {name:'mastodon',ready:Boolean(mastoCfg.host&&mastoCfg.token),publish:mastoPublish}
];
if(!platforms.some(p=>p.ready))throw new Error('No connected Bluesky or Mastodon credentials: nothing was published');
for(const target of platforms){
  let ok=0,fail=0,skipped=0,attempted=0;const outputs=[];
  if(!target.ready){report.platforms[target.name]={status:'missing_account_credentials',published:0};continue;}
  for(const v of variants){
    if(attempted>=PER_RUN)break;
    const key=postKey(target.name,v.item,v.language);
    const previous=state.posted[key];
    if(previous){
      if(previous.status==='verified'){skipped++;continue;}
      // A previous API write without read-after-write proof must not be retried
      // blindly. Operators must reconcile the exact external object first.
      skipped++;report.errors.push(target.name+': pending verification for '+v.item.canonical);continue;
    }
    if(!(await preflight(v.item.canonical))){skipped++;continue;}
    attempted++;
    try{
      const result=await target.publish(v.copy,key);
      const url=publicUrl(result.url);
      if(!url||!result.id)throw new Error('External publisher did not return a verifiable object and URL');
      state.posted[key]={platform:target.name,canonical:v.item.canonical,language:v.language,
        url,id:result.id,status:result.verified?'verified':'pending_verification',
        imageAttached:Boolean(result.image),createdAt:new Date().toISOString()};
      save(STATE,state);
      if(result.verified){ok++;outputs.push(url);report.verifiedUrls.push(url);console.log('VERIFIED '+target.name+' '+url);}
      else{fail++;report.errors.push(target.name+' published but not yet independently verified: '+v.item.canonical);}
    }catch(error){fail++;report.errors.push(target.name+' '+v.item.canonical+' '+short(error?.message||String(error),160));}
  }
  report.platforms[target.name]={status:'attempted',verified:ok,failed:fail,skipped,url:outputs};
}
save(REPORT,report);
console.log(JSON.stringify({mode:'LIVE',platforms:report.platforms,verifiedUrls:report.verifiedUrls,errors:report.errors.slice(0,15)}));
if(report.errors.length)process.exitCode=1;
