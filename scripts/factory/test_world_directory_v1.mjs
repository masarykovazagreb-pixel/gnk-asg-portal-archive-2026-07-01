import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {renderWorldDirectory} from './world-directory-v1.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p, import.meta.url),'utf8'));
const registry=read('../../config/world-countries-v1.json');
const sources=read('../../config/world-sources-v1.json');
test('svaka država u registru prikazana bez izmišljenih veza',()=>{
  const html=renderWorldDirectory(registry,sources);
  assert.equal((html.match(/data-wd-country /g)||[]).length,registry.countries.length);
  assert.equal((html.match(/>Otvori izdanje<\/a>/g)||[]).length,registry.countries.filter(c=>c.status==='live').length);
  assert.doesNotMatch(html,/pages\.dev/);
  assert.ok(readFileSync(new URL('../../apps/portal/agenti/index.html',import.meta.url),'utf8').includes(html));
  assert.match(html,/nisu dokaz da web postoji/);
});
test('escapiranje i samo poznate sigurne live adrese',()=>{
  const html=renderWorldDirectory({countries:[{country:'<img>',capital:'Grad',status:'live',liveUrl:'javascript:alert(1)'},{country:'Plan',status:'planned',liveUrl:'https://gnk-asg.hr/kanal/a/'}]},{});
  assert.match(html,/&lt;img&gt;/);assert.doesNotMatch(html,/<img>|javascript:|Otvori izdanje/);
});
test('bez JSa kartice su vidljive, a s JSom filtar radi',()=>{
  assert.doesNotMatch(renderWorldDirectory(registry,sources),/<li[^>]*\shidden/);
  const events={}, cards=[{dataset:{wdStatus:'live'},textContent:'Hrvatska Zagreb',hidden:false},{dataset:{wdStatus:'planned'},textContent:'Albanija Tirana',hidden:false}];
  const search={value:'',addEventListener:(_,f)=>events.search=f}, filter={value:'all',addEventListener:(_,f)=>events.filter=f};
  const controls={hidden:true},result={textContent:''}, root={querySelector:s=>({'[data-wd-controls]':controls,'#wd-search':search,'#wd-filter':filter,'[data-wd-result]':result}[s]),querySelectorAll:()=>cards};
  runInNewContext(readFileSync(new URL('../../apps/portal/assets/world-directory-v1.js',import.meta.url),'utf8'),{document:{getElementById:()=>root}});
  assert.equal(controls.hidden,false);search.value='tirana';events.search();assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);
  search.value='';filter.value='live';events.filter();assert.equal(cards[0].hidden,false);assert.equal(cards[1].hidden,true);
});
