#!/usr/bin/env node
/**
 * AKTUAL MEDIA international distribution. Preview by default; live requires:
 * --live --confirm-live, GNK_ASG_EXTERNAL_DISTRIBUTION=true, and the external
 * credentials for each selected platform. Existing four blog writers unchanged.
 * We produce localized LINK PROMOTIONS, not unverified full translations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const ROOT = 'apps/portal';
const ORIGIN = 'https://gnk-asg.hr';
const config = JSON.parse(fs.readFileSync('ops/aktual-global-distribution-v1.json','utf8'));
const args = process.argv.slice(2);
const arg = (name, fallback='') => {
  const i=args.indexOf('--'+name);
  return i>=0 ? (args[i+1] || '') : fallback;
};
const live = args.includes('--live');
const check = args.includes('--check');
const platforms = arg('platforms','bluesky,mastodon,pixelfed,wordpress,substack,medium').split(',').map(x=>x.trim()).filter(Boolean);
const langs = arg('languages','en').split(',').map(x=>x.trim()).filter(Boolean);
const articlePath = arg('article','/gnk-aktual/kolumne/tisina-nakon-pitanja/');
const statePath=arg('state','apps/portal/data/aktual-global-distribution/state.json');
const outPath=arg('out','artifacts/distribution/aktual-global-preview.json');
const permitted = new Set(config.newChannels.map(x=>x.id));
const assert=(yes,message)=>{if(!yes)throw Error(message)};
assert(!live || (args.includes('--confirm-live') && process.env.GNK_ASG_EXTERNAL_DISTRIBUTION==='true'),
  'Live distribution requires manual approval for this run AND GNK_ASG_EXTERNAL_DISTRIBUTION=true');
assert(platforms.length>0 && platforms.every(p=>permitted.has(p)),'Unknown distribution platform');
assert(langs.length>0 && langs.every(l=>config.languages[l]),'Unknown distribution language');
assert(platforms.length*langs.length<=3 || !live,'At most three external publications in each live run');
assert(/^\/(?:gnk-aktual\/kolumne|en\/gnk-aktual\/columns|objave|en\/publications|analize|en\/analysis|komentari|en\/commentary)\/[a-z0-9-]+\/$/.test(articlePath),
 'Only original editorial article routes (not external RSS mirroring) are supported');
const localFile=path.join(ROOT, articlePath.replace(/^\/+/,''),'index.html');
assert(fs.existsSync(localFile),'Article HTML missing: '+localFile);
const html=fs.readFileSync(localFile,'utf8');
const meta=(name,which='name')=>{
  const pattern=new RegExp('<meta\\s+'+which+'=["\\x27]'+name+'["\\x27]\\s+content=["\\x27]([^"\\x27]*)["\\x27]','i');
  return html.match(pattern)?.[1]||'';
};
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const clean=s=>decode(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
assert(canonical===ORIGIN+articlePath,'Local canonical must equal owned original article URL');
assert(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*index/i.test(html)
  && !/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),
 'Article is not explicitly indexable');
const title=clean(meta('og:title','property')||html.match(/<title>([^<]+)<\/title>/i)?.[1]);
const description=clean(meta('description')).slice(0,600);
assert(title.length>=8&&description.length>=30,'Insufficient authored title or description');
const jsonld=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{
 try{const v=JSON.parse(m[1]);return v['@graph']||[v]}catch{return[]}
});
const article=jsonld.find(v=>([]).concat(v['@type']||[]).some(t=>/^(NewsArticle|Article|OpinionNewsArticle|BlogPosting)$/.test(t)));
assert(article,'No attributable original Article/NewsArticle schema; avoid third-party content laundering');
const published=article.datePublished?new Date(article.datePublished):null;
assert(!published || (!Number.isNaN(published.getTime())&&published.getTime()<=Date.now()),
 'Unpublished or future-dated article');
const authorNode=article.author||null;
const author=authorNode?.name|| (Array.isArray(authorNode)&&authorNode[0]?.name) || clean(meta('author')) || 'AKTUAL MEDIA editorial desk';
const sourceLang=article.inLanguage||html.match(/<html[^>]*lang=["']([^"']+)/i)?.[1]||'hr';
const rawImage=meta('og:image','property');
const imgURL=(()=>{try{const u=new URL(rawImage);if(u.protocol!=='https:'||u.hostname!=='gnk-asg.hr')return null;
  if(!/^\/assets\/(?:editorial\/generated|izdanja|people\/nermin-sefic)\//.test(u.pathname))return null;
  return u.href;}catch{return null}})();
const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const truncate=(s,n)=>[...s].slice(0,n).join('');
const makeEntry=(platform,language)=>{
 const l=config.languages[language];
 const heading=truncate(title,100);
 const footer='#AktualMedia'+(language==='hr'?' #AktualMediji':'');
 const max=platform==='bluesky'?300:platform==='mastodon'||platform==='pixelfed'?470:2000;
 let lead=l.lead+' · '+heading;
 let text=lead+'\n'+l.read+': '+canonical+'\n'+footer;
 if([...text].length>max){
   lead=l.lead+' · '+truncate(heading,Math.max(25,max-[...canonical].length-[...l.read].length-[...footer].length-16));
   text=lead+'\n'+l.read+': '+canonical+'\n'+footer;
 }
 assert([...text].length<=max,'Post exceeds platform limits for '+platform+' '+language);
 return {platform,language,region:l.region,canonical,title,description,author,
  publisher:'AKTUAL MEDIA',editor:'Nermin Sefić',originalLanguage:sourceLang,
  localization:'intro-only; original title and linked article remain in source language',
  text,imageUrl:imgURL,imageAlt:title,requiredImage:platform==='pixelfed',
  key:createHash('sha256').update(platform+'|'+language+'|'+canonical).digest('hex').slice(0,32)};
};
const entries=platforms.flatMap(p=>langs.map(l=>makeEntry(p,l)));
const output={generatedAt:new Date().toISOString(),mode:live?'live':'preview',
  source:canonical,canonicalOnly:true,imageRightsCheck:'owned asset URL only, not proof of legal license',
  translatedFullArticle:false,entries};
if(!check&&!live){fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(output,null,2)+'\n');}
const readState=()=>{try{return JSON.parse(fs.readFileSync(statePath,'utf8'))}catch{return{version:1,posted:{}}}};
const state=readState();
const saveState=()=>{fs.mkdirSync(path.dirname(statePath),{recursive:true});fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');};
const fetchJSON=async(url,options={})=>{
 const res=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
 const text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
 if(!res.ok)throw Error('Provider '+res.status+': '+text.slice(0,280));
 return data;
};
async function assertCanonicalLive(){
 const r=await fetch(canonical,{signal:AbortSignal.timeout(15000),headers:{accept:'text/html'}});
 assert(r.ok && r.status===200,'Original not publicly reachable with HTTP 200: '+r.status);
 const html=await r.text();
 assert(html.includes('rel="canonical"')&&html.includes(canonical),'Live canonical missing or differs');
}
const imageCache=new Map();
async function imageData(url,max=8000000){
 if(!url)return null;
 if(imageCache.has(url))return imageCache.get(url);
 const r=await fetch(url,{signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('Image '+r.status);
 const mime=(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
 assert(['image/jpeg','image/png','image/webp'].includes(mime),'Unsupported image MIME');
 const length=Number(r.headers.get('content-length')||0);
 assert(length<=max,'Image too large');
 const bytes=new Uint8Array(await r.arrayBuffer());
 assert(bytes.length>0&&bytes.length<=max,'Image invalid or too large');
 const obj={bytes,mime};imageCache.set(url,obj);return obj;
}
function publicInstance(key){
 const raw=process.env[key]||'';
 const url=new URL(raw);
 assert(url.protocol==='https:' && url.hostname.includes('.') && !url.username && !url.password
   && !/(^localhost$|\.localhost$|\.local$)/i.test(url.hostname),'Unsafe instance URL '+key);
 return url.origin;
}
function requireEnv(keys){for(const key of keys)assert(process.env[key],'Missing credential '+key);}
async function toBluesky(e){
 requireEnv(['BSKY_HANDLE','BSKY_APP_PASSWORD']);
 const origin='https://bsky.social/xrpc/';
 const session=await fetchJSON(origin+'com.atproto.server.createSession',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({identifier:process.env.BSKY_HANDLE,password:process.env.BSKY_APP_PASSWORD})});
 const bearer=session.accessJwt,record={$type:'app.bsky.feed.post',text:e.text,createdAt:new Date().toISOString(),langs:[e.language]};
 const begin=Buffer.byteLength(e.text.slice(0,e.text.indexOf(e.canonical)),'utf8');
 const end=begin+Buffer.byteLength(e.canonical,'utf8');
 record.facets=[{index:{byteStart:begin,byteEnd:end},features:[{$type:'app.bsky.richtext.facet#link',uri:e.canonical}]}];
 if(e.imageUrl){
  try{
   const photo=await imageData(e.imageUrl,1000000);
   const res=await fetchJSON(origin+'com.atproto.repo.uploadBlob',{
     method:'POST',headers:{authorization:'Bearer '+bearer,'content-type':photo.mime},body:photo.bytes});
   record.embed={$type:'app.bsky.embed.images',images:[{alt:e.imageAlt,image:res.blob}]};
  }catch(err){console.error('Bluesky image omitted: '+String(err).slice(0,160));}
 }
 const id=await fetchJSON(origin+'com.atproto.repo.createRecord',{
  method:'POST',headers:{authorization:'Bearer '+bearer,'content-type':'application/json'},
  body:JSON.stringify({repo:session.did,collection:'app.bsky.feed.post',record})});
 assert(id.uri?.startsWith('at://'),'Bluesky record URI missing');
 const rkey=id.uri.split('/').pop();
 return {url:'https://bsky.app/profile/'+encodeURIComponent(session.handle||process.env.BSKY_HANDLE)+'/post/'+rkey,providerId:id.uri};
}
async function toFediverse(e,provider){
 const prefix=provider==='pixelfed'?'PIXELFED':'MASTODON';
 requireEnv([prefix+'_INSTANCE',prefix+'_TOKEN']);
 const site=publicInstance(prefix+'_INSTANCE'),token=process.env[prefix+'_TOKEN'];
 const headers={authorization:'Bearer '+token};
 let mediaId=null;
 if(e.imageUrl){
  const photo=await imageData(e.imageUrl);
  const form=new FormData();
  form.append('file',new Blob([photo.bytes],{type:photo.mime}),'aktual-media.'+photo.mime.split('/')[1]);
  form.append('description',e.imageAlt);
  const obj=await fetchJSON(site+'/api/v2/media',{method:'POST',headers,body:form});
  assert(obj.id,'Media server did not return upload ID');mediaId=String(obj.id);
 }
 if(provider==='pixelfed')assert(mediaId,'Pixelfed requires owned image: no media uploaded');
 const payload={status:e.text,visibility:'public',language:e.language};
 if(mediaId)payload.media_ids=[mediaId];
 const obj=await fetchJSON(site+'/api/v1/statuses',{
  method:'POST',headers:{...headers,'content-type':'application/json','Idempotency-Key':e.key},
  body:JSON.stringify(payload)});
 assert(obj.url||obj.uri,'Fediverse did not return public post URI');
 return {url:obj.url||obj.uri,providerId:obj.id};
}
async function toWordPress(e){
 requireEnv(['WORDPRESS_SITE_ID','WORDPRESS_ACCESS_TOKEN']);
 assert(/^[a-zA-Z0-9._-]+$/.test(process.env.WORDPRESS_SITE_ID),'Invalid WordPress site identifier');
 const l=config.languages[e.language];
 const ownedImage=e.imageUrl?'<figure><img src="'+escapeHtml(e.imageUrl)+'" alt="'+escapeHtml(e.imageAlt)+'"></figure>':'';
 const body=ownedImage+'<p>'+escapeHtml(l.lead)+': <strong>'+escapeHtml(e.title)+'</strong></p>'+
  '<p>'+escapeHtml(e.description.slice(0,350))+'</p>'+
  '<p>'+escapeHtml(l.read)+': <a href="'+escapeHtml(e.canonical)+'">'+escapeHtml(e.canonical)+'</a></p>'+
  '<p>AKTUAL MEDIA · '+escapeHtml(e.author)+' · '+escapeHtml(e.originalLanguage)+'</p>';
 const qs=new URLSearchParams({status:'publish',publicize:'false',
  title:l.lead+': '+e.title,content:body,tags:'AKTUAL MEDIA,Aktual Media,Regional News'});
 const result=await fetchJSON('https://public-api.wordpress.com/rest/v1.1/sites/'+process.env.WORDPRESS_SITE_ID+'/posts/new',{
  method:'POST',headers:{authorization:'Bearer '+process.env.WORDPRESS_ACCESS_TOKEN,
  'content-type':'application/x-www-form-urlencoded'},body:qs.toString()});
 assert(result.status==='publish'&&result.URL,'WordPress did not confirm published URL');
 return {url:result.URL,providerId:result.ID};
}
if(check){
 console.log(JSON.stringify({ok:true,mode:'read-only',source:canonical,platforms,langs,entries:entries.length,
  sourceLanguage:sourceLang,imageEligible:Boolean(imgURL),author,editor:'Nermin Sefić'}));
}else if(live){
 await assertCanonicalLive();
 let published=0,failed=0,skipped=0;
 for(const e of entries){
  if(['substack','medium'].includes(e.platform)){
   console.log('MANUAL ONLY '+e.platform+' '+e.language);skipped++;continue;
  }
  if(state.posted[e.key]){
   console.log('ALREADY POSTED '+e.platform+' '+e.language+' '+state.posted[e.key].url);skipped++;continue;
  }
  try{
   const result=e.platform==='bluesky'?await toBluesky(e)
    :e.platform==='wordpress'?await toWordPress(e)
    :await toFediverse(e,e.platform);
   state.posted[e.key]={...result,canonical:e.canonical,platform:e.platform,
     language:e.language,at:new Date().toISOString()};
   saveState();published++;
   console.log('CONFIRMED '+e.platform+' '+e.language+' '+result.url);
  }catch(err){failed++;console.error('FAILED '+e.platform+' '+e.language+' '+String(err).slice(0,400));}
 }
 console.log(JSON.stringify({mode:'live',published,failed,skipped,recorded:Object.keys(state.posted).length}));
 if(failed)process.exitCode=1;
}else console.log(JSON.stringify({mode:'preview',file:outPath,entries:entries.length,source:canonical,
 note:'No account connected and no external publication triggered'}));
