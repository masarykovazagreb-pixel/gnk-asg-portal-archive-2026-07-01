import assert from 'node:assert/strict';
import app from '../src/index-unified-auth-v14.js';

const origin='https://gnk-asg.hr';
const token='review-test-token-not-a-secret';
const env={OPERATOR_TOKEN:token};
const ctx={waitUntil(){}};

async function readJson(response){return JSON.parse(await response.text());}

for(const route of [
  '/enterprise/','/mission-control/','/editorial-operations/','/registry-center/',
  '/deployment/','/mobile-admin/','/seo/','/design-review/','/language-review/',
  '/strategy-performance/','/entities/','/media-registration-admin/'
]){
  const response=await app.fetch(new Request(`${origin}${route}`),env,ctx);
  assert.equal(response.status,401,`${route} must require authentication`);
  assert.match(response.headers.get('cache-control')||'',/no-store/i);
  const body=await response.text();
  assert.match(body,/name="token"/i);
  assert.match(body,/noindex,nofollow/i);
}

for(const route of [
  '/api/editorial-operations/status','/api/registry-center/status','/api/deployment/status',
  '/api/mobile-admin/status','/api/seo/status','/api/strategy-performance/status',
  '/api/entities/status','/api/mission-control/status','/api/media-registration-admin/applications',
  '/api/media-registration-admin/application?mailCode=GNK-MEDIA-20260704-XX-OPENABC-001'
]){
  const response=await app.fetch(new Request(`${origin}${route}`),env,ctx);
  assert.equal(response.status,401,`${route} must return API 401`);
  const payload=await readJson(response);
  assert.equal(payload.error,'unauthorized');
}

const publicApplication=await app.fetch(new Request(`${origin}/media-application/?lang=en`),env,ctx);
assert.notEqual(publicApplication.status,401,'public media application must not require admin authentication');

const loginResponse=await app.fetch(new Request(`${origin}/api/operator-session/login`,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({token})
}),env,ctx);
assert.equal(loginResponse.status,200);
const loginPayload=await readJson(loginResponse.clone());
assert.equal(loginPayload.authenticated,true);
assert.equal(loginPayload.expiresIn,43200);
const setCookie=loginResponse.headers.get('set-cookie')||'';
assert.match(setCookie,/gnk_asg_admin_session=/);
assert.match(setCookie,/HttpOnly/i);
assert.match(setCookie,/Secure/i);
assert.match(setCookie,/SameSite=Strict/i);
assert.match(setCookie,/Max-Age=43200/i);

const cookiePair=setCookie.split(';')[0];
const sessionCheck=await app.fetch(new Request(`${origin}/api/operator-auth-check`,{
  headers:{cookie:cookiePair}
}),env,ctx);
assert.equal(sessionCheck.status,200);
const sessionPayload=await readJson(sessionCheck);
assert.equal(sessionPayload.authenticated,true);
assert.equal(sessionPayload.mode,'session');

const bearerCheck=await app.fetch(new Request(`${origin}/api/operator-auth-check`,{
  headers:{authorization:`Bearer ${token}`}
}),env,ctx);
assert.equal(bearerCheck.status,200);
assert.match(bearerCheck.headers.get('set-cookie')||'',/gnk_asg_admin_session=/);

const invalidCheck=await app.fetch(new Request(`${origin}/api/operator-auth-check`,{
  headers:{authorization:'Bearer wrong-token'}
}),env,ctx);
assert.equal(invalidCheck.status,401);

const redirectResponse=await app.fetch(new Request(`${origin}/admin-login/?next=${encodeURIComponent('//evil.example/')}`,{
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({token})
}),env,ctx);
assert.equal(redirectResponse.status,303);
assert.equal(redirectResponse.headers.get('location'),'/admin-center/');

console.log('UNIFIED_AUTH_ENTERPRISE_SCOPE_OK');
