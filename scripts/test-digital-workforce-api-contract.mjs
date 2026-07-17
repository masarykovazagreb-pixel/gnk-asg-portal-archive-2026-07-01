import assert from 'node:assert/strict';
import {handleDigitalWorkforce,VERSION} from '../workers/gnk-asg-direct-operator/src/digital-workforce-api-v1.js';

const origin='https://gnk-asg.hr';
const jsonResponse=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const authenticatedApp={fetch:async()=>jsonResponse({authenticated:true})};
const rejectedApp={fetch:async()=>jsonResponse({authenticated:false},401)};
const call=(path,{method='GET',headers={},body,env={},app=authenticatedApp}={})=>handleDigitalWorkforce(new Request(origin+path,{method,headers,body}),env,{},app);
const body=async response=>response.json();

assert.match(VERSION,/DIGITAL_WORKFORCE_API_V2_20260717/);

{
  const response=await call('/api/public/digital-workforce/health',{method:'POST'});
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET, HEAD');
}
{
  const response=await call('/api/public/editor-desk',{method:'DELETE'});
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET, HEAD');
}
{
  const response=await call('/api/public/editor-desk',{method:'HEAD'});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'');
}
{
  const response=await call('/api/admin/editor-desk',{app:rejectedApp});
  assert.equal(response.status,401);
  assert.equal((await body(response)).error,'unauthorized');
}
{
  const response=await call('/api/admin/editor-desk',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(response.status,403);
  assert.equal((await body(response)).error,'invalid_origin');
}
{
  const response=await call('/api/admin/editor-desk',{method:'POST',headers:{origin,'content-type':'text/plain'},body:'{}'});
  assert.equal(response.status,415);
  assert.equal((await body(response)).error,'unsupported_media_type');
}
{
  const response=await call('/api/admin/editor-desk',{method:'POST',headers:{origin,'content-type':'application/json','content-length':'262145'},body:'{}'});
  assert.equal(response.status,413);
  assert.equal((await body(response)).error,'payload_too_large');
}
{
  const response=await call('/api/admin/editor-desk',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'});
  assert.equal(response.status,400);
  assert.equal((await body(response)).error,'invalid_json');
}
{
  const response=await call('/api/admin/editor-desk',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({package_date:'17-07-2026'})});
  assert.equal(response.status,503);
  assert.equal((await body(response)).error,'d1_unavailable');
}
{
  const response=await call('/not-owned');
  assert.equal(response,null);
}

console.log(JSON.stringify({ok:true,version:VERSION,publicMethods:['GET','HEAD'],adminMethods:['GET','POST','PUT'],maxBodyBytes:262144,origin:'same-origin-required-for-writes',auth:'explicit-authenticated-true'},null,2));
