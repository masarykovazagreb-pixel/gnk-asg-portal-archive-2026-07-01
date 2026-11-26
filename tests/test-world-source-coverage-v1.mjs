import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCoverage} from '../apps/agents/world201/source-coverage-v1.mjs';
import {feedIdentity} from '../scripts/lib/aktual-world-feed-identity-v1.mjs';
test('coverage separates local direct sources, aggregators, observations and rights',()=>{
 const now=Date.parse('2026-11-26T12:00:00Z');
 const registry={countries:[{slug:'test',language:'srp',url:'https://example.test/',sourcesList:[
 {id:'local',name:'Local',language:'sr',rss:'https://local.example.com/feed'},
 {id:'aggregator',name:'Google',language:'sr',rss:'https://news.google.com/rss'},
 {id:'foreign',name:'Foreign',language:'en',rss:'https://foreign.example.com/feed'}
 ]}]};
 const cache={updatedAt:'2026-11-26T11:00:00Z',sourceChecks:[{kind:'country',scope:'test',source:'Local',feedId:'local',feedFingerprint:feedIdentity('https://local.example.com/feed'),checkedAt:'2026-11-26T11:00:00Z',status:'headlines'}]};
 const r=sourceCoverage(registry,cache,{now});
 assert.equal(r.configuredFeeds,3);assert.equal(r.directFeeds,1);
 assert.equal(r.editions[0].uniqueDirectDomains,1);
 assert.equal(r.editions[0].aggregatorFeeds,1);
 assert.equal(r.editionsWithObservedDirect,1);
 assert.equal(r.sourceRightsVerified,0);
 const changed=structuredClone(registry);changed.countries[0].sourcesList[0].rss='https://local.example.com/replacement';
 assert.equal(sourceCoverage(changed,cache,{now}).editionsWithObservedDirect,0);
 const legacy={...cache,sourceChecks:[{kind:'country',scope:'test',source:'Local',status:'headlines'}]};
 assert.equal(sourceCoverage(registry,legacy,{now}).editionsWithObservedDirect,0);
 const failed={...cache,sourceChecks:[{...cache.sourceChecks[0],status:'failed',checkedAt:'2026-11-26T11:59:00Z'}]};
 assert.equal(sourceCoverage(registry,failed,{now}).editions[0].feeds[0].observation,'failed');
 assert.equal(r.productionPublicationsVerified,0);
 assert.equal(sourceCoverage(registry,cache,{now:now+86400000}).editionsWithObservedDirect,0);
});
