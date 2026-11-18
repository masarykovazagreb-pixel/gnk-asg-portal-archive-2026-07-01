import { BEATS,topicDiscoveryStreams } from '../scripts/lib/aktual-rss-topics-v1.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planCountryDesks,verifyWritingEvidence,originalNewsBrief} from '../scripts/lib/aktual-original-desk-v1.mjs';
const countries=JSON.parse(readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const hr=countries.countries.find(x=>x.code==='HR');
const now=Date.parse('2026-11-18T12:00:00Z');
const when=new Date(now).toISOString();
const evidence={schema:'aktual-factual-evidence/v1',country:'hrvatska',language:'hr',
 verifiedAt:when,approvedAt:when,approvedBy:'Human editor',approvalScope:'drafting-only',
 sources:[
  {id:'official',url:'https://government.example.org/notice',publisher:'Official institution',checkedAt:when},
  {id:'independent',url:'https://publisher.example.net/report',publisher:'Independent news',checkedAt:when}
 ],facts:[
  {statement:'Official agency issued the public written notice today.',sourceIds:['official']},
  {statement:'The independent report confirms publication of the notice.',sourceIds:['independent']}
 ]};
test('201 unique desks, Croatia tenfold, 15 source requirement is measured',()=>{
 const plan=planCountryDesks(countries,null,now);
 assert.equal(plan.countries,201);
 assert.equal(plan.plannedDailyDrafts,1050);
 assert.equal(plan.published,0);
 assert.equal(new Set(plan.agents.map(x=>x.agentId)).size,201);
 assert.equal(plan.agents.find(x=>x.countryCode==='HR').draftTarget,50);
 assert.equal(plan.agents.find(x=>x.countryCode==='HR').lang,'hr');
 assert.equal(plan.countriesBelow15Sources,201);
 assert.equal(plan.agents.find(x=>x.countryCode==='HR').registeredRssSources,11);
});
test('RSS headline is only an unverified topic lead and cannot publish',()=>{
 const cache={updatedAt:when,countries:{hrvatska:[{title:'Source title',source:'Publisher',
  url:'https://example.org/story',publishedAt:when}]}};
 const p=planCountryDesks(countries,cache,now);
 const a=p.agents.find(x=>x.countryCode==='HR');
 assert.equal(a.unverifiedTopicLeads[0].evidenceVerified,false);
 assert.equal(a.unverifiedTopicLeads[0].imageRightsVerified,false);
 assert.equal(a.published,0);
});
test('original-writing brief rejects one source, stale facts and bot self-approval',()=>{
 assert.equal(verifyWritingEvidence(evidence,hr,'Human editor',now).ok,true);
 const brief=originalNewsBrief(evidence,hr,'Human editor',now);
 assert.equal(brief.mayPublish,false);
 assert.equal(brief.language,'hr');
 assert.equal(verifyWritingEvidence({...evidence,sources:evidence.sources.slice(0,1)},hr,'Human editor',now).ok,false);
 assert.equal(verifyWritingEvidence({...evidence,approvedBy:'Bot'},hr,'Human editor',now).ok,false);
 assert.equal(verifyWritingEvidence({...evidence,verifiedAt:'2020-01-01'},hr,'Human editor',now).ok,false);
});

test('21 diverse RSS topic lead streams for each country; aggregator != independent source',()=>{
 const croatia=topicDiscoveryStreams(hr);
 assert.equal(BEATS.length,21);
 assert.equal(croatia.length,21);
 assert.equal(new Set(croatia.map(x=>x.beat)).size,21);
 assert.equal(croatia[0].searchLanguage,'hr');
 assert.ok(croatia.some(x=>x.beat==='fashion'));
 assert.ok(croatia.some(x=>x.beat==='finance'));
 assert.ok(croatia.some(x=>x.beat==='sports'));
 assert.ok(croatia.every(x=>x.independentPublisher===false && x.sourceEvidenceVerified===false && x.fetchStatus==='UNVERIFIED'));
 assert.ok(croatia.every(x=>x.feed.startsWith('https://news.google.com/rss/search?')));
 const unknown=topicDiscoveryStreams({...hr,code:'FJ',language:'bi'});
 assert.equal(unknown[0].searchLanguage,'en');
 assert.equal(unknown[0].publicationLanguage,'bi');
 assert.equal(unknown[0].needsNativeLanguageVerification,true);
 const plan=planCountryDesks(countries,null,now);
 assert.equal(plan.thematicAggregatorStreams,4221);
 assert.equal(plan.agents.find(x=>x.countryCode==='HR').availableThematicDiscoveryStreams.length,21);
 assert.equal(plan.countriesBelow15Sources,201);
});
