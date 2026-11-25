import test from 'node:test';
import assert from 'node:assert/strict';
import {RULES,triage} from '../scripts/triage-portal-gates-v1.mjs';

test('20 distinct rule identifiers',()=>{
 assert.equal(RULES.length,20);
 assert.equal(new Set(RULES.map(x=>x.id)).size,20);
});
test('real-world observed failure categories remain blocked',()=>{
 const log=[
  '→ Tvornica PAD (212s)',
  'FAIL missing entities: nermin_sefic: 10, gnk_dinamo_ltd: 10',
  'FAIL owner hashtags on 39092/39102 pages',
  'FAIL meta descriptions over 160 chars: 9',
  'FAIL radio promo block drift',
  '→ Osvježavanje PAD (0.3s) podatkovni dan u modulu nije 2026-11-23',
  'FAIL zapis kaže 17 gradova, podaci 18',
  '##[error]Ugovor o brendu: nema rel="icon"',
  '##[error]Mreža neovisnih izdanja: zastario izlaz — pokreni node apps/sites/build.mjs'
 ].join('\n');
 const out=triage(log,{sha:'a'.repeat(40),runId:'45238061183'});
 for(const name of ['MISSING_ENTITY','HASHTAG_DRIFT','META_LENGTH','RADIO_PROMO_DRIFT','STALE_REFRESH_LAYER','NETWORK_CITY_MISMATCH','FAVICON_BRAND','SITES_BUILD_DRIFT']){
  assert.ok(out.findings.some(x=>x.id===name),name);
 }
 assert.equal(out.sha,'a'.repeat(40));
 assert.equal(out.verdict,'GATE_BLOCKED_OR_REQUIRES_REVIEW');
 assert.equal(out.notProductionProof,true);
});
test('successful-looking text is never treated as LIVE proof',()=>{
 assert.equal(triage('All jobs completed successfully').verdict,'INSUFFICIENT_EVIDENCE_NOT_LIVE');
});
test('sensitive details of input logs never enter report',()=>{
 const output=JSON.stringify(triage('##[error] secret@example.com ghp_fake_token_123'));
 assert.ok(!output.includes('secret@example.com'));
 assert.ok(!output.includes('ghp_'));
 assert.equal(JSON.parse(output).uncategorizedFailureLines,1);
});
test('weekly HOLD is not auto-published and bad SHA is ignored',()=>{
 const out=triage('##[error] pending weekly HOLD',{sha:'main',runId:'unknown'});
 assert.equal(out.sha,null);
 assert.equal(out.runId,null);
 assert.equal(out.findings[0].id,'WEEKLY_EDITORIAL_HOLD');
 assert.equal(out.findings[0].priority,'HOLD');
});
