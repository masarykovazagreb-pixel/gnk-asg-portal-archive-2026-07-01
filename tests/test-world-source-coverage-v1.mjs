import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCoverage} from '../apps/agents/world201/source-coverage-v1.mjs';
test('coverage separates local direct sources, aggregators, observations and rights',()=>{
 const now=Date.parse('2026-11-26T12:00:00Z');
 const registry={countries:[{slug:'test',language:'srp',url:'https://example.test/',sourcesList:[
 {id:'local',name:'Local',language:'sr',rss:'https://local.example/feed'},
 {id:'aggregator',name:'Google',language:'sr',rss:'https://news.google.com/rss'},
 {id:'foreign',name:'Foreign',language:'en',rss:'https://foreign.example/feed'}
 ]}]};
 const cache={updatedAt:'2026-11-26T11:00:00Z',sourceChecks:[{kind:'country',scope:'test',source:'Local',status:'headlines'}]};
 const r=sourceCoverage(registry,cache,{now});
 assert.equal(r.configuredFeeds,3);assert.equal(r.directFeeds,1);
 assert.equal(r.editions[0].uniqueDirectDomains,1);
 assert.equal(r.editions[0].aggregatorFeeds,1);
 assert.equal(r.editionsWithObservedDirect,1);
 assert.equal(r.sourceRightsVerified,0);
 assert.equal(r.productionPublicationsVerified,0);
 assert.equal(sourceCoverage(registry,cache,{now:now+86400000}).editionsWithObservedDirect,0);
});
