import test from 'node:test';
import assert from 'node:assert/strict';
import {decideWeeklyGate} from '../scripts/check-aktual-weekly-materialization-v1.mjs';
const old={issue_week:'2026-11-09',curation_digest:'sha',sections:[{},{},{},{},{}],counts:{selected_items:8}};
test('verified new issue must run canonical digest check',()=>{
 assert.equal(decideWeeklyGate({ready:true,issue_week:'2026-11-16'},old),'verify');
});
test('missing new curated issue retains last complete published issue',()=>{
 assert.equal(decideWeeklyGate({ready:false,issue_week:'2026-11-16',curated_count:0,required:8},old),'hold');
});
test('never hold an invalid or same-week issue',()=>{
 assert.throws(()=>decideWeeklyGate({ready:false,issue_week:'2026-11-16',curated_count:0,required:8},{...old,issue_week:'2026-11-16'}));
 assert.throws(()=>decideWeeklyGate({ready:false,issue_week:'2026-11-16',curated_count:0,required:8},{...old,sections:[]}));
});
test('never ignore inconsistent curation readiness',()=>{
 assert.throws(()=>decideWeeklyGate({ready:false,issue_week:'2026-11-16',curated_count:8,required:8},old));
});
