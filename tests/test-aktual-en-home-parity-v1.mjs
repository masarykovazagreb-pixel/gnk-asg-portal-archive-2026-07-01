import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyEnglishWorldParity } from '../apps/region/engine/aktual-en-home-parity-v1.mjs';

const hr = readFileSync(new URL('../apps/portal/gnk-aktual/index.html', import.meta.url), 'utf8');
const en = readFileSync(new URL('../apps/portal/en/gnk-aktual/index.html', import.meta.url), 'utf8');
const marker = '<!-- AKTUAL-EN-WORLD-PARITY:START -->';
const count = (str, re) => [...str.matchAll(re)].length;

test('English canonical, language switch and heading survive parity', () => {
  assert.match(en, /<html lang="en"/);
  assert.match(en, /rel="canonical" href="https:\/\/gnk-asg\.hr\/en\/gnk-aktual\/"/);
  assert.match(en, /hreflang="hr"/);
  assert.match(en, /hreflang="en"/);
  assert.equal(count(en, /<h1 id="amMasthead">/g), 1);
});
test('English renders the same world component types as Croatian, in the same order', () => {
  const classes = ['am-world-preview', 'am-zg-takeover', 'am-zg-modal', 'am-world-gateway'];
  for (const cls of classes) {
    assert.ok(hr.includes('class="' + cls), 'HR missing ' + cls);
    assert.ok(en.includes('class="' + cls), 'EN missing ' + cls);
    assert.equal(count(en, new RegExp('class="' + cls + '"', 'g')), 1, 'duplicate ' + cls);
  }
  const enIndices = classes.map(cls => en.indexOf('class="' + cls));
  assert.deepEqual([...enIndices].sort((a,b) => a-b), enIndices);
  assert.equal(count(en, /class="am-world-col"/g), 5);
  assert.equal(count(en, /id="amZgModal"/g), 1);
  assert.equal(count(en, /<script src="\/assets\/aktual-zagreb-takeover-v1\.js/g), 1);
  assert.match(en, /not been independently verified/);
});
test('English world styles are enabled without touching the Croatian page', () => {
  assert.match(en, /href="\/assets\/aktual-world-preview-v1\.css"/);
  assert.match(en, /href="\/assets\/aktual-zagreb-takeover-v1\.css\?v=20261108-world2"/);
  assert.equal(count(en, /<!-- AKTUAL-EN-WORLD-PARITY:START -->/g), 1);
  assert.equal(count(en, /<!-- AKTUAL-EN-WORLD-PARITY:END -->/g), 1);
});
test('generator enhancement is idempotent and does not accept HR', () => {
  const bare = '<!doctype html><html lang="en"><head></head><body><section class="am-masthead">Identity</section></body></html>';
  const once = applyEnglishWorldParity(bare);
  const twice = applyEnglishWorldParity(once);
  assert.equal(once, twice);
  assert.match(once, /class="am-world-gateway"/);
  assert.ok(once.includes(marker));
  assert.throws(() => applyEnglishWorldParity(bare.replace('lang="en"', 'lang="hr"')), /target EN only/);
  assert.throws(() => applyEnglishWorldParity(bare.replace('<section class="am-masthead"', '<section class="missing"')), /anchor missing/);
});
