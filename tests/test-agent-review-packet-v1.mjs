import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePacket } from '../apps/agents/operations/review-packet-v1.mjs';
import { checkCandidate } from '../apps/agents/operations/run-v1.mjs';
import { SCHEMA, APPROVER_ID } from '../apps/agents/lib/policy-v1.mjs';

const sha='a'.repeat(40);
const item={id:'pregled-test-2026-10-19',status:'approved-by-agent',items:[{title:'Vijest',url:'https://example.org/a'}],hr:{title:'Pregled'},en:{title:'Overview'},review:{reviewed_by:APPROVER_ID,decision:'approved'}};
const queue={schema:SCHEMA,run_date:'2026-10-19',governance:{approver:APPROVER_ID},items:[item]};
test('packet keeps machine result separate from real approval and remains blocked', () => {
  const p=preparePacket(queue,sha);
  assert.equal(p.status,'awaiting-human-review');
  assert.equal(p.published,false);
  assert.equal(p.candidates[0].approvedForPublication,false);
  assert.equal(p.candidates[0].candidate.sources[0].confirmed,false);
  assert.equal(p.candidates[0].candidate.visuals,null);
  assert.equal(p.candidates[0].candidate.editorialApproval,null);
  const dir=mkdtempSync(join(tmpdir(),'agent-packet-'));
  try { const file=join(dir,'candidate.json');writeFileSync(file,JSON.stringify(p.candidates[0].candidate));
    const result=checkCandidate(file,'2026-10-19');
    assert.equal(result.status,'blocked');
    assert.ok(result.checks.every(c=>c.status==='fail'));
  } finally {rmSync(dir,{recursive:true,force:true});}
  const changed=structuredClone(queue);changed.items[0].hr.title='Promjena';
  assert.notEqual(preparePacket(changed,sha).candidates[0].sourceDigest,p.candidates[0].sourceDigest);
});
test('reject invalid queues, forged states and duplicate ids', () => {
  assert.throws(()=>preparePacket({...queue,items:[item,item]},sha),/duplicate/);
  assert.throws(()=>preparePacket({...queue,items:[{...item,id:'../../podijeli/vijest'}]},sha),/Invalid/);
  assert.throws(()=>preparePacket({...queue,items:[{...item,review:{...item.review,decision:'rejected'}}]},sha),/Conflicting/);
  assert.throws(()=>preparePacket({...queue,governance:{}},sha),/Invalid/);
  assert.throws(()=>preparePacket(queue,'bad'),/SHA/);
  assert.equal(preparePacket({...queue,items:[]},sha).status,'no-candidates');
});
