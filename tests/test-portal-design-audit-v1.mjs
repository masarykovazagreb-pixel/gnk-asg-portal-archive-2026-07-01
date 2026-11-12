import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('read-only design inventory distinguishes source markers, redirects and scopes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'design-inventory-'));
 try{
  for(const [file,html] of Object.entries({
   'gnk-aktual/media/one/index.html':'<html><head><meta name="viewport" content="width=device-width"></head><body><a class="skip" href="#main">Skip to content</a><main id="main"><h1>Title</h1></main></body></html>',
   'admin/index.html':'<html><head></head><body><h1>Admin</h1></body></html>',
   'old/index.html':'<html><head><meta http-equiv="refresh" content="0;url=/"></head><body></body></html>',
   'test-results/ignored.html':'<html></html>'
  })){const dest=path.join(tmp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);}
  const before=fs.readFileSync(path.join(tmp,'admin/index.html'),'utf8');
  const run=spawnSync(process.execPath,['scripts/audit-portal-design-basics-v1.mjs',tmp],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout);assert.equal(result.groups['world-directory-and-editions'].counts.missingMain,0);assert.equal(result.groups['world-directory-and-editions'].counts.missingSkipCandidate,0);assert.equal(result.groups['admin-and-tools'].counts.missingViewport,1);assert.equal(result.groups['other-portal-routes'].redirectCandidates,1);assert.equal(fs.readFileSync(path.join(tmp,'admin/index.html'),'utf8'),before);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
