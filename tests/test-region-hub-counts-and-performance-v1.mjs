import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkHubCounts } from '../scripts/check-hub-counts-v1.mjs';

const channels=[{id:'zagreb',base:'https://gnk-asg.hr/kanal/zagreb/'}];
const counts=[{id:'zagreb',count:1574}];
const total='1.574';
function fixture(lang='hr',count=1574) {
  const word=lang==='en'?'stories':'tekstova';
  const archive=lang==='en'?'texts in the archive':'tekstova u arhivi';
  const mast=lang==='en'?'texts':'tekstova';
  const title=lang==='en'?'1,574':total;
  const pins=Array.from({length:8},()=>'<a class="amm-pin" href="https://gnk-asg.hr/kanal/zagreb/" aria-label="Zagreb — 1574 '+word+' —"></a>').join('');
  return `<p class="amm-count"><b>${total}</b></p>
<h2 id="amcTitle">AKTUAL MEDIA · ${title} news</h2>
<div class="am-mast-side right">AKTUAL MEDIA DESK<br>${total} ${mast} ·</div>
<ul class="amh-stats"><li><b>${total}</b><span>${archive}</span></li></ul>
<a class="amx-link" href="https://gnk-asg.hr/kanal/zagreb/" rel="external noopener" aria-label="AKTUAL MEDIA KANAL ZAGREB — Hrvatska — ${count} ${word} — otvori izdanje"></a>${pins}`;
}
for(const lang of ['hr','en']) {
  assert.deepEqual(checkHubCounts(fixture(lang),channels,counts,lang),[],`${lang} matching podium should pass`);
  assert.ok(checkHubCounts(fixture(lang,1573),channels,counts,lang).includes('Zagreb u najavi'),
    `${lang} stale podium count must fail`);
}
const generator=readFileSync(new URL('../apps/region/engine/aktual-central.mjs',import.meta.url),'utf8');
assert.ok(generator.includes("loading=\"\\${i < 3 ? 'eager' : 'lazy'}\""),
  'city cards beyond third card must be lazy-loaded from the generator');
console.log('PASS: current Zagreb podium and lazy city images validated for HR/EN');
