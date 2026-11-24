import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {decideWeeklyGate} from '../scripts/check-aktual-weekly-materialization-v1.mjs';
const curation={issue_week:'2026-11-09',items:Array.from({length:8},(_,i)=>({
  url:'https://example.org/editorial/'+i,source:'Fixture publisher',
  verified_facts:['Fixture claim'],section:'kultura'
}))};
const digest=createHash('sha256').update(JSON.stringify(curation)).digest('hex');
const published={issue_week:'2026-11-09',curation_digest:digest,
  sections:Array.from({length:5},(_,i)=>({items:curation.items.slice(i===0?0:i+3,i===0?4:i+4)
    .map(x=>({url:x.url,source:x.source,title:'Reviewed fixture'}))})),
  counts:{selected_items:8}
};
const pending={ready:false,issue_week:'2026-11-23',curated_count:0,required:8};
test('archive hold is explicit and only for a complete matching curated issue',()=>{
  assert.equal(decideWeeklyGate(pending,published,curation),'hold-archived');
});
test('new curated weekly issue still requires canonical exact materialization',()=>{
  assert.equal(decideWeeklyGate({ready:true,issue_week:'2026-11-23'},published,curation),'verify-current');
});
test('same-week and future-dated archive must not be held',()=>{
  assert.throws(()=>decideWeeklyGate(pending,{...published,issue_week:'2026-11-23'},curation));
  assert.throws(()=>decideWeeklyGate(pending,{...published,issue_week:'2026-11-30'},curation));
});
test('archive with altered curation digest fails closed',()=>{
  assert.throws(()=>decideWeeklyGate(pending,{...published,curation_digest:'forged'},curation),/digest mismatch/);
  assert.throws(()=>decideWeeklyGate(pending,published,{...curation,issue_week:'2026-11-16'}));
});
test('no hold for missing evidence, missing content or fabricated URLs',()=>{
  const unsafe={...curation,items:curation.items.map(x=>({...x,verified_facts:[]}))};
  assert.throws(()=>decideWeeklyGate(pending,published,unsafe));
  assert.throws(()=>decideWeeklyGate(pending,{...published,counts:{selected_items:0}},curation));
  const invalidSections=published.sections.map(s=>({items:s.items.map(x=>({...x,url:'http://invalid.example/page'}))}));
  assert.throws(()=>decideWeeklyGate(pending,{...published,sections:invalidSections},curation));
});
test('inconsistent readiness can never be softened',()=>{
  assert.throws(()=>decideWeeklyGate({...pending,curated_count:8},published,curation));
  assert.throws(()=>decideWeeklyGate({...pending,required:7},published,curation));
});
