import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KANAL_DESIGN_V2_CSS as channelCss} from '../apps/region/engine/kanal-design-v2.mjs';
import {applyEnglishWorldParity} from '../apps/region/engine/aktual-en-home-parity-v1.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hr=read('apps/portal/gnk-aktual/index.html');
const en=read('apps/portal/en/gnk-aktual/index.html');
const homeCss=read('apps/portal/assets/aktual-editorial-v4.css');
const generator=read('apps/region/engine/aktual-central.mjs');
const channelBuilder=read('apps/region/engine/build.mjs');
const count=(s,re)=>[...s.matchAll(re)].length;

test('both language homepages load exactly one shared V4 CSS after legacy design',()=>{
  for(const [lang,html] of [['hr',hr],['en',en]]){
    assert.equal(count(html,/href="\/assets\/aktual-editorial-v4\.css\?v=20261112"/g),1,lang);
    assert.ok(html.indexOf('aktual-editorial-v4.css')>html.indexOf('aktual-hub-v2.css'),lang+' cascade must finish last');
    assert.match(html,new RegExp('<html lang="'+lang+'"'));
    assert.ok(html.includes('hreflang="en"')&&html.includes('hreflang="hr"'));
    assert.ok(html.includes('rel="canonical"'));
  }
});
test('V4 is persisted when the official generator refreshes both languages',()=>{
  assert.match(generator,/function withEditorialV4\(page\)/);
  assert.match(generator,/writeFileSync\(FILE, withEditorialV4/);
  assert.match(generator,/writeFileSync\(EN, withEditorialV4/);
  assert.match(generator,/applyEnglishWorldParity\(withPromo\(en, 'en'\)\)/);
});
test('HR/EN have the same key visual sections and only one promotional modal',()=>{
  for(const cls of ['am-masthead','am-central','am-world-preview','am-zg-takeover','am-world-gateway']){
    assert.ok(hr.includes('class="'+cls), 'HR missing '+cls);
    assert.ok(en.includes('class="'+cls), 'EN missing '+cls);
  }
  assert.equal(count(en,/class="am-world-gateway"/g),1);
  assert.equal(count(en,/id="amZgModal"/g),1);
  assert.equal(count(en,/class="am-world-col"/g),5);
  assert.ok(en.indexOf('<!-- KANAL-BAND:START -->')<en.indexOf('<!-- IZDANJA-BAND:START -->'));
  assert.ok(en.includes('not been independently verified'));
});
test('English component is safe on repeated rebuild and rejects Croatian',()=>{
 const bare='<!doctype html><html lang="en"><head></head><body><section class="am-masthead">Title</section></body></html>';
 const once=applyEnglishWorldParity(bare);
 assert.equal(applyEnglishWorldParity(once),once);
 assert.throws(()=>applyEnglishWorldParity(bare.replace('lang="en"','lang="hr"')),/EN only/);
});
test('premium mobile/desktop CSS has accessibility, photo crops and safe fallbacks',()=>{
 assert.ok(homeCss.includes('body[data-aktual-view="home"]'));
 for(const selector of ['.am-masthead','.am-sectionnav','.am-leadgrid','.am-newslist','.amc-hero','.amc-marks','.am-searchbox','.kanal-list']){
   assert.ok(homeCss.includes(selector),selector);
 }
 for(const needle of ['focus-visible','object-fit:cover','aspect-ratio:16/9','aspect-ratio:4/3','aspect-ratio:3/2','prefers-reduced-motion','@media(max-width:760px)','@media(max-width:480px)','@media print']){
   assert.ok(homeCss.includes(needle),needle);
 }
 assert.ok(!/url\(\s*https?:/i.test(homeCss),'no external design resources');
});
test('17 channel editions keep the existing design contract plus new editorial photo layout',()=>{
 for(const needle of ['--v2-blue','.intro--hero','.leadgrid','.cardmedia','.card--lead','.grid','.eds-img','@media(max-width:520px)','prefers-reduced-motion']){
   assert.ok(channelCss.includes(needle),needle);
 }
 assert.ok(channelCss.includes('object-fit:cover'));
 assert.ok(channelCss.includes('aspect-ratio:1/1'));
 assert.ok(channelCss.includes('background:#ece7da'));
});
test('channel home features up to 45 RSS-derived items with 12 extra photograph cards',()=>{
 assert.match(channelBuilder,/const more = items\.slice\(13, 45\)/);
 assert.match(channelBuilder,/const moreCards = more\.slice\(0, 12\)/);
 assert.match(channelBuilder,/moreCards\.map\(\(i\) => card\(channel, strings, i\)\)/);
 assert.ok(channelBuilder.includes('class="grid grid--more"'));
});
