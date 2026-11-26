import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalHostRedirect} from '../workers/gnk-asg-direct-operator/src/canonical-host-redirect-v1.js';

const redirects=await readFile('apps/portal/_redirects','utf8');
assert.doesNotMatch(redirects,/^https?:\/\//m,'static redirect sources must be relative');
assert.match(redirects,/^\/visual-index\/\?lang=en \/en\/visual-index\/ 301$/m);

for(const method of ['GET','POST']){
  const response=canonicalHostRedirect(new Request('http://www.gnk-asg.hr/visual-index/?lang=en',{method}));
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://gnk-asg.hr/visual-index/?lang=en');
}

assert.equal(canonicalHostRedirect(new Request('https://gnk-asg.hr/contact/')),null);

// Exact public routes only; preserve the operator root and authenticated writes.
for(const path of ['/gnk-aktual/','/nermin-sefic/','/en/nermin-sefic/','/about/','/en/about/','/objave/','/en/publications/','/intelligence-desk/','/mreza/']){
 for(const method of ['GET','HEAD']){
  const response=canonicalHostRedirect(new Request('https://operator.gnk-asg.hr'+path+'?ref=search',{method}));
  assert.equal(response?.status,308,path);
  assert.equal(response.headers.get('location'),'https://gnk-asg.hr'+path+'?ref=search');
 }
 assert.equal(canonicalHostRedirect(new Request('https://operator.gnk-asg.hr'+path,{method:'POST'})),null);
}
for(const path of ['/','/admin/','/api/public-news','/nermin-sefic/private/','/about/preview/']){
 assert.equal(canonicalHostRedirect(new Request('https://operator.gnk-asg.hr'+path)),null,path);
}
console.log('Canonical public entity and www redirects: PASS');
