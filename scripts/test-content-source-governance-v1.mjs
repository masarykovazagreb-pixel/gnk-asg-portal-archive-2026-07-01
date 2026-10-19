import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
 CONTENT_SOURCE_POLICY_VERSION,
 buildContentProvenance,
 provenanceReviewFlags
} from '../workers/gnk-asg-direct-operator/src/content-source-policy-v1.js';
import {handleDigitalWorkforceSuite} from '../workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js';
import {handleNewsAutoPublication} from '../workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js';

const at='2026-07-19T10:00:00.000Z';
const firstParty=buildContentProvenance({sourceClass:'first-party',sourceName:'GNK ASG'},{category:'official-update',at});
assert.deepEqual(firstParty.errors,[]);
assert.equal(firstParty.autoEligible,true);
assert.equal(firstParty.provenance.usageBasis,'first-party-original');
assert.deepEqual(provenanceReviewFlags(firstParty.provenance),[]);

const incompleteOfficial=buildContentProvenance({
 sourceClass:'official-api',
 sourceName:'Official Provider',
 sourceUrl:'https://official.example/api'
},{category:'source-summary-markets',at});
assert.equal(incompleteOfficial.autoEligible,false);
assert.ok(incompleteOfficial.flags.includes('official-free-tier-required'));
assert.ok(incompleteOfficial.flags.includes('official-terms-review'));
assert.ok(incompleteOfficial.flags.includes('official-rate-policy-required'));

const verifiedOfficial=buildContentProvenance({
 sourceClass:'official-api',
 sourceName:'Official Provider',
 sourceUrl:'https://official.example/api',
 sourceTermsUrl:'https://official.example/terms',
 sourceLicense:'official-open-data-terms',
 sourceAccessTier:'free',
 sourceTermsVerifiedAt:at,
 sourceRatePolicy:{maxRequests:100,windowSeconds:3600,cacheTtlSeconds:900}
},{category:'source-summary-markets',at});
assert.deepEqual(verifiedOfficial.errors,[]);
assert.deepEqual(verifiedOfficial.flags,[]);
assert.equal(verifiedOfficial.autoEligible,true);
assert.equal(verifiedOfficial.provenance.ratePolicy.enforcement,'central-worker');

const publisherLink=buildContentProvenance({
 sourceClass:'external-publisher-link',
 sourceName:'Publisher',
 sourceUrl:'https://publisher.example/story',
 usageBasis:'original-summary-with-link'
},{category:'commentary',at});
assert.equal(publisherLink.autoEligible,false);
assert.ok(publisherLink.flags.includes('external-publisher-manual-review'));

const missingExternalUrl=buildContentProvenance({
 sourceClass:'official-feed',
 sourceName:'Official Feed'
},{category:'source-summary-business',at});
assert.ok(missingExternalUrl.errors.includes('external-source-url-required'));

const mislabeledFirstPartySummary=buildContentProvenance({
 sourceClass:'first-party',
 sourceName:'GNK ASG'
},{category:'source-summary-business',at});
assert.ok(mislabeledFirstPartySummary.errors.includes('source-summary-external-source-required'));

const memory=new Map();
const kv={
 async get(key){return memory.has(key)?memory.get(key):null},
 async put(key,value){memory.set(key,value)},
 async delete(key){memory.delete(key)}
};
const enqueue=payload=>handleNewsAutoPublication(new Request('https://gnk-asg.hr/api/news-auto-publication/enqueue',{
 method:'POST',
 headers:{'content-type':'application/json'},
 body:JSON.stringify(payload)
}),{GNK_ASG_KV:kv});

const firstPartyResponse=await enqueue({
 title:'Interna operativna objava',
 summary:'Potvrđen first-party operativni napredak i sljedeći kontrolirani korak.',
 imageUrl:'/assets/editorial/generated/first-party-source-policy.svg',
 category:'official-update',
 sourceClass:'first-party',
 sourceName:'GNK ASG'
});
assert.equal(firstPartyResponse.status,200);
const firstPartyPost=(await firstPartyResponse.json()).post;
assert.equal(firstPartyPost.status,'queued');
assert.equal(firstPartyPost.provenance.sourceClass,'first-party');

const externalResponse=await enqueue({
 title:'Komentar vanjskog izvora',
 summary:'Izvorni urednički komentar temeljen na jasno povezanom vanjskom članku.',
 imageUrl:'/assets/editorial/generated/external-source-policy.svg',
 category:'commentary',
 sourceClass:'external-publisher-link',
 sourceName:'Publisher',
 sourceUrl:'https://publisher.example/story?utm_source=test',
 usageBasis:'original-summary-with-link'
});
assert.equal(externalResponse.status,200);
const externalPost=(await externalResponse.json()).post;
assert.equal(externalPost.status,'manual_review');
assert.equal(externalPost.sourceUrl,'https://publisher.example/story');
assert.ok(externalPost.reviewFlags.includes('source-policy-review'));
assert.equal(externalPost.author,'AKTUAL MEDIA uredništvo');
assert.equal(externalPost.editorialApproval,null);

const licensedButUnreviewedCommentaryResponse=await enqueue({
 title:'Komentar koji čeka stvarnu provjeru',
 summary:'Komentar se temelji na licenciranom vanjskom izvoru, ali još nema zabilježenu ljudsku uredničku provjeru i zasebno odobrenje.',
 imageUrl:'/assets/editorial/generated/commentary-human-review-policy.svg',
 category:'commentary',
 sourceClass:'licensed-external',
 sourceName:'Publisher',
 sourceUrl:'https://publisher.example/licensed-commentary',
 sourceTermsUrl:'https://publisher.example/terms',
 sourceLicense:'publisher-reviewed-license',
 sourceTermsVerifiedAt:at
});
assert.equal(licensedButUnreviewedCommentaryResponse.status,200);
const licensedCommentary=(await licensedButUnreviewedCommentaryResponse.json()).post;
assert.equal(licensedCommentary.status,'manual_review');
assert.ok(licensedCommentary.reviewFlags.includes('editorial-review-required'));
assert.equal(licensedCommentary.editorialApproval,null);

const aiSourceSummaryResponse=await enqueue({
 title:'Izvorni AI nacrt za provjeru',
 summary:'Kratki izvorni opis događaja služi isključivo kao kontekst za nacrt i ne predstavlja dopuštenje za automatsku objavu.',
 content:'AI-potpomognuti urednički nacrt čeka sadržajnu provjeru odgovornog urednika.',
 imageUrl:'/assets/editorial/generated/ai-source-summary-policy.svg',
 category:'source-summary-business',
 sourceClass:'licensed-external',
 sourceName:'Licensed Publisher',
 sourceUrl:'https://publisher.example/business-story',
 sourceTermsUrl:'https://publisher.example/terms',
 sourceLicense:'publisher-reviewed-feed-license',
 sourceTermsVerifiedAt:at,
 usageBasis:'limited-feed-metadata-original-commentary-with-link',
 aiGovernance:{
  usedAI:true,role:'deployer',purpose:'Draft for human review',riskClassification:'not-high-risk',
  prohibitedUse:false,prohibitedUseScreenPassed:true,privacyAndRightsReviewed:false,
  publicInterest:true,generatesOrAltersText:true,deepfake:false,
  humanEditorialReview:null,disclosure:{visible:true,text:'AI-potpomognuti nacrt; čeka ljudsku provjeru.'}
 }
});
assert.equal(aiSourceSummaryResponse.status,200);
const aiSourceSummaryPost=(await aiSourceSummaryResponse.json()).post;
assert.equal(aiSourceSummaryPost.status,'manual_review');
assert.ok(aiSourceSummaryPost.reviewFlags.includes('ai-human-editorial-review-required'));
assert.ok(aiSourceSummaryPost.reviewFlags.includes('ai-rights-review-required'));
assert.ok(aiSourceSummaryPost.reviewFlags.includes('editorial-review-required'));
assert.equal(aiSourceSummaryPost.editorialApproval,null,'an enqueue request cannot forge approval');

const aiGeneratedNotMarkedPublicInterestResponse=await enqueue({
 title:'AI tekst bez public-interest oznake',
 summary:'Ovaj test osigurava da svaka AI-generirana objavna proza traži ljudsku provjeru, čak i ako podnositelj ne označi temu kao javni interes.',
 imageUrl:'/assets/editorial/generated/ai-not-public-interest-policy.svg',
 category:'source-summary-entertainment',
 sourceClass:'licensed-external',
 sourceName:'Licensed Publisher',
 sourceUrl:'https://publisher.example/low-public-interest-story',
 sourceTermsUrl:'https://publisher.example/terms',
 sourceLicense:'publisher-reviewed-feed-license',
 sourceTermsVerifiedAt:at,
 usageBasis:'limited-feed-metadata-original-commentary-with-link',
 aiGovernance:{
  usedAI:true,role:'deployer',purpose:'Draft for human review',riskClassification:'unassessed',
  prohibitedUse:false,prohibitedUseScreenPassed:true,privacyAndRightsReviewed:false,
  publicInterest:false,generatesOrAltersText:true,deepfake:false,
  humanEditorialReview:null,disclosure:{visible:true,text:'AI-potpomognuti nacrt; čeka ljudsku provjeru.'}
 }
});
assert.equal(aiGeneratedNotMarkedPublicInterestResponse.status,200);
const aiNotPublicInterestPost=(await aiGeneratedNotMarkedPublicInterestResponse.json()).post;
assert.equal(aiNotPublicInterestPost.status,'manual_review');
assert.ok(aiNotPublicInterestPost.reviewFlags.includes('ai-human-editorial-review-required'));

const invalidSummaryResponse=await enqueue({
 title:'Sažetak bez izvora',
 summary:'Ovaj sažetak nema obvezni vanjski izvor i zato mora biti odbijen.',
 imageUrl:'/assets/editorial/generated/missing-source-policy.svg',
 category:'source-summary-business',
 sourceClass:'first-party',
 sourceName:'GNK ASG'
});
assert.equal(invalidSummaryResponse.status,400);
assert.equal((await invalidSummaryResponse.json()).error,'invalid_source_provenance');

const queueSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');
const writerSource=fs.readFileSync('workers/gnk-asg-ai-newsroom-writer/src/index.js','utf8');
const workforceSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js','utf8');
assert.match(queueSource,/buildContentProvenance/);
assert.match(queueSource,/invalid_source_provenance/);
assert.match(queueSource,/provenance:sourcePolicy\.provenance/);
assert.match(writerSource,/sourceClass:\s*'external-publisher-link'/);
assert.match(writerSource,/usageBasis:\s*'limited-feed-metadata-original-commentary-with-link'/);
assert.match(writerSource,/humanEditorialReview: null/);
assert.match(writerSource,/externalComments: false/);
assert.equal(firstPartyPost.author,'AKTUAL MEDIA uredništvo','dynamic queue defaults to a neutral editorial desk rather than inventing personal authorship');
assert.equal(firstPartyPost.editorialApproval,null,'the API must not fabricate an editorial approval record');
assert.match(workforceSource,/identityType:'synthetic-digital-worker'/);
assert.match(workforceSource,/digital-workforce-bulletin/);
assert.match(workforceSource,/digital-workforce-newsroom/);

const workersResponse=await handleDigitalWorkforceSuite(new Request('https://gnk-asg.hr/api/public/digital-workforce/workers?size=20'));
const workers=await workersResponse.json();
assert.equal(workers.sourcePolicyVersion,CONTENT_SOURCE_POLICY_VERSION);
assert.equal(workers.items[0].identityType,'synthetic-digital-worker');
assert.equal(workers.items[0].provenance.sourceClass,'first-party');

const bulletinResponse=await handleDigitalWorkforceSuite(new Request('https://gnk-asg.hr/api/public/digital-workforce/bulletins'));
const bulletins=await bulletinResponse.json();
assert.ok(bulletins.items.length>=1);
assert.equal(bulletins.items[0].provenance.recordType,'digital-workforce-bulletin');

const newsroomResponse=await handleDigitalWorkforceSuite(new Request('https://gnk-asg.hr/api/public/digital-workforce/newsroom'));
const newsroom=await newsroomResponse.json();
assert.equal(newsroom.items[0].provenance.recordType,'digital-workforce-newsroom');

console.log(JSON.stringify({
 ok:true,
 version:CONTENT_SOURCE_POLICY_VERSION,
 automated:['first-party','verified official-api','verified official-feed','verified licensed-external'],
 manualReview:['external-publisher-link','unverified terms','missing rate policy'],
 governed:['workers','bulletins','newsroom','posts','source summaries','commentaries']
},null,2));
