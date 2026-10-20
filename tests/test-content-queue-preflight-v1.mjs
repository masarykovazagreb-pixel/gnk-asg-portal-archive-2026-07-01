import assert from 'node:assert/strict';
import '../scripts/test-content-queue-visibility-v1.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=path.resolve('scripts/content-queue-preflight-v1.mjs');
const publisher=fs.readFileSync('scripts/content-queue-publish-v1.mjs','utf8');
assert.ok(fs.existsSync(script),'missing content queue preflight');
assert.match(publisher,/preflightContentQueue/);
assert.match(publisher,/zagrebOffsetFor/);
assert.doesNotMatch(publisher,/publishedAt=.*\+02:00/);
assert.match(publisher,/normalizeEditorialAttributionHtml/);
assert.match(publisher,/extractSocialHashtags/);
assert.doesNotMatch(publisher,/article:author[^`]*Nermin Sefić/,'content queue must not hard-code Nermin as author');
assert.doesNotMatch(publisher,/NerminSefic/,'unverified queue entries must not receive a personal-name social hashtag');
const backfill=fs.readFileSync('scripts/content-queue-backfill-v1.mjs','utf8');
assert.match(backfill,/normalizeEditorialAttributionHtml/);
assert.match(backfill,/extractSocialHashtags/);
assert.doesNotMatch(backfill,/NerminSefic/,'backfill must not keyword-stuff or personally tag unverified posts');

const root=fs.mkdtempSync(path.join(os.tmpdir(),'asg-content-queue-gate-'));
const write=(rel,value)=>{
  const target=path.join(root,rel);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value));
};
const item={id:'T-1',date:'2026-10-10',time:'07:00',category:'komentari',slug:'test-odobrenje'};
const canonical='https://gnk-asg.hr/komentari/test-odobrenje/';
const html='<html lang="hr"><head><link rel="canonical" href="'+canonical+'"></head><body><h1>Test</h1></body></html>';
const run=(now='2026-10-10T08:00:00+02:00')=>spawnSync(process.execPath,[script,root],{
  encoding:'utf8',
  env:{...process.env,ASG_EDITORIAL_NOW:now}
});
let passed=0;
function check(label,status,pattern){
  const r=run();
  assert.equal(r.status,status,label+': '+r.stdout+' '+r.stderr);
  assert.match(r.stdout+r.stderr,pattern,label);
  console.log('PASS '+label);
  passed++;
}
try{
  write('content/factory-queue/queue.json',{items:[item],skipped:[]});
  write('apps/portal/data/content-queue-state.json',{version:'TEST',published:{}});
  write('apps/portal/data/editorial-registry.json',{items:[]});
  write('content/factory-queue/komentari/test-odobrenje.html',html);

  check('both editorial guard documents missing: fail closed',1,/Missing required editorial manifest and publication holds/);
  write('apps/portal/data/editorial-plan/manifest.json',{packages:[]});
  check('publication holds missing: fail closed',1,/Invalid publication holds/);
  write('apps/portal/data/editorial-plan/publication-holds.json',{holds:[]});
  check('safe due item accepted',0,/"ok": true/);

  const crypto=await import('node:crypto');
  const aiBodyHash=crypto.createHash('sha256').update('reviewed generated body').digest('hex');
  const aiInputHash='a'.repeat(64);
  const aiImage='/assets/editorial/generated/news-test-topic-1-a1b2c3d4e5f6a7b8c9d0.svg';
  const aiHtml=`<html lang=\"hr\"><head><link rel=\"canonical\" href=\"${canonical}\"><meta name=\"author\" content=\"AKTUAL MEDIA uredništvo\"><meta name=\"ai-generated\" content=\"true\"><meta name=\"ai-disclosure\" content=\"AI-potpomognuti tekst; sadržajno pregledan od urednika.\"><meta name=\"ai-input-content-sha256\" content=\"${aiInputHash}\"><meta name=\"ai-content-sha256\" content=\"${aiBodyHash}\"><meta name=\"source-url\" content=\"https://publisher.example/story\"><meta name=\"source-license\" content=\"test-license\"><meta name=\"source-terms-url\" content=\"https://publisher.example/terms\"><meta property=\"og:image\" content=\"https://gnk-asg.hr${aiImage}\"></head><body><div class=\"article-meta\"><span>AKTUAL MEDIA uredništvo</span><span>Urednička provjera: Test editor</span></div><p class=\"ai-disclosure\">AI-potpomognuti tekst; sadržajno pregledan od urednika.</p><figure><img class=\"article-cover\" src=\"${aiImage}\" alt=\"Test ilustracija\"><figcaption>Izvorna GNK ASG urednička ilustracija, nije fotografija događaja.</figcaption></figure><p>Izvor: <a href=\"https://publisher.example/story\">Publisher</a></p></body></html>`;
  write('content/factory-queue/komentari/test-odobrenje.html',aiHtml);
  write('content/factory-queue/review-records/test-odobrenje.json',{
    version:'GNK_ASG_NEWSROOM_HUMAN_REVIEW_V1',status:'approved',approvedBy:'Test editor',approvedAt:'2026-10-10T05:30:00.000Z',
    editorialResponsibilityAccepted:true,substantive:true,sourceRightsVerified:true,sourceTextNotCopied:true,
    originalityAndAttributionReviewed:true,visualRightsVerified:true,imageUrl:aiImage,
    imageCredit:'GNK ASG — izvorna generirana urednička ilustracija; nije dokumentarna fotografija',privacyAndRightsReviewed:true,
    prohibitedUse:false,prohibitedUseScreenPassed:true,riskClassification:'not-high-risk',aiDisclosureVisible:true,aiProvider:'Test AI provider',
    sourceUrl:'https://publisher.example/story',sourceName:'Publisher',sourceClass:'licensed-external',sourceLicense:'test-license',
    sourceTermsUrl:'https://publisher.example/terms',sourceTermsVerifiedAt:'2026-10-10T05:00:00.000Z',
    approvedInputContentSha256:aiInputHash,aiContentSha256:aiBodyHash,articleSha256:crypto.createHash('sha256').update(aiHtml).digest('hex')
  });
  check('AI content with matching human review record accepted',0,/\"ok\": true/);
  write('content/factory-queue/komentari/test-odobrenje.html',aiHtml.replace('Publisher','Edited Publisher'));
  check('AI article changes after review are blocked by hash',1,/reviewed article hash mismatch/);
  write('content/factory-queue/komentari/test-odobrenje.html',aiHtml);
  fs.rmSync(path.join(root,'content/factory-queue/review-records/test-odobrenje.json'),{force:true});
  check('AI content without review sidecar blocked',1,/AI editorial approval record missing/);
  write('content/factory-queue/review-records/test-odobrenje.json',{status:'approved'});
  check('AI content without rights/review record blocked',1,/rights or risk assessment incomplete/);
  write('content/factory-queue/komentari/test-odobrenje.html',html);
  fs.rmSync(path.join(root,'content/factory-queue/review-records/test-odobrenje.json'),{force:true});

  write('apps/portal/data/editorial-registry.json',{items:[{path:'/komentari/test-odobrenje/'}]});
  check('duplicate route blocked',1,/duplicate public route/);
  write('apps/portal/data/editorial-registry.json',{items:[]});

  write('content/factory-queue/queue.json',{items:[item,{...item}],skipped:[]});
  check('duplicate queue ID blocked',1,/Duplicate queue ID/);
  write('content/factory-queue/queue.json',{items:[item],skipped:[]});

  fs.rmSync(path.join(root,'content/factory-queue/komentari/test-odobrenje.html'));
  check('missing source blocked',1,/missing source/);
  write('content/factory-queue/komentari/test-odobrenje.html',html);

  write('apps/portal/data/editorial-plan/manifest.json',{packages:[{id:'HOLD-1',files:['held.json']}]});
  write('apps/portal/data/editorial-plan/publication-holds.json',{holds:[{packageId:'HOLD-1',active:true}]});
  write('apps/portal/data/editorial-plan/held.json',[{slug:'test-odobrenje'}]);
  check('active editorial hold blocked',1,/active editorial hold/);
  write('apps/portal/data/editorial-plan/publication-holds.json',{holds:[]});

  write('apps/portal/data/content-queue-state.json','{broken json');
  const corrupt=run();
  assert.notEqual(corrupt.status,0,'corrupt state must fail');
  assert.match(corrupt.stderr,/SyntaxError|Unexpected/);
  console.log('PASS corrupt state blocked');
  passed++;

  write('apps/portal/data/content-queue-state.json',{version:'TEST',published:{'T-1':{path:'/komentari/test-odobrenje/'}}});
  check('already published item becomes safe no-op',0,/"due": 0/);

  console.log('TOTAL_PASS '+passed);
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
