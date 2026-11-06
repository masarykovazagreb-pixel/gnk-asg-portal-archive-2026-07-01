import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { updateSections } from './sync-factory-view-v1.mjs';
const center = '<!-- factory-center-v1:start -->novi centar<!-- factory-center-v1:end -->';
const world = '<!-- world-directory-v1:start -->novi svijet<!-- world-directory-v1:end -->';
const old = 'sloj prije<!-- factory-center-v1:start -->staro<!-- factory-center-v1:end -->sloj između<!-- world-directory-v1:start -->staro<!-- world-directory-v1:end -->sloj poslije';
test('zamjena čuva sve izvan dviju cjelina i idempotentna je', () => {
  const next = updateSections(old,center,world);
  assert.equal(next,`sloj prije${center}sloj između${world}sloj poslije`);
  assert.equal(updateSections(next,center,world),next);
});
test('nedostajuće, obrnute ili ponovljene oznake prekidaju sinkronizaciju', () => {
  assert.throws(()=>updateSections('bez oznaka',center,world));
  assert.throws(()=>updateSections(old+'<!-- world-directory-v1:start -->',center,world));
  assert.throws(()=>updateSections(old.replace('<!-- factory-center-v1:end -->',''),center,world));
});
test('postojeći prikaz odgovara izvorima bez promjene datoteke', () => {
  const path='apps/portal/agenti/index.html';
  const before=execFileSync('git',['hash-object',path],{encoding:'utf8'});
  const result=spawnSync(process.execPath,['scripts/factory/sync-factory-view-v1.mjs','--check'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(execFileSync('git',['hash-object',path],{encoding:'utf8'}),before);
});
