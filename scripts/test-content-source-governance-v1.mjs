import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
 CONTENT_SOURCE_POLICY_VERSION,
 buildContentProvenance,
 provenanceReviewFlags
} from '../workers/gnk-asg-direct-operator/src/content-source-policy-v1.js';
import {handleDigitalWorkforceSuite} from '../workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js';

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

const queueSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');
const writerSource=fs.readFileSync('workers/gnk-asg-ai-newsroom-writer/src/index.js','utf8');
const workforceSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js','utf8');
assert.match(queueSource,/buildContentProvenance/);
assert.match(queueSource,/invalid_source_provenance/);
assert.match(queueSource,/provenance:sourcePolicy\.provenance/);
assert.match(writerSource,/sourceClass:'external-publisher-link'/);
assert.match(writerSource,/usageBasis:'original-summary-with-link'/);
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
