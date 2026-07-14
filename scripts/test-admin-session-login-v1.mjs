import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync('workers/gnk-asg-contact-api-worker/src/index-session-cookie-v1.js','utf8');
const page=fs.readFileSync('apps/portal/admin-login/index.html','utf8');
for(const marker of [
 /GNK_ASG_SESSION_COOKIE_V3_20260714_JSON_CONTACT_LOGIN_LOGOUT/,
 /LOGIN_PATH='\/api\/operator-session-login'/,
 /LOGOUT_PATH='\/api\/operator-session-logout'/,
 /CONTACT_PATH='\/api\/contact-submit'/,
 /SESSION_TTL=60\*60\*8/,
 /await digest\(token\)/,
 /HttpOnly; Secure; SameSite=Strict/,
 /Max-Age=\$\{SESSION_TTL\}/,
 /operator-auth-check/,
 /invalid_credentials/,
 /normalizeContactRequest/,
 /application\/json/,
 /departmentKey/,
 /new FormData\(\)/,
 /x-gnk-contact-normalized/
])assert.match(worker,marker);
assert.doesNotMatch(worker,/localStorage|sessionStorage/);
for(const marker of [
 /id="loginForm"/,
 /type="password"/,
 /autocomplete="current-password"/,
 /\/api\/operator-session-login/,
 /credentials:'same-origin'/,
 /operator-auth-check/,
 /Token se ne pohranjuje u pregledniku/,
 /noindex,nofollow,noarchive/,
 /logo-gnk-asg-canonical\.svg/
])assert.match(page,marker);
assert.doesNotMatch(page,/localStorage|sessionStorage/);
assert.doesNotMatch(page,/location\.(?:href|assign)\s*=\s*[^;]*token/i);
assert.doesNotMatch(page,/[?&]token=/i);
console.log(JSON.stringify({ok:true,login:'/api/operator-session-login',logout:'/api/operator-session-logout',contactJsonNormalized:true,contactFormDataCompatible:true,sessionHours:8,httpOnly:true,secure:true,sameSite:'Strict',tokenStoredClientSide:false},null,2));
