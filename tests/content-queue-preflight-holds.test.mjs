import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {preflightContentQueue} from '../scripts/content-queue-preflight-v1.mjs';

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asg-queue-holds-'));
  function write(rel,value){
    const target=path.join(root,rel);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(value));
  }
  write('content/factory-queue/queue.json',{items:[],skipped:[]});
  write('apps/portal/data/content-queue-state.json',{published:{}});
  write('apps/portal/data/editorial-registry.json',{items:[]});
  return {root,write,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const manifest='apps/portal/data/editorial-plan/manifest.json';
const holds='apps/portal/data/editorial-plan/publication-holds.json';
const now=new Date('2026-10-18T08:00:00Z');

test('content queue fails closed when BOTH editorial guard documents are missing',()=>{
  const f=fixture();
  try{assert.throws(()=>preflightContentQueue({root:f.root,now}),/Missing required editorial manifest and publication holds/)}
  finally{f.cleanup()}
});
test('content queue fails closed if only holds are missing',()=>{
  const f=fixture();
  try{
    f.write(manifest,{packages:[]});
    assert.throws(()=>preflightContentQueue({root:f.root,now}),/Invalid publication holds/);
  }finally{f.cleanup()}
});
test('content queue fails closed if only manifest is missing',()=>{
  const f=fixture();
  try{
    f.write(holds,{holds:[]});
    assert.throws(()=>preflightContentQueue({root:f.root,now}),/Invalid editorial manifest/);
  }finally{f.cleanup()}
});
test('valid empty guard documents allow empty queue without publication',()=>{
  const f=fixture();
  try{
    f.write(manifest,{packages:[]});
    f.write(holds,{holds:[]});
    const result=preflightContentQueue({root:f.root,now});
    assert.equal(result.ok,true);
    assert.equal(result.due,0);
    assert.deepEqual(result.checked,[]);
  }finally{f.cleanup()}
});
