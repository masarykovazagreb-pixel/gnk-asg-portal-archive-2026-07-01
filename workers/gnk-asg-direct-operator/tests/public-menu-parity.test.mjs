import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const stylesheets=html=>[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(match=>match[1]);
const classSequence=html=>[...html.matchAll(/\bclass=["']([^"']+)["']/gi)].map(match=>match[1].trim().replace(/\s+/g,' '));
const tagCounts=html=>{
  const counts={};
  for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b/gi)){const tag=match[1].toLowerCase();counts[tag]=(counts[tag]||0)+1;}
  return counts;
};
const linksBlock=source=>{
  const start=source.indexOf('const links=[');
  const end=source.indexOf('];',start);
  return start>=0&&end>start?source.slice(start,end+2):'';
};

for(const file of ['apps/portal/assets/public-shell-v15.js','apps/portal/assets/public-menu-v10.js']){
  test(`${file} exposes only the seven agreed public navigation items`,()=>{
    const source=read(file);
    const links=linksBlock(source);
    assert.ok(links,'links block missing');
    assert.match(source,/menuItems='7'/);
    for(const value of ['THE CODE','Financije','Financials','Mreža','Network','Tržišta','Markets','Kontakt','Contact','Admin','HR','EN'])assert.ok(source.includes(value),`${file}: ${value}`);
    for(const route of ['/trzista/','/markets/','/contact/','/en/contact/','/admin-center/'])assert.ok(links.includes(route),`${file}: ${route}`);
    assert.doesNotMatch(links,/\/vijesti\/|\/news\/|\/objave\/|\/publications\/|\/visual-index\/|\/assistant\/|\/en\/assistant\//);
    assert.doesNotMatch(source,/className=['"]gnk-public-float-v10[^'"]*--ai/);
  });
}

test('worker wrapper applies the reduced seven-item native index menu',()=>{
  const source=read('workers/gnk-asg-direct-operator/src/index-project50-v30-unified-menu.js');
  assert.match(source,/PUBLIC_CORE_MENU_V31/);
  assert.match(source,/publicMenuItems:7/);
  assert.match(source,/href="\/trzista\/"/);
  assert.match(source,/href="\/markets\/"/);
  assert.match(source,/href="\/contact\/"/);
  assert.match(source,/href="\/en\/contact\/"/);
  assert.match(source,/href="\/admin-center\/"/);
  assert.doesNotMatch(source,/href="\/vijesti\/"|href="\/news\/"|href="\/objave\/"|href="\/publications\/"|href="\/visual-index\/"|href="\/assistant\/"|href="\/en\/assistant\/"/);
});

test('HR and EN index use identical design assets and HTML class structure',()=>{
  const hr=read('apps/portal/index.html');
  const en=read('apps/portal/en/index.html');
  assert.deepEqual(stylesheets(en),stylesheets(hr));
  assert.deepEqual(classSequence(en),classSequence(hr));
  assert.deepEqual(tagCounts(en),tagCounts(hr));
});

test('HR and EN contact use identical design assets and HTML class structure',()=>{
  const hr=read('apps/portal/contact/index.html');
  const en=read('apps/portal/en/contact/index.html');
  assert.deepEqual(stylesheets(en),stylesheets(hr));
  assert.deepEqual(classSequence(en),classSequence(hr));
  assert.deepEqual(tagCounts(en),tagCounts(hr));
  assert.ok(hr.includes('/api/contact-submit'));
  assert.ok(en.includes('/api/contact-submit'));
});

test('index runtime removes legacy floating controls in both languages',()=>{
  const source=read('apps/portal/assets/index-menu-unified-v16.js');
  assert.match(source,/GNK_ASG_INDEX_MENU_V17_CORE_PARITY_20260628/);
  assert.match(source,/menuItems='7'/);
  assert.match(source,/public-float--home/);
  assert.match(source,/public-float--ai/);
});

test('Admin Center extension contains no live sending implementation',()=>{
  const source=read('apps/portal/assets/admin-center-extensions-v2.js');
  assert.doesNotMatch(source,/dispatch-queue|queue-approved|send_email|MEDIA_OUTREACH_LIVE/);
});

test('Wrangler keeps production routes at root level before the assets table',()=>{
  const source=read('workers/gnk-asg-direct-operator/wrangler.toml');
  const routes=source.indexOf('\nroutes = [');
  const assets=source.indexOf('\n[assets]');
  assert.ok(routes>0,'root routes declaration missing');
  assert.ok(assets>routes,'[assets] must follow the root routes declaration');
  const assetsBody=source.slice(assets,source.indexOf('\n[[kv_namespaces]]',assets));
  assert.doesNotMatch(assetsBody,/\nroutes\s*=/,'routes must not be nested in [assets]');
});
