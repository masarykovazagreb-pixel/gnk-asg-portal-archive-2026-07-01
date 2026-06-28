import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const hr=['/#the-code','/#financije','/#mreza','/vijesti/','/objave/','/trzista/','/visual-index/','/assistant/','/operator-dashboard/','/contact/','/en/'];
const en=['/en/#the-code','/en/#financials','/en/#network','/news/','/publications/','/markets/','/visual-index/','/en/assistant/','/operator-dashboard/','/contact/','/'];

function expectAll(source,links,label){for(const link of links)assert.ok(source.includes(link),`${label}: ${link}`)}

test('Croatian and English index menus use confirmed destinations',()=>{
  expectAll(read('apps/portal/index.html'),hr,'HR index');
  expectAll(read('apps/portal/en/index.html'),en,'EN index');
});

test('shared public menu uses the same destinations',()=>{
  const menu=read('apps/portal/assets/public-menu-v10.js');
  expectAll(menu,hr.filter(link=>link!=='/en/'),'public menu HR');
  expectAll(menu,en.filter(link=>link!=='/'),'public menu EN');
  assert.doesNotMatch(menu,/auto-editor|pdf-publisher|memorandum-studio/i);
});

test('public shell route inventory covers primary public sections',()=>{
  const shell=read('workers/gnk-asg-direct-operator/src/index-admin-hub-v26-public-v10-base.js');
  for(const route of ['/assistant','/en/assistant','/trzista','/markets','/vijesti','/news','/objave','/publications','/contact','/visual-index'])assert.ok(shell.includes(`'${route}'`),route);
});
