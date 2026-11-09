// Fail-closed Content Factory preflight. It validates publication safety but does not publish.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SITE='https://gnk-asg.hr';
const ALLOWED_CATEGORIES=new Set(['objave','komentari','analize','kolumne','tematske']);
const SCRIPT_PATH=fileURLToPath(import.meta.url);

function file(root,rel){return path.join(root,rel)}
function readJson(root,rel,{optional=false}={}){
  const target=file(root,rel);
  if(!fs.existsSync(target)){
    if(optional)return null;
    throw new Error('Missing required source: '+rel);
  }
  const value=JSON.parse(fs.readFileSync(target,'utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid JSON object: '+rel);
  return value;
}
function zagrebParts(now){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('Invalid current time');
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  return {date,time};
}
function canonicalFrom(html){
  return (html.match(/<link\b[^>]*\brel=["'][^"']*canonical[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    ||html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'][^"']*canonical[^"']*["'][^>]*>/i)
    ||[])[1]||'';
}
function metaContent(html,name){
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const tagName=tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if(tagName!==name)continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]||'';
  }
  return '';
}
function validateAiEditorialRecord(root,item,html,bytes,now,errors){
  if(metaContent(html,'ai-generated').toLowerCase()!=='true')return;
  const rel=`content/factory-queue/review-records/${item.slug}.json`;
  let record;
  try{record=readJson(root,rel)}catch{errors.push(item.id+': AI editorial approval record missing or invalid');return;}
  const articleSha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const reviewer=String(record.approvedBy||'').trim();
  const approvalDate=Date.parse(record.approvedAt||'');
  const termsDate=Date.parse(record.sourceTermsVerifiedAt||'');
  const sourceUrl=String(record.sourceUrl||'').trim();
  let sourceSafe=false;try{sourceSafe=new URL(sourceUrl).protocol==='https:'}catch{}
  const termsUrl=String(record.sourceTermsUrl||'').trim();
  let termsSafe=false;try{termsSafe=new URL(termsUrl).protocol==='https:'}catch{}
  const disclosure=metaContent(html,'ai-disclosure');
  const bodyHash=metaContent(html,'ai-content-sha256');
  const inputHash=metaContent(html,'ai-input-content-sha256');
  const htmlSourceUrl=metaContent(html,'source-url').replace(/&amp;/g,'&');
  const htmlLicense=metaContent(html,'source-license').replace(/&amp;/g,'&');
  const htmlTermsUrl=metaContent(html,'source-terms-url').replace(/&amp;/g,'&');
  const hashFormat=/^[a-f0-9]{64}$/i;
  const decodeHtml=value=>String(value).replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  const sourceLinks=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const sourceInHtml=sourceLinks.some(match=>{
    const href=match[1].match(/\bhref=["']([^"']+)["']/i)?.[1]||'';
    const label=decodeHtml(match[2].replace(/<[^>]*>/g,'').trim());
    return decodeHtml(href)===sourceUrl&&label===String(record.sourceName||'').trim();
  })&&htmlSourceUrl===sourceUrl;
  const pageReviewer=decodeHtml((html.match(/Urednička provjera:\s*([^<]+)/i)||[])[1]||'').trim();
  const visibleDisclosure=html.includes('class="ai-disclosure"')&&html.includes(disclosure);
  const coverTag=html.match(/<img\b[^>]*\bclass=["']article-cover["'][^>]*>/i)?.[0]||'';
  const imageSrc=coverTag.match(/\bsrc=["']([^"']+)["']/i)?.[1]||'';
  const caption=(html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]||'').toLowerCase();
  const localIllustration=/^\/assets\/editorial\/generated\/[a-z0-9][a-z0-9-]{7,95}\.svg$/i.test(imageSrc);
  const imageRights=record.visualRightsVerified===true&&record.imageUrl===imageSrc&&localIllustration
    &&String(record.imageCredit||'').includes('izvorna generirana urednička ilustracija')
    &&caption.includes('izvorna')&&caption.includes('ilustracija')&&caption.includes('nije fotografija')
    &&html.includes(`https://gnk-asg.hr${imageSrc}`);
  if(record.version!=='GNK_ASG_NEWSROOM_HUMAN_REVIEW_V1'||record.status!=='approved')errors.push(item.id+': invalid AI review record version/status');
  if(!reviewer||pageReviewer!==reviewer||!Number.isFinite(approvalDate)||approvalDate>now.getTime())errors.push(item.id+': reviewer/approval time missing or future-dated');
  if(record.editorialResponsibilityAccepted!==true||record.substantive!==true)errors.push(item.id+': substantive editorial responsibility not recorded');
  if(record.sourceRightsVerified!==true||record.sourceTextNotCopied!==true||record.originalityAndAttributionReviewed!==true||record.privacyAndRightsReviewed!==true||record.prohibitedUse!==false||record.prohibitedUseScreenPassed!==true||record.riskClassification!=='not-high-risk')errors.push(item.id+': rights or risk assessment incomplete');
  if(!imageRights)errors.push(item.id+': local illustration rights or attribution incomplete');
  if(record.aiDisclosureVisible!==true||disclosure.length<20||!visibleDisclosure)errors.push(item.id+': visible AI disclosure missing');
  if(!String(record.aiProvider||'').trim())errors.push(item.id+': AI provenance provider missing');
  if(record.sourceClass!=='licensed-external'||!sourceSafe||!termsSafe||!record.sourceLicense||!Number.isFinite(termsDate)||termsDate>now.getTime()||termsDate>approvalDate||!sourceInHtml||htmlLicense!==record.sourceLicense||htmlTermsUrl!==termsUrl)errors.push(item.id+': licensed source provenance missing');
  if(!hashFormat.test(record.approvedInputContentSha256||'')||!hashFormat.test(record.aiContentSha256||'')||inputHash!==record.approvedInputContentSha256||bodyHash!==record.aiContentSha256)errors.push(item.id+': approved AI content hash missing or mismatched');
  if(!hashFormat.test(record.articleSha256||'')||record.articleSha256!==articleSha256)errors.push(item.id+': reviewed article hash mismatch');
  if(metaContent(html,'author')!=='AKTUAL MEDIA uredništvo'||!html.includes('<span>AKTUAL MEDIA uredništvo</span>'))errors.push(item.id+': AI source article must use neutral editorial-desk byline');
  if(/<meta\b[^>]*\bname=["']author["'][^>]*\bcontent=["'][^"']*Nermin Sefi[ćc][^"']*["']/i.test(html))errors.push(item.id+': unverified personal author attribution');
}
function heldSlugs(root){
  const manifest=readJson(root,'apps/portal/data/editorial-plan/manifest.json',{optional:true});
  const holds=readJson(root,'apps/portal/data/editorial-plan/publication-holds.json',{optional:true});
  if(!manifest&&!holds)throw new Error('Missing required editorial manifest and publication holds');
  if(!manifest||!Array.isArray(manifest.packages))throw new Error('Invalid editorial manifest');
  if(!holds||!Array.isArray(holds.holds))throw new Error('Invalid publication holds');
  const active=new Set(holds.holds.filter(x=>x?.active===true).map(x=>x.packageId));
  const slugs=new Set();
  for(const pack of manifest.packages){
    if(!active.has(pack?.id))continue;
    for(const sub of pack.files||[]){
      const target=file(root,'apps/portal/data/editorial-plan/'+sub);
      if(!fs.existsSync(target))throw new Error('Missing held package content: '+sub);
      const items=JSON.parse(fs.readFileSync(target,'utf8'));
      if(!Array.isArray(items))throw new Error('Invalid held package content: '+sub);
      for(const item of items)if(item?.slug)slugs.add(String(item.slug));
    }
  }
  return slugs;
}

export function preflightContentQueue({root=process.cwd(),now=new Date(process.env.ASG_EDITORIAL_NOW||Date.now())}={}){
  const queue=readJson(root,'content/factory-queue/queue.json');
  const state=readJson(root,'apps/portal/data/content-queue-state.json');
  const registry=readJson(root,'apps/portal/data/editorial-registry.json');
  if(!Array.isArray(queue.items)||!Array.isArray(queue.skipped))throw new Error('Invalid queue structure');
  if(!state.published||typeof state.published!=='object'||Array.isArray(state.published))throw new Error('Invalid publication state');
  if(!Array.isArray(registry.items))throw new Error('Invalid editorial registry');

  const {date,time}=zagrebParts(now);
  const errors=[];
  const ids=new Set();
  for(const item of queue.items){
    if(!item||typeof item.id!=='string'||!item.id.trim()){
      errors.push('Missing queue ID');
      continue;
    }
    if(ids.has(item.id))errors.push('Duplicate queue ID: '+item.id);
    ids.add(item.id);
  }

  const skipped=new Set(queue.skipped);
  const due=queue.items.filter(item=>item&&!skipped.has(item.id)&&!Object.hasOwn(state.published,item.id)
    &&(item.date<date||(item.date===date&&item.time<=time)));
  const held=heldSlugs(root);
  const registryRoutes=new Set(registry.items.flatMap(item=>[item?.path,item?.url].filter(Boolean)));
  const dueRoutes=new Set();
  const checked=[];

  for(const item of due){
    if(!ALLOWED_CATEGORIES.has(item.category)
      ||!/^[a-z0-9-]+$/.test(item.slug||'')
      ||!/^20\d\d-\d\d-\d\d$/.test(item.date||'')
      ||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time||'')){
      errors.push(item.id+': invalid item metadata');
      continue;
    }
    const source='content/factory-queue/'+item.category+'/'+item.slug+'.html';
    const sourcePath=file(root,source);
    if(!fs.existsSync(sourcePath)){
      errors.push(item.id+': missing source '+source);
      continue;
    }
    const bytes=fs.readFileSync(sourcePath);
    const html=bytes.toString('utf8');
    const canonical=canonicalFrom(html);
    if(!canonical||!/^https:\/\/gnk-asg\.hr\/(?:[a-z0-9-]+\/)+$/.test(canonical)){
      errors.push(item.id+': invalid canonical');
      continue;
    }
    const route=canonical.slice(SITE.length);
    if(dueRoutes.has(route)||registryRoutes.has(route)||fs.existsSync(file(root,'apps/portal'+route+'index.html'))){
      errors.push(item.id+': duplicate public route');
    }
    dueRoutes.add(route);
    if(held.has(item.slug))errors.push(item.id+': active editorial hold');
    validateAiEditorialRecord(root,item,html,bytes,now,errors);
    checked.push({
      id:item.id,
      source,
      canonical,
      route,
      sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')
    });
  }

  return {
    ok:errors.length===0,
    version:'GNK_ASG_CONTENT_QUEUE_PREFLIGHT_V3_20261019',
    now:now.toISOString(),
    zagreb:{date,time},
    due:due.length,
    checked,
    errors
  };
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(SCRIPT_PATH);
if(invoked){
  const result=preflightContentQueue({root:path.resolve(process.argv[2]||process.cwd())});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
