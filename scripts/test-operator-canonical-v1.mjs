#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalHostRedirect} from '../workers/gnk-asg-direct-operator/src/canonical-host-redirect-v1.js';
const req=(host,path,method='GET')=>new Request('https://'+host+path,{method});
for(const path of ['/', '/gnk-aktual/','/gnk-aktual/izvori/','/aktual-media/','/nermin-sefic/','/kanal/zagreb/']){
  const r=canonicalHostRedirect(req('operator.gnk-asg.hr',path));
  if(path==='/') assert.equal(r,null,'Operator root is not redirected: private controls may live there');
  else {assert.equal(r?.status,308,path);assert.equal(new URL(r.headers.get('location')).hostname,'gnk-asg.hr');}
}
for(const path of ['/admin/','/api/status','/operator-dashboard/','/gnk-aktual/editor/','/gnk-aktual/admin/','/gnk-aktual/api/']){
 assert.equal(canonicalHostRedirect(req('operator.gnk-asg.hr',path)),null,'Private operator path must not redirect '+path);
}
assert.equal(canonicalHostRedirect(req('operator.gnk-asg.hr','/gnk-aktual/','POST')),null);
assert.equal(canonicalHostRedirect(req('gnk-asg.hr','/gnk-aktual/')),null);
assert.equal(canonicalHostRedirect(req('www.gnk-asg.hr','/gnk-aktual/')).status,308);
const withQuery=canonicalHostRedirect(req('operator.gnk-asg.hr','/gnk-aktual/?utm_source=google'));
assert.equal(withQuery.headers.get('location'),'https://gnk-asg.hr/gnk-aktual/?utm_source=google');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js','utf8');
assert.ok(worker.includes("h.set('x-robots-tag','noindex, follow')"),'Operator HTML must be noindex');
assert.ok(worker.includes('return stamp(await inject(request,truthful),request)'),'Header must reach production wrapper');
console.log(JSON.stringify({ok:true,operatorPublicRedirects:true,privateRoutesUntouched:true,operatorHtmlNoindex:true}));
