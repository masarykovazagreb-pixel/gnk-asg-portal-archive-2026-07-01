import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const expectInOrder=(source,values,label)=>{
  let cursor=-1;
  for(const value of values){const next=source.indexOf(value,cursor+1);assert.ok(next>cursor,`${label}: missing or out of order ${value}`);cursor=next;}
};

const orderTokens=["['THE CODE'",'[labels.finance','[labels.network','[labels.news','[labels.publications','[labels.markets','[labels.gallery',"['AI'","['Admin'",'[labels.contact','[labels.language'];
const labels=['Financije','Mreža','Vijesti','Objave','Tržišta','Galerija','Kontakt','Financials','Network','News','Publications','Markets','Gallery','Contact'];

for(const file of ['apps/portal/assets/public-shell-v15.js','apps/portal/assets/public-menu-v10.js']){
  test(`${file} uses canonical V16 destinations and order`,()=>{
    const source=read(file);
    assert.match(source,/UNIFIED_NAVIGATION_20260628/);
    expectInOrder(source,orderTokens,`${file} canonical item order`);
    for(const label of labels)assert.ok(source.includes(label),`${file}: ${label}`);
    for(const route of ['/vijesti/','/objave/','/trzista/','/visual-index/','/assistant/','/admin-center/','/contact/','/news/','/publications/','/markets/','/en/assistant/','/en/contact/'])assert.ok(source.includes(route),`${file}: ${route}`);
    assert.doesNotMatch(source,/\/operator-dashboard\//);
    assert.doesNotMatch(source,/auto-editor|pdf-publisher/i);
  });
}

test('worker wrapper applies the same native index menu and assets',()=>{
  const source=read('workers/gnk-asg-direct-operator/src/index-project50-v30-unified-menu.js');
  assert.match(source,/UNIFIED_PUBLIC_MENU_V16/);
  assert.match(source,/public-menu-v10\.css\?v=20260628-v16/);
  assert.match(source,/index-menu-unified-v16\.js/);
  assert.match(source,/href="\/admin-center\/"/);
  assert.match(source,/href="\/en\/contact\/"/);
  assert.match(source,/publicMenuItems:11/);
  assert.match(source,/admin-center-memorandum-v1/);
});

test('Admin Center extension exposes the complete operational menu without live sending',()=>{
  const source=read('apps/portal/assets/admin-center-extensions-v2.js');
  for(const id of ['memorandum','social','whatsapp','review'])assert.ok(source.includes(`id:'${id}'`),id);
  for(const route of ['/memorandum-studio/','/social-share/','/wa-center/','/review/'])assert.ok(source.includes(route),route);
  assert.doesNotMatch(source,/dispatch-queue|queue-approved|send_email|MEDIA_OUTREACH_LIVE/);
});
