import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCountryFeeds} from '../scripts/lib/aktual-world-selection-v1.mjs';
import {feedIdentity} from '../scripts/lib/aktual-world-feed-identity-v1.mjs';
const now=Date.parse('2026-11-26T12:00:00Z');
const direct={id:'local',name:'Local',language:'sr',rss:'https://local.example.com/rss'};
const other={id:'other',name:'Other',language:'sr',rss:'https://other.example.com/rss'};
const google={id:'google',name:'Google',language:'srp',rss:'https://news.google.com/rss'};
const country={language:'srp',sourcesList:[direct,other,google]};
const check=(source,hours,status)=>({feedId:source.id,feedFingerprint:feedIdentity(source.rss),checkedAt:new Date(now-hours*3600000).toISOString(),status});
test('temporarily demote a failed direct feed, then automatically retry it',()=>{
 const checks=[check(direct,1,'failed'),check(other,2,'headlines')];
 assert.deepEqual(selectCountryFeeds(country,3,{now,checks}).map(x=>x.id),['other','google','local']);
 assert.equal(selectCountryFeeds(country,1,{now:now+12*3600000,checks})[0].id,'local');
});
test('unknown local feeds rotate before healthy feeds; only configured safe sources are selected',()=>{
 assert.equal(selectCountryFeeds(country,1,{now,checks:[check(direct,1,'headlines')]})[0].id,'other');
 assert.deepEqual(selectCountryFeeds(country,3).map(x=>x.id),['local','other','google']);
});
test('single failed source is still attempted rather than permanently disabled',()=>{
 assert.equal(selectCountryFeeds({...country,sourcesList:[direct]},1,{now,checks:[check(direct,1,'failed')]}).length,1);
});
