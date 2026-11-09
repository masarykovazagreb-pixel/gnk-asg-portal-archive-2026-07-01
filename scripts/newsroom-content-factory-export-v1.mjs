// Export a fully reviewed newsroom batch into the canonical, PR-first Content Factory queue.
// This script stages content only; it never publishes, deploys, or writes the public news feed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildContentProvenance} from '../workers/gnk-asg-direct-operator/src/content-source-policy-v1.js';

const SCRIPT_PATH=fileURLToPath(import.meta.url);
const SITE='https://gnk-asg.hr';
const TOTAL=13;
const NEWS_COUNT=10;
const COMMENTARY_COUNT=3;
const NEWS_CATEGORIES=new Set(['source-summary-business','source-summary-technology','source-summary-crypto','source-summary-markets','source-summary-fintech','source-summary-sport','source-summary-entertainment']);
const MAX_AGE_HOURS=36;
const AI_DISCLOSURE_PREFIX='AI-potpomognuti urednički nacrt';
const DESK_BYLINE='AKTUAL MEDIA uredništvo';
const clean=value=>String(value??'').trim();
const esc=value=>clean(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const iso=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():''};
const sha256=value=>crypto.createHash('sha256').update(String(value),'utf8').digest('hex');
const slugify=value=>clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'aktual-pregled';

export function sentenceCount(value){return(clean(value).match(/[^.!?]+[.!?]+/gu)||[]).length;}

function splitContent(post){
  const parts=clean(post.content).split(/\n\s*\n/).map(clean).filter(Boolean);
  if(parts.length<3||!parts[0].startsWith(AI_DISCLOSURE_PREFIX))throw new Error(`ai_disclosure_or_body_missing_${post.id||'unknown'}`);
  const sourceLine=parts.at(-1);
  const sourceUrl=clean(post.sourceUrl||post.provenance?.originalUrl);
  if(!sourceLine.includes(sourceUrl))throw new Error(`source_attribution_missing_${post.id||'unknown'}`);
  return{disclosure:parts[0],body:parts.slice(1,-1).join('\n\n')};
}

function validSource(post,approval,now){
  const sourceUrl=clean(post.sourceUrl||post.provenance?.originalUrl);
  let url;
  try{url=new URL(sourceUrl);}catch{throw new Error(`invalid_source_url_${post.id||'unknown'}`)}
  if(url.protocol!=='https:'||url.hostname==='gnk-asg.hr'||url.hostname.endsWith('.gnk-asg.hr'))throw new Error(`unsafe_source_url_${post.id||'unknown'}`);
  const publishedAt=iso(post.sourcePublishedAt||post.provenance?.sourcePublishedAt);
  if(!publishedAt||now-Date.parse(publishedAt)>MAX_AGE_HOURS*60*60*1000||Date.parse(publishedAt)>now+5*60*1000)throw new Error(`stale_or_invalid_source_${post.id||'unknown'}`);
  const sourceName=clean(post.sourceName||post.provenance?.sourceName);
  if(!sourceName)throw new Error(`source_name_missing_${post.id||'unknown'}`);
  const termsUrl=clean(approval.sourceTermsUrl);
  let termsProtocol='';try{termsProtocol=new URL(termsUrl).protocol}catch{}
  const licenseId=clean(approval.sourceLicense);
  const termsVerifiedAt=iso(approval.sourceTermsVerifiedAt);
  if(termsProtocol!=='https:'||!termsVerifiedAt||Date.parse(termsVerifiedAt)>now||Date.parse(termsVerifiedAt)>Date.parse(approval.approvedAt||''))throw new Error(`source_license_terms_missing_or_future_${post.id||'unknown'}`);
  const policy=buildContentProvenance({
    sourceClass:'licensed-external',sourceName,sourceUrl,sourceTermsUrl:termsUrl,
    sourceLicense:licenseId,sourceTermsVerifiedAt:termsVerifiedAt,
    sourcePublishedAt:publishedAt,retrievedAt:post.provenance?.retrievedAt||now,
    usageBasis:'limited-feed-metadata-original-editorial-work'
  },{category:post.category==='commentary'?'commentary':'source-summary-business',sourceUrl,at:new Date(now).toISOString()});
  if(policy.errors.length||policy.flags.length||!policy.autoEligible)throw new Error(`source_rights_not_verified_${post.id||'unknown'}:${[...policy.errors,...policy.flags].join(',')}`);
  return{sourceUrl,sourceName,publishedAt,termsVerifiedAt,policy:policy.provenance};
}

function validateApproval(post,approval,now){
  if(!approval||typeof approval!=='object')throw new Error(`human_approval_missing_${post.id||'unknown'}`);
  const reviewer=clean(approval.reviewer);
  const approvedAt=iso(approval.approvedAt);
  const contentSha256=sha256(post.content||'');
  if(approval.approved!==true||approval.substantive!==true||approval.editorialResponsibilityAccepted!==true)throw new Error(`substantive_editorial_approval_required_${post.id||'unknown'}`);
  if(!reviewer||!approvedAt||Date.parse(approvedAt)>now)throw new Error(`reviewer_identity_or_time_invalid_${post.id||'unknown'}`);
  if(approval.contentSha256!==contentSha256)throw new Error(`reviewed_content_hash_mismatch_${post.id||'unknown'}`);
  if(approval.sourceRightsVerified!==true||approval.sourceTextNotCopied!==true||approval.originalityAndAttributionReviewed!==true||approval.visualRightsVerified!==true||approval.aiDisclosureVisible!==true||approval.prohibitedUse!==false||approval.prohibitedUseScreenPassed!==true||approval.privacyAndRightsReviewed!==true)throw new Error(`rights_disclosure_or_risk_review_incomplete_${post.id||'unknown'}`);
  if(approval.riskClassification!=='not-high-risk')throw new Error(`specialist_risk_review_required_${post.id||'unknown'}`);
  return{reviewer,approvedAt,contentSha256};
}

function articleHtml(post,approval,source,editorial,body,disclosure,slug){
  const section=post.category==='commentary'?'komentari':'objave';
  const canonical=`${SITE}/${section}/${slug}/`;
  const title=clean(post.title).slice(0,240);
  const summary=clean(post.summary||body).slice(0,320);
  const seoTitle=clean(post.seoTitle||`${title} | GNK ASG`).slice(0,240);
  const description=clean(post.metaDescription||summary).slice(0,320);
  const image=clean(post.imageUrl);
  const imageAlt=clean(post.imageAlt||`Izvorna urednička ilustracija za: ${title}`).slice(0,240);
  const reviewer=approval.reviewer;
  const jsonLd={
    '@context':'https://schema.org','@type':'Article',headline:title,description,
    author:{'@type':'Organization',name:DESK_BYLINE,url:`${SITE}/gnk-aktual/`},
    editor:{'@type':'Person',name:reviewer},publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:`${SITE}/`},
    mainEntityOfPage:{'@type':'WebPage','@id':canonical},inLanguage:'hr',datePublished:editorial.scheduledFor,
    image:`${SITE}${image}`,citation:source.sourceUrl
  };
  const safeJsonLd=JSON.stringify(jsonLd).replace(/</g,'\\u003c');
  const paragraphs=body.split(/\n\s*\n/).map(value=>`<p>${esc(value).replace(/\n/g,'<br>')}</p>`).join('');
  const digest=sha256(body);
  return `<!doctype html><html lang="hr" class="gnk-unified-shell"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(seoTitle)}</title><meta name="description" content="${esc(description)}"><meta name="author" content="${esc(DESK_BYLINE)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="ai-generated" content="true"><meta name="ai-disclosure" content="${esc(disclosure)}"><meta name="ai-input-content-sha256" content="${approval.contentSha256}"><meta name="ai-content-sha256" content="${digest}"><meta name="source-url" content="${esc(source.sourceUrl)}"><meta name="source-license" content="${esc(source.policy.licenseId)}"><meta name="source-terms-url" content="${esc(source.policy.termsUrl)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${esc(seoTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE}${image}"><meta property="og:image:alt" content="${esc(imageAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(seoTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE}${image}"><script type="application/ld+json">${safeJsonLd}</script><link rel="stylesheet" href="/assets/style.css?v=20260723-dark-gold-theme-v1"><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260713"></head><body><main class="editorial-wrap article"><header class="article-header"><p class="eyebrow">${section==='komentari'?'Komentari':'AKTUAL MEDIA'}</p><h1>${esc(title)}</h1><p class="lead">${esc(summary)}</p><div class="article-meta"><span>${esc(DESK_BYLINE)}</span><span>Urednička provjera: ${esc(reviewer)}</span></div></header><figure><img class="article-cover" src="${esc(image)}" width="1200" height="630" alt="${esc(imageAlt)}" loading="eager"><figcaption>${esc(post.imageCaption||'Izvorna GNK ASG urednička ilustracija; nije fotografija događaja.')}</figcaption></figure><p class="ai-disclosure"><strong>AI-potpomognuti tekst:</strong> ${esc(disclosure)}</p><article class="article-body">${paragraphs}</article><p class="source-attribution"><strong>Izvor i kontekst:</strong> <a href="${esc(source.sourceUrl)}" rel="noopener noreferrer" target="_blank">${esc(source.sourceName)}</a>. Prava izvora evidentirana u uredničkom pregledu.</p></main></body></html>`;
}

function zagrebParts(date){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}

export function validateApprovedNewsroomBatch(batch,{now=new Date()}={}){
  const nowDate=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(nowDate.getTime()))throw new Error('invalid_export_time');
  const posts=Array.isArray(batch?.posts)?batch.posts:[];
  const approvals=batch?.approvals&&typeof batch.approvals==='object'?batch.approvals:{};
  if(posts.length!==TOTAL)throw new Error(`daily_10_3_batch_required_${posts.length}_of_${TOTAL}`);
  const batchId=clean(batch.batchId||posts[0]?.batchId);
  if(!batchId||!/^daily-10-3:\d{4}-\d{2}-\d{2}$/.test(batchId))throw new Error('invalid_daily_batch_id');
  const ids=new Set(),sourceCounts=new Map(),sourceUrls=new Set(),slugs=new Set(),validated=[];
  let news=0,commentaries=0;
  const nowMs=nowDate.getTime();
  let batchSchedule='';
  for(let index=0;index<posts.length;index+=1){
    const post=posts[index],id=clean(post?.id),approval=approvals[id];
    if(!id||ids.has(id))throw new Error(`missing_or_duplicate_post_id_${index}`);
    ids.add(id);
    if(post.batchId!==batchId||post.batchSize!==TOTAL||post.batchIndex!==index)throw new Error(`daily_batch_contract_invalid_${id}`);
    if(post.status!=='manual_review'||(post.editorialApproval!==undefined&&post.editorialApproval!==null))throw new Error(`source_post_not_held_for_human_review_${id}`);
    const schedule=iso(post.scheduledFor);
    if(!schedule||Math.abs(Date.parse(schedule)-nowMs)>MAX_AGE_HOURS*60*60*1000||batchId!==`daily-10-3:${schedule.slice(0,10)}`)throw new Error(`daily_batch_schedule_invalid_${id}`);
    if(batchSchedule&&batchSchedule!==schedule)throw new Error(`daily_batch_schedule_mismatch_${id}`);
    batchSchedule=schedule;
    const commentary=post.category==='commentary';
    if(commentary!==(index>=NEWS_COUNT)||(!commentary&&!NEWS_CATEGORIES.has(post.category)))throw new Error(`daily_batch_category_order_invalid_${id}`);
    if(commentary)commentaries+=1;else news+=1;
    const title=clean(post.title),summary=clean(post.summary),image=clean(post.imageUrl);
    if(title.length<8||title.length>240||summary.length<40||!image)throw new Error(`required_publication_metadata_missing_${id}`);
    if(!/^\/assets\/editorial\/generated\/[a-z0-9][a-z0-9-]{7,95}\.svg$/i.test(image))throw new Error(`nonlocal_or_unapproved_image_${id}`);
    if(!clean(post.imageCredit).includes('izvorna generirana urednička ilustracija'))throw new Error(`image_credit_missing_${id}`);
    const imageCaption=clean(post.imageCaption).toLowerCase();
    if(!imageCaption.includes('izvorna')||!imageCaption.includes('ilustracija')||!imageCaption.includes('nije fotografija'))throw new Error(`image_caption_rights_disclosure_missing_${id}`);
    const {disclosure,body}=splitContent(post);
    const governance=post.aiGovernance;
    if(governance?.usedAI!==true||!clean(governance.provider)||governance.disclosure?.visible!==true||clean(governance.disclosure?.text)!==disclosure||governance.humanEditorialReview!==null)throw new Error(`ai_provenance_or_pending_review_incomplete_${id}`);
    if(body.length<180||body.length>8000)throw new Error(`editorial_body_length_invalid_${id}`);
    if(commentary&&(sentenceCount(body)<10||sentenceCount(body)>15))throw new Error(`commentary_sentence_count_invalid_${id}`);
    const approved=validateApproval(post,approval,nowMs);
    const source=validSource(post,approval,nowMs);
    if(sourceUrls.has(source.sourceUrl))throw new Error(`duplicate_source_url_${id}`);
    sourceUrls.add(source.sourceUrl);
    const sourceKey=source.sourceName.toLowerCase();
    const count=(sourceCounts.get(sourceKey)||0)+1;
    if(count>3)throw new Error(`source_limit_exceeded_${source.sourceName}`);
    sourceCounts.set(sourceKey,count);
    if(!clean(post.seoTitle)||!clean(post.metaDescription)||!clean(post.imageAlt))throw new Error(`seo_contract_incomplete_${id}`);
    const slug=slugify(title);
    if(slugs.has(slug))throw new Error(`duplicate_export_slug_${slug}`);
    slugs.add(slug);
    const editorial={
      slug,category:commentary?'komentari':'objave',date:zagrebParts(nowDate).year+'-'+zagrebParts(nowDate).month+'-'+zagrebParts(nowDate).day,
      time:`${zagrebParts(nowDate).hour}:${zagrebParts(nowDate).minute}`,title:title.slice(0,240),
      sourcePostId:id,batchId,batchIndex:index,
      scheduledFor:new Date(Math.floor(nowDate.getTime()/60000)*60000).toISOString()
    };
    const html=articleHtml(post,{...approval,...approved},source,editorial,body,disclosure,slug);
    const pageSha256=sha256(html);
    const reviewRecord={
      version:'GNK_ASG_NEWSROOM_HUMAN_REVIEW_V1',status:'approved',postId:id,batchId,batchIndex:index,
      approvedBy:approved.reviewer,approvedAt:approved.approvedAt,editorialResponsibilityAccepted:true,
      substantive:true,sourceRightsVerified:true,sourceTextNotCopied:true,originalityAndAttributionReviewed:true,
      visualRightsVerified:true,imageUrl:clean(post.imageUrl),imageCredit:clean(post.imageCredit),
      sourceUrl:source.sourceUrl,sourceName:source.sourceName,
      sourceClass:'licensed-external',sourceLicense:source.policy.licenseId,sourceTermsUrl:source.policy.termsUrl,
      sourceTermsVerifiedAt:source.termsVerifiedAt,riskClassification:approval.riskClassification,
      prohibitedUse:false,prohibitedUseScreenPassed:true,privacyAndRightsReviewed:true,
      aiDisclosureVisible:true,aiProvider:clean(post.aiGovernance?.provider),
      approvedInputContentSha256:approved.contentSha256,aiContentSha256:sha256(body),articleSha256:pageSha256
    };
    validated.push({post,approval,source,body,disclosure,editorial,html,reviewRecord,pageSha256});
  }
  if(news!==NEWS_COUNT||commentaries!==COMMENTARY_COUNT||sourceCounts.size<4)throw new Error(`daily_batch_mix_or_source_diversity_invalid_${news}_${commentaries}_${sourceCounts.size}`);
  return{ok:true,batchId,news,commentaries,sourceCount:sourceCounts.size,items:validated};
}

export function exportApprovedNewsroomBatch(batch,{root=process.cwd(),now=new Date(),apply=false}={}){
  const validated=validateApprovedNewsroomBatch(batch,{now});
  const queuePath=path.join(root,'content/factory-queue/queue.json');
  const queue=JSON.parse(fs.readFileSync(queuePath,'utf8'));
  if(!Array.isArray(queue.items)||!Array.isArray(queue.skipped))throw new Error('invalid_factory_queue');
  const existingIds=new Set(queue.items.map(item=>item.id));
  const existingSlugs=new Set(queue.items.map(item=>item.slug));
  for(const item of validated.items){
    const id=`AM-${validated.batchId.slice(-10).replace(/-/g,'')}-${String(item.editorial.batchIndex+1).padStart(2,'0')}`;
    const rel=`content/factory-queue/${item.editorial.category}/${item.editorial.slug}.html`;
    const reviewRel=`content/factory-queue/review-records/${item.editorial.slug}.json`;
    if(existingIds.has(id)||existingSlugs.has(item.editorial.slug)||fs.existsSync(path.join(root,rel))||fs.existsSync(path.join(root,reviewRel)))throw new Error(`factory_queue_duplicate_${id}_${item.editorial.slug}`);
    item.factoryItem={id,rel,reviewRel,date:item.editorial.date,time:item.editorial.time,category:item.editorial.category,slug:item.editorial.slug,title:item.editorial.title};
    existingIds.add(id);existingSlugs.add(item.editorial.slug);
  }
  const artifacts=validated.items.map(item=>({
    id:item.factoryItem.id,htmlPath:item.factoryItem.rel,reviewRecordPath:item.factoryItem.reviewRel,
    html:item.html,reviewRecord:item.reviewRecord,queueItem:{id:item.factoryItem.id,date:item.factoryItem.date,time:item.factoryItem.time,category:item.factoryItem.category,slug:item.factoryItem.slug,title:item.factoryItem.title}
  }));
  if(!apply)return{ok:true,applied:false,batchId:validated.batchId,artifacts:artifacts.map(({html,reviewRecord,...meta})=>meta)};
  const token=`${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const created=[],temporary=[];
  try{
    for(const artifact of artifacts){
      const htmlPath=path.join(root,artifact.htmlPath),reviewPath=path.join(root,artifact.reviewRecordPath);
      fs.mkdirSync(path.dirname(htmlPath),{recursive:true});fs.mkdirSync(path.dirname(reviewPath),{recursive:true});
      const htmlTemp=`${htmlPath}.tmp-${token}`,reviewTemp=`${reviewPath}.tmp-${token}`;
      temporary.push(htmlTemp,reviewTemp);
      fs.writeFileSync(htmlTemp,artifact.html+'\n',{flag:'wx'});
      artifact.reviewRecord.articleSha256=sha256(artifact.html+'\n');
      fs.writeFileSync(reviewTemp,JSON.stringify(artifact.reviewRecord,null,2)+'\n',{flag:'wx'});
      fs.renameSync(htmlTemp,htmlPath);temporary.splice(temporary.indexOf(htmlTemp),1);created.push(htmlPath);
      fs.renameSync(reviewTemp,reviewPath);temporary.splice(temporary.indexOf(reviewTemp),1);created.push(reviewPath);
      queue.items.push(artifact.queueItem);
    }
    queue.items.sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    queue.version=queue.version||'GNK_ASG_FACTORY_QUEUE_2026_08';
    queue.generatedAt=new Date(now).toISOString();
    const queueTemp=`${queuePath}.tmp-${token}`;
    temporary.push(queueTemp);
    fs.writeFileSync(queueTemp,JSON.stringify(queue,null,2)+'\n',{flag:'wx'});
    fs.renameSync(queueTemp,queuePath);temporary.splice(temporary.indexOf(queueTemp),1);
  }catch(error){
    for(const filename of temporary)fs.rmSync(filename,{force:true});
    for(const filename of created)fs.rmSync(filename,{force:true});
    throw error;
  }
  return{ok:true,applied:true,batchId:validated.batchId,exported:artifacts.length,items:artifacts.map(({html,reviewRecord,...meta})=>meta)};
}

function main(){
  const inputPath=process.argv.find(value=>value.startsWith('--input='))?.slice('--input='.length);
  const root=process.argv.find(value=>value.startsWith('--root='))?.slice('--root='.length)||process.cwd();
  const apply=process.argv.includes('--apply');
  if(!inputPath){console.error('Usage: node scripts/newsroom-content-factory-export-v1.mjs --input=approved-batch.json [--root=/repo] [--apply]');process.exit(2);}
  const batch=JSON.parse(fs.readFileSync(inputPath,'utf8'));
  const result=exportApprovedNewsroomBatch(batch,{root,apply});
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(SCRIPT_PATH))main();
