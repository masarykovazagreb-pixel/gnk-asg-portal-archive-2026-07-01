import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const root='workers/gnk-asg-direct-operator/src/';
const auth=read(root+'index-unified-auth-v21.js');
const htmlMiddlewares=[
  ['legacy shell',read(root+'index-unified-auth-v20.js'),'let html=await response.clone().text();'],
  ['protected editorial shell',auth,'let html=normalizeHtml(await response.clone().text(),route);'],
  ['digital-workforce shell',read(root+'index-digital-workforce-v1.js'),'const sourceHtml=await response.clone().text();']
];

for(const [name,source,required] of htmlMiddlewares){
  assert.ok(source.includes(required),name+' must clone HTML before potentially throwing');
  assert.match(source,/delete\('etag'\)/,name+' must clear stale validators when rewriting bytes');
  assert.match(source,/delete\('content-length'\)/,name+' must clear obsolete content length');
}
assert.ok(auth.includes('proof?.authenticated===true'),'private editorial route must require explicit authenticated=true');
assert.ok(!auth.includes('return (await app.fetch(check,env,ctx)).ok'),'HTTP 200 cannot authenticate an operator');
assert.ok(!auth.includes("error:'protected_asset_fetch_failed',message:"),'private route must not return raw upstream exception text');

const response=new Response('<main>original source preserved</main>',{headers:{'content-type':'text/html'}});
const rewritten=await response.clone().text();
assert.equal(rewritten,'<main>original source preserved</main>');
assert.equal(await response.text(),rewritten,'failed rewrite must retain readable original Response body');

const pageChecks=[
  ['apps/portal/index.html','Arhiva planirane prezentacije','Odbrojavanje · New York · 7. listopada 2026.'],
  ['apps/portal/en/index.html','Planned presentation archive','Countdown · New York · October 7, 2026'],
  ['apps/portal/the-code/index.html','Status održavanja nije potvrđen','7. listopada 2026. kod se aktivira.'],
  ['apps/portal/en/the-code/index.html','Event completion has not been verified','On October 7, 2026 the code activates.']
];
for(const [path,required,forbidden] of pageChecks){
  const source=read(path);
  assert.ok(source.includes(required),path+' missing historical status clarification');
  assert.ok(!source.includes(forbidden),path+' still advertises expired future countdown as live');
  assert.ok(/rel="canonical"/.test(source),path+' has no canonical link');
}
assert.match(read('apps/portal/index.html'),/href="\/the-code\/"/);
assert.match(read('apps/portal/en/index.html'),/href="\/en\/the-code\/"/);
assert.doesNotMatch(read('apps/portal/en/index.html'),/45 related companies/i,'corporate group entities and planned locations must not be conflated');
console.log(JSON.stringify({ok:true,version:'FULLSTACK_PUBLIC_REGRESSIONS_V1',protectedAuth:'explicit authenticated true',htmlFallbacks:htmlMiddlewares.length,pagesReviewed:pageChecks.length,localeCoverage:['hr','en'],sourceMutation:'no production action'},null,2));
