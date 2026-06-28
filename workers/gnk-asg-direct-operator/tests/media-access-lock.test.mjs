import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMediaAccess} from '../src/media-access-service-v2.js';

test('live issue remains locked',async()=>{
  const response=await handleMediaAccess(new Request('https://gnk-asg.hr/api/media-access/admin/issue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({live:true})}),{});
  assert.equal(response.status,423);
  const payload=await response.json();
  assert.equal(payload.error,'live_access_issue_locked');
});
