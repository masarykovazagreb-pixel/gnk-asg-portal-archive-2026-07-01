import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMediaAccess} from '../src/media-access-service-v2.js';
import {mediaAccessPreflight} from '../src/media-access-preflight-v1.js';

const url='https://gnk-asg.hr/api/media-access/admin/issue';
const body=JSON.stringify({live:true});

test('unauthorized live issue stops at auth preflight',async()=>{
  const response=await mediaAccessPreflight(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body}),{});
  assert.equal(response.status,401);
  assert.equal((await response.json()).error,'unauthorized');
});

test('authorized live issue reaches the delivery lock',async()=>{
  const headers={'content-type':'application/json',authorization:'Bearer test-secret'};
  const request=new Request(url,{method:'POST',headers,body});
  const preflight=await mediaAccessPreflight(request,{OPERATOR_TOKEN:'test-secret'});
  assert.equal(preflight,null);
  const response=await handleMediaAccess(request,{OPERATOR_TOKEN:'test-secret'});
  assert.equal(response.status,423);
  assert.equal((await response.json()).error,'live_access_issue_locked');
});
