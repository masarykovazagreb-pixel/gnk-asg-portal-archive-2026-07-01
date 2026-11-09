import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyWorldPreview,worldPreviewBanner} from '../apps/region/engine/world-external-promo-v1.mjs';

const file='apps/portal/gnk-aktual/index.html';
const url='https://j1hex9qg03f0-d.space-z.ai/?country=hrvatska';

test('promocija je trajna, jasno označena i vodi na odabrani vanjski pregled',()=>{
  const page=readFileSync(file,'utf8');
  assert.equal((page.match(/<!-- AKTUAL-WORLD-PREVIEW:START -->/g)||[]).length,1);
  assert.ok(page.includes(worldPreviewBanner()));
  assert.match(page,/id="amPromoTitle">HRVATSKA NA SVJETSKOJ KARTI!/);
  assert.match(page,/demonstracijske vijesti/);
  assert.ok(page.includes(`href="${url}" target="_blank" rel="external noopener noreferrer"`));
  assert.ok(page.includes('data-am-promo-close'));
  assert.ok(page.includes('data-am-promo-never'));
  assert.ok(page.includes('id="amPromoTop"'));
  assert.ok(page.includes('id="amAd"'));
  assert.doesNotMatch(worldPreviewBanner(),/<iframe/i);
  assert.equal(applyWorldPreview(page),page,'ponovna primjena ne smije mijenjati stranicu');
});

test('generator čuva promociju, popup omogućuje zatvaranje i CSS podržava mobitel',()=>{
  const engine=readFileSync('apps/region/engine/aktual-central.mjs','utf8');
  assert.match(engine,/applyWorldPreview\(withPromo\(html, 'hr'\)\)/);
  const script=readFileSync('apps/portal/assets/aktual-promo-v1.js','utf8');
  assert.match(script,/Escape/); assert.match(script,/sessionStorage/); assert.match(script,/localStorage/);
  assert.match(script,/lastFocus/); assert.match(script,/event\.key !== 'Tab'/);
  const css=readFileSync('apps/portal/assets/aktual-world-preview-v1.css','utf8');
  assert.match(css,/@media\(max-width:680px\)/); assert.match(css,/:focus-visible/);
});

test('nedostajući markeri uzrokuju pogrešku bez tihog prepisivanja',()=>{
  assert.throws(()=>applyWorldPreview('<html></html>'),/promotional region missing/);
});
