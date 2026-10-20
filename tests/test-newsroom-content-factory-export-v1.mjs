import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {exportApprovedNewsroomBatch,validateApprovedNewsroomBatch} from '../scripts/newsroom-content-factory-export-v1.mjs';
import {preflightContentQueue} from '../scripts/content-queue-preflight-v1.mjs';

const now=new Date();
const scheduledFor=new Date(now.getTime()+60*60*1000).toISOString();
const batchId=`daily-10-3:${scheduledFor.slice(0,10)}`;
const sha=value=>crypto.createHash('sha256').update(value,'utf8').digest('hex');
const sentenceText=Array.from({length:10},(_,i)=>`Ovo je provjerena rečenica ${i+1} za testni urednički sadržaj.`).join(' ');
const items=Array.from({length:13},(_,index)=>{
  const sourceNumber=Math.floor(index/3)+1;
  const sourceName=`Test Publisher ${sourceNumber}`;
  const sourceUrl=`https://publisher-${sourceNumber}.example/story/${index+1}`;
  const title=`Urednički naslov koji nije kopija izvora ${index+1}`;
  const commentary=index>=10;
  const disclosure='AI-potpomognuti urednički nacrt; sadržajno provjeren i odobren za vlastitu objavu.';
  const content=`${disclosure}\n\n${sentenceText}\n\nIzvor: ${sourceName} — ${sourceUrl}`;
  return{
    id:`post-${index+1}`,batchId,batchSize:13,batchIndex:index,scheduledFor,
    status:'manual_review',category:commentary?'commentary':'source-summary-business',title,summary:`Kratak opis izvorne uredničke obrade za stavku ${index+1}, uz izvor i provjerenu činjeničnu osnovu.`,content,
    sourceName,sourceUrl,sourcePublishedAt:new Date(now.getTime()-2*60*60*1000).toISOString(),
    provenance:{sourceClass:'external-publisher-link',sourceName,originalUrl:sourceUrl,sourcePublishedAt:new Date(now.getTime()-2*60*60*1000).toISOString(),retrievedAt:now.toISOString()},
    imageUrl:`/assets/editorial/generated/news-test-topic-${index+1}-a1b2c3d4e5f6a7b8c9d0.svg`,
    imageCredit:'GNK ASG — izvorna generirana urednička ilustracija; nije dokumentarna fotografija',
    imageAlt:`Izvorna urednička ilustracija za temu ${index+1}`,
    imageCaption:'Izvorna urednička ilustracija GNK ASG, nije fotografija događaja.',
    seoTitle:`${title} | GNK ASG`,metaDescription:`Izvorni urednički pregled ${index+1}, uz povezani izvor i provjerene metapodatke.`,
    aiGovernance:{usedAI:true,provider:'Cloudflare Workers AI',humanEditorialReview:null,disclosure:{visible:true,text:disclosure}}
  };
});
const approvals=Object.fromEntries(items.map(post=>[post.id,{
  approved:true,reviewer:'Test Editor',approvedAt:new Date(now.getTime()-60*1000).toISOString(),
  substantive:true,editorialResponsibilityAccepted:true,contentSha256:sha(post.content),
  sourceRightsVerified:true,sourceTextNotCopied:true,originalityAndAttributionReviewed:true,visualRightsVerified:true,
  sourceLicense:'publisher-license-2026',
  sourceTermsUrl:`https://${post.sourceName.toLowerCase().replaceAll(' ','-')}.example/terms`,
  sourceTermsVerifiedAt:new Date(now.getTime()-24*60*60*1000).toISOString(),
  aiDisclosureVisible:true,prohibitedUse:false,prohibitedUseScreenPassed:true,
  privacyAndRightsReviewed:true,riskClassification:'not-high-risk'
}]));
const batch={batchId:items[0].batchId,posts:items,approvals};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'asg-newsroom-factory-'));
try{
  const valid=validateApprovedNewsroomBatch(batch,{now});
  assert.equal(valid.items.length,13);
  assert.equal(valid.news,10);
  assert.equal(valid.commentaries,3);
  assert.equal(valid.sourceCount,5);
  assert.equal(valid.items[0].editorial.category,'objave');
  assert.equal(valid.items[10].editorial.category,'komentari');
  assert.match(valid.items[0].html,/name="ai-generated" content="true"/);
  assert.match(valid.items[0].html,/name="author" content="AKTUAL MEDIA uredništvo"/);
  assert.match(valid.items[0].html,/\"datePublished\":\"20\d\d-\d\d-\d\dT/);
  assert.doesNotMatch(valid.items[0].html,/name="author" content="Nermin Sefić"/);
  assert.ok(valid.items.every(item=>item.html.includes('citation')||item.html.includes(item.source.sourceUrl)));

  const dryRoot=path.join(temp,'dry');
  fs.mkdirSync(path.join(dryRoot,'content/factory-queue'),{recursive:true});
  fs.writeFileSync(path.join(dryRoot,'content/factory-queue/queue.json'),JSON.stringify({version:'TEST',generatedAt:'',skipped:[],items:[]},null,2));
  const dry=exportApprovedNewsroomBatch(batch,{root:dryRoot,now,apply:false});
  assert.equal(dry.applied,false);
  assert.equal(dry.artifacts.length,13);
  assert.equal(fs.readFileSync(path.join(dryRoot,'content/factory-queue/queue.json'),'utf8').includes('AM-'),false,'dry-run must not mutate queue');

  const applyRoot=path.join(temp,'apply');
  fs.mkdirSync(path.join(applyRoot,'content/factory-queue'),{recursive:true});
  fs.writeFileSync(path.join(applyRoot,'content/factory-queue/queue.json'),JSON.stringify({version:'TEST',generatedAt:'',skipped:[],items:[]},null,2));
  const applied=exportApprovedNewsroomBatch(batch,{root:applyRoot,now,apply:true});
  assert.equal(applied.applied,true);
  assert.equal(applied.exported,13);
  const queue=JSON.parse(fs.readFileSync(path.join(applyRoot,'content/factory-queue/queue.json'),'utf8'));
  assert.equal(queue.items.length,13);
  assert.equal(queue.items.filter(item=>item.category==='komentari').length,3);
  assert.ok(fs.existsSync(path.join(applyRoot,'content/factory-queue/review-records',`${queue.items[0].slug}.json`)));
  assert.equal(fs.existsSync(path.join(applyRoot,'apps/portal/data/news.json')),false,'export must not write public feed');

  const invalidHash=structuredClone(batch);
  invalidHash.approvals[invalidHash.posts[0].id].contentSha256='0'.repeat(64);
  assert.throws(()=>validateApprovedNewsroomBatch(invalidHash,{now}),/reviewed_content_hash_mismatch/);
  const missingRights=structuredClone(batch);
  missingRights.approvals[missingRights.posts[0].id].sourceRightsVerified=false;
  assert.throws(()=>validateApprovedNewsroomBatch(missingRights,{now}),/rights_disclosure_or_risk_review_incomplete/);
  const stale=structuredClone(batch);
  stale.posts[0].sourcePublishedAt=new Date(now.getTime()-48*60*60*1000).toISOString();
  stale.posts[0].provenance.sourcePublishedAt=stale.posts[0].sourcePublishedAt;
  assert.throws(()=>validateApprovedNewsroomBatch(stale,{now}),/stale_or_invalid_source/);

  const preflightRoot=path.join(temp,'preflight');
  fs.cpSync(applyRoot,preflightRoot,{recursive:true});
  const preflightWrite=(relative,value)=>{
    const file=path.join(preflightRoot,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
  };
  preflightWrite('apps/portal/data/content-queue-state.json',{version:'TEST',published:{}});
  preflightWrite('apps/portal/data/editorial-registry.json',{items:[]});
  preflightWrite('apps/portal/data/editorial-plan/manifest.json',{packages:[]});
  preflightWrite('apps/portal/data/editorial-plan/publication-holds.json',{holds:[]});
  const check=preflightContentQueue({root:preflightRoot,now});
  assert.equal(check.ok,true,JSON.stringify(check.errors));

  console.log(JSON.stringify({ok:true,exporter:'PR-first-content-factory',batch:{news:10,commentaries:3,items:13},humanReview:'required-per-item',rights:'licensed-source-required',livePublication:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
