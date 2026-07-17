import assert from 'node:assert/strict';
import fs from 'node:fs';

const path='apps/portal/assets/protected-operations-v1.js';
const source=fs.readFileSync(path,'utf8');

for(const marker of [
  'GNK_ASG_PROTECTED_OPERATIONS_V2_20260717_FAIL_CLOSED_SESSION',
  "result.ok&&result.body?.authenticated===true",
  "if(!await session())return",
  "location.replace(",
  "/admin-login/?next=",
  "credentials:'same-origin'",
  "cache:'no-store'",
  "dataset.gnkProtectedOperations='checking'",
  "v2-authorized"
])assert.equal(source.includes(marker),true,`missing protected-session marker: ${marker}`);

assert.equal(source.includes("if(result.ok){host.dataset.state='ok'"),false,'HTTP success alone must not unlock operations');
assert.ok(source.indexOf("if(!await session())return")<source.indexOf("for(const row of document.querySelectorAll('[data-health-url]'))"),'session gate must precede every health call');

const pages=[
  'apps/portal/worker-ops/index.html',
  'apps/portal/operator-dashboard/index.html',
  'apps/portal/admin-center/operations/index.html',
  'apps/portal/admin-center/workers/index.html',
  'apps/portal/admin-center/infrastructure/index.html',
  'apps/portal/admin-center/health/index.html'
];
for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  assert.match(html,/data-ops-session/,`${page} missing session host`);
  assert.match(html,/protected-operations-v1\.js/,`${page} missing shared session guard`);
  assert.match(html,/noindex,nofollow,noarchive/,`${page} missing private robots contract`);
}

console.log(JSON.stringify({ok:true,version:'v2',pages:pages.length,session:'explicit-authenticated-true',healthBeforeAuth:false,redirect:'/admin-login/'},null,2));
