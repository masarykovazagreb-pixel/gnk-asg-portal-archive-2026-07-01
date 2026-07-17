import assert from 'node:assert/strict';
import {handleDigitalWorkforceSuite,VERSION} from '../workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js';
const call=(path,method='GET')=>handleDigitalWorkforceSuite(new Request(`https://gnk-asg.hr${path}`,{method}));
assert.match(VERSION,/DIGITAL_WORKFORCE_SUITE_V1/);
const state=await (await call('/api/public/digital-workforce/state')).json();
assert.equal(state.ok,true);assert.equal(state.projects,9);assert.equal(state.workers,1573);assert.equal(state.bulletins,90);assert.equal(state.newsroom,42);
const workers=await (await call('/api/public/digital-workforce/workers?size=100')).json();
assert.equal(workers.total,1573);assert.equal(workers.items.length,100);
assert.equal(new Set(workers.items.map(x=>x.firstName)).size,100);
assert.equal(new Set(workers.items.map(x=>x.lastName)).size,100);
assert.equal(new Set(workers.items.map(x=>x.name)).size,100);
const all=[];for(let page=1;page<=16;page++){const data=await (await call(`/api/public/digital-workforce/workers?page=${page}&size=100`)).json();all.push(...data.items)}
assert.equal(all.length,1573);assert.equal(new Set(all.map(x=>x.firstName)).size,1573);assert.equal(new Set(all.map(x=>x.lastName)).size,1573);assert.equal(new Set(all.map(x=>x.name)).size,1573);
for(const route of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','log']){const response=await call(`/api/public/digital-workforce/${route}`);assert.equal(response.status,200,route);assert.equal((await response.json()).ok,true,route)}
assert.equal((await call('/api/public/digital-workforce/projects','POST')).status,405);
console.log(JSON.stringify({ok:true,version:VERSION,projects:state.projects,workers:state.workers,uniqueFirstNames:1573,uniqueLastNames:1573,subpages:11},null,2));
