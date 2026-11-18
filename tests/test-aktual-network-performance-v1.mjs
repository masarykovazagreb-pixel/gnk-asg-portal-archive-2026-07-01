import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('AKTUAL home loads only LCP-critical images eagerly',()=>{
  const h=read('apps/portal/gnk-aktual/index.html');
  const tags=[...h.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
  assert.ok(tags.length>=60,'unexpectedly missing visual editorial content');
  const eager=tags.filter(t=>t.includes('loading="eager"'));
  assert.equal(eager.length,2,'all non-critical editorial images should be lazy');
  assert.match(eager[0],/aktual-media-atlas-1600.webp/);
  assert.match(eager[1],/zagreb-440.webp/);
  assert.ok(eager.every(t=>t.includes('fetchpriority="high"')));
  const furtherEditions=tags.filter(t=>/src="\/assets\/izdanja\/(?:beograd|sarajevo|tokio|peking)-440.webp"/.test(t));
  assert.equal(furtherEditions.length,4);
  assert.ok(furtherEditions.every(t=>t.includes('loading="lazy"')));
});
test('All 201 country links remain crawlable in HR and EN directory initial HTML',()=>{
  const hr=read('apps/portal/gnk-aktual/media/index.html');
  const en=read('apps/portal/en/gnk-aktual/media/index.html');
  assert.equal((hr.match(/data-world-country/g)||[]).length,201);
  assert.equal((en.match(/class="am-directory-grid"/g)||[]).length,1);
  assert.equal((en.match(/\/en\/gnk-aktual\/media\/[^/"]+\//g)||[]).length>=201,true);
  assert.match(hr,/https:\/\/gnk-asg.hr\/gnk-aktual\/media\//);
  assert.match(en,/rel="canonical" href="https:\/\/gnk-asg.hr\/en\/gnk-aktual\/media\//);
});
test('Directory rendering is progressive without hiding links, search cached',()=>{
  const hr=read('apps/portal/assets/aktual-world-directory-v1.css');
  const en=read('apps/portal/assets/aktual-world-premium-en-v1.css');
  const common=read('apps/portal/assets/aktual-world-page-a11y-v1.css');
  const js=read('apps/portal/assets/aktual-world-directory-v1.js');
  assert.match(hr,/\.aw-region\{content-visibility:auto;/);
  assert.match(en,/\.am-directory-grid li\{content-visibility:auto;/);
  assert.match(common,/main#worldContent>\.section\{content-visibility:auto;/);
  assert.match(js,/normalizedRows=rows\.map/);
  assert.doesNotMatch(js,/normalize\(row\.dataset\.search\)\.includes\(q\)/);
});
