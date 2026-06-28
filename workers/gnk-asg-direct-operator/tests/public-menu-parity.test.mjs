import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const hrIndex=['href="#the-code"','href="#financije"','href="#mreza"','href="/vijesti/"','href="/objave/"','href="/trzista/"','href="/visual-index/"','href="/assistant/"','href="/operator-dashboard/"','href="/contact/"','href="/en/"'];
const enIndex=['href="#the-code"','href="#financials"','href="#network"','href="/news/"','href="/publications/"','href="/markets/"','href="/visual-index/"','href="/en/assistant/"','href="/operator-dashboard/"','href="/contact/"','href="/"'];
const hrShell=['/#the-code','/#financije','/#mreza','/vijesti/','/objave/','/trzista/','/visual-index/','/assistant/','/operator-dashboard/','/contact/','/en/'];
const enShell=['/en/#the-code','/en/#financials','/en/#network','/news/','/publications/','/markets/','/visual-index/','/en/assistant/','/operator-dashboard/','/contact/','/'];

function expectAll(source,links,label){for(const link of links)assert.ok(source.includes(link),`${label}: ${link}`)}

test('Croatian and English index menus use confirmed destinations',()=>{
  expectAll(read('apps/portal/index.html'),hrIndex,'HR index');
  expectAll(read('apps/portal/en/index.html'),enIndex,'EN index');
});

test('shared public menu uses the same destinations',()=>{
  const menu=read('apps/portal/assets/public-menu-v10.js');
  expectAll(menu,hrShell,'public menu HR');
  expectAll(menu,enShell,'public menu EN');
  assert.doesNotMatch(menu,/auto-editor|pdf-publisher|memorandum-studio/i);
});

test('public shell route inventory covers primary public sections',()=>{
  const shell=read('workers/gnk-asg-direct-operator/src/index-admin-hub-v26-public-v10-base.js');
  for(const route of ['/assistant','/en/assistant','/trzista','/markets','/vijesti','/news','/objave','/publications','/contact','/visual-index'])assert.ok(shell.includes(`'${route}'`),route);
});
