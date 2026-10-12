import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=path.resolve('scripts/content-queue-preflight-v1.mjs');
const publisher=fs.readFileSync('scripts/content-queue-publish-v1.mjs','utf8');
assert.ok(fs.existsSync(script),'missing content queue preflight');
assert.match(publisher,/preflightContentQueue/);
assert.match(publisher,/zagrebOffsetFor/);
assert.doesNotMatch(publisher,/publishedAt=.*\+02:00/);

const root=fs.mkdtempSync(path.join(os.tmpdir(),'asg-content-queue-gate-'));
const write=(rel,value)=>{
  const target=path.join(root,rel);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value));
};
const item={id:'T-1',date:'2026-10-10',time:'07:00',category:'komentari',slug:'test-odobrenje'};
const canonical='https://gnk-asg.hr/komentari/test-odobrenje/';
const html='<html lang="hr"><head><link rel="canonical" href="'+canonical+'"></head><body><h1>Test</h1></body></html>';
const run=(now='2026-10-10T08:00:00+02:00')=>spawnSync(process.execPath,[script,root],{
  encoding:'utf8',
  env:{...process.env,ASG_EDITORIAL_NOW:now}
});
let passed=0;
function check(label,status,pattern){
  const r=run();
  assert.equal(r.status,status,label+': '+r.stdout+' '+r.stderr);
  assert.match(r.stdout+r.stderr,pattern,label);
  console.log('PASS '+label);
  passed++;
}
try{
  write('content/factory-queue/queue.json',{items:[item],skipped:[]});
  write('apps/portal/data/content-queue-state.json',{version:'TEST',published:{}});
  write('apps/portal/data/editorial-registry.json',{items:[]});
  write('content/factory-queue/komentari/test-odobrenje.html',html);

  check('safe due item accepted',0,/"ok": true/);

  write('apps/portal/data/editorial-registry.json',{items:[{path:'/komentari/test-odobrenje/'}]});
  check('duplicate route blocked',1,/duplicate public route/);
  write('apps/portal/data/editorial-registry.json',{items:[]});

  write('content/factory-queue/queue.json',{items:[item,{...item}],skipped:[]});
  check('duplicate queue ID blocked',1,/Duplicate queue ID/);
  write('content/factory-queue/queue.json',{items:[item],skipped:[]});

  fs.rmSync(path.join(root,'content/factory-queue/komentari/test-odobrenje.html'));
  check('missing source blocked',1,/missing source/);
  write('content/factory-queue/komentari/test-odobrenje.html',html);

  write('apps/portal/data/editorial-plan/manifest.json',{packages:[{id:'HOLD-1',files:['held.json']}]});
  write('apps/portal/data/editorial-plan/publication-holds.json',{holds:[{packageId:'HOLD-1',active:true}]});
  write('apps/portal/data/editorial-plan/held.json',[{slug:'test-odobrenje'}]);
  check('active editorial hold blocked',1,/active editorial hold/);
  write('apps/portal/data/editorial-plan/publication-holds.json',{holds:[]});

  write('apps/portal/data/content-queue-state.json','{broken json');
  const corrupt=run();
  assert.notEqual(corrupt.status,0,'corrupt state must fail');
  assert.match(corrupt.stderr,/SyntaxError|Unexpected/);
  console.log('PASS corrupt state blocked');
  passed++;

  write('apps/portal/data/content-queue-state.json',{version:'TEST',published:{'T-1':{path:'/komentari/test-odobrenje/'}}});
  check('already published item becomes safe no-op',0,/"due": 0/);

  console.log('TOTAL_PASS '+passed);
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
