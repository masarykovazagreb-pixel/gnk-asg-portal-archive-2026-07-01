import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareArchive, compareArticlePages } from './archive-compare-v1.mjs';
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

test('uspoređuje stranice i zapise bez brisanja ili pretpostavke o dostupnosti',()=>{
  const page=(channel,slug)=>`apps/portal/kanal/${channel}/clanak/${slug}/index.html`;
  const left=[row('zajednicki'),row('bez-stranice')],right=[row('zajednicki'),row('nova')];
  const result=compareArticlePages('zagreb',left,right,
    [page('zagreb','zajednicki'),page('zagreb','siroce'),page('rim','drugi')],
    [page('zagreb','zajednicki'),page('zagreb','nova')]);
  assert.deepEqual(result.onlyLeft,['siroce']);assert.deepEqual(result.onlyRight,['nova']);
  assert.deepEqual(result.orphanLeft,['siroce']);assert.deepEqual(result.orphanRight,[]);
  assert.deepEqual(result.recordWithoutPageLeft,['bez-stranice']);assert.deepEqual(result.recordWithoutPageRight,[]);
  assert.throws(()=>compareArticlePages('../x',left,right,[],[]));
});
