import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareArchive } from './archive-compare-v1.mjs';
const row=(slug,title='Naslov')=>({slug,title,date:'2026-11-01',url:'https://example.test/a',source:'example'});
test('čuva jedinstvene zapise i prijavljuje sadržajne razlike',()=>{
  const a=[row('samo-lijevo'),row('isti'),row('promijenjen','A')];
  const b=[row('samo-desno'),row('isti'),row('promijenjen','B')];
  const x=compareArchive(a,b);
  assert.deepEqual(x.onlyLeft,['samo-lijevo']); assert.deepEqual(x.onlyRight,['samo-desno']);
  assert.equal(x.common,2);assert.deepEqual(x.differing,[{slug:'promijenjen',fields:['title']}]);
  assert.equal(a.length,3);assert.equal(b.length,3);
});
test('nevaljane i duplirane zapise ne skriva',()=>{
  const x=compareArchive([row('isti'),row('isti')],[]);
  assert.deepEqual(x.duplicateLeft,['isti']);
  assert.throws(()=>compareArchive([row('../escape')],[]));
  assert.throws(()=>compareArchive([],null));
});
