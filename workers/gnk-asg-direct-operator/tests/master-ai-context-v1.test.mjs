import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMasterAiContext} from '../src/master-ai-context-v1.js';

const url='https://gnk-asg.hr/api/master-ai/v1/context';
const app = (authenticated=true) => ({
  async fetch(req) {
    assert.equal(new URL(req.url).pathname,'/api/operator-auth-check');
    return new Response(JSON.stringify({authenticated}),{status:200,headers:{'content-type':'application/json'}});
  }
});
const request=(path=url,method='GET')=>new Request(path,{method});
test('non MASTER AI requests are not intercepted',async()=>{
  assert.equal(await handleMasterAiContext(request('https://gnk-asg.hr/'),{},null,app()),null);
});
test('authentication fails closed',async()=>{
  for(const impl of [null,app(false),{fetch:async()=>{throw Error('network failure')}}]){
    const res=await handleMasterAiContext(request(),{},null,impl);
    assert.equal(res.status,401);
    assert.equal(res.headers.get('cache-control'),'private, no-store, max-age=0');
  }
});
test('authenticated context never invents operational data',async()=>{
  const res=await handleMasterAiContext(request(),{},null,app());
  const body=await res.json();
  assert.equal(res.status,200);
  assert.equal(body.health.status,'unknown');
  assert.equal(body.stale,true);
  assert.equal(body.completeness,'unavailable');
  assert.equal(body.writer_sha,null);
  assert.equal(body.production_sha,null);
  assert.equal(body.synchronized,null);
  assert.deepEqual(body.tasks,[]);
});
test('different SHA values never produce synchronized status',async()=>{
  const env={
    MASTER_AI_WRITER_SHA:'a'.repeat(40),
    MASTER_AI_PRODUCTION_SHA:'b'.repeat(40),
    MASTER_AI_PRODUCTION_VERIFIED_AT:'2026-11-13T08:00:00Z',
    MASTER_AI_PRODUCTION_EVIDENCE_SOURCE:'independent-live-http'
  };
  const res=await handleMasterAiContext(request(),env,null,app());
  const body=await res.json();
  assert.equal(body.synchronized,false);
  assert.equal(body.production_sha,'b'.repeat(40));
  assert.equal(body.evidence.production.verification_level,'declared-not-cross-checked');
});
test('unverified production SHA stays null',async()=>{
  const res=await handleMasterAiContext(request(),{
    MASTER_AI_PRODUCTION_SHA:'b'.repeat(40)
  },null,app());
  assert.equal((await res.json()).production_sha,null);
});
test('route refuses writes without calling auth or dispatch',async()=>{
  let count=0;
  const res=await handleMasterAiContext(request(url,'POST'),{},null,{fetch:()=>{count++;throw Error('must not run')}});
  assert.equal(res.status,405);
  assert.equal(count,0);
  assert.equal(res.headers.get('allow'),'GET, HEAD');
});
test('HEAD suppresses body',async()=>{
  const res=await handleMasterAiContext(request(url,'HEAD'),{},null,app());
  assert.equal(res.status,200);
  assert.equal(await res.text(),'');
});
test('tasks and audit clearly mark unknown completeness',async()=>{
  for(const kind of ['tasks','audit']){
    const res=await handleMasterAiContext(request('https://gnk-asg.hr/api/master-ai/v1/'+kind),{},null,app());
    const data=await res.json();
    assert.equal(data.completeness,'unavailable');
    assert.equal(data.stale,true);
  }
});
