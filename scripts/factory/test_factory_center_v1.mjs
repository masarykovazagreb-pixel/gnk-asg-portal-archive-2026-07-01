import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { renderFactoryCenter } from './factory-center-v1.mjs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const config = read('../../config/factory-agents-v1.json');
const board = read('../../artifacts/factory/orchestration-board.json');
const registry = read('../../config/world-countries-v1.json');

test('objavljena sekcija odgovara registrima i prikazuje da je snimak', () => {
  const page = readFileSync(new URL('../../apps/portal/agenti/index.html', import.meta.url),'utf8');
  const section = renderFactoryCenter(config,board,registry);
  assert.ok(page.includes(section));
  assert.equal((section.match(/data-fc-agent /g) || []).length,config.agents.length);
  assert.match(section,/nije mjerenje uživo/);
  assert.match(section,/nije samostalni AI/);
  assert.ok(section.includes(board.generatedAt));
});
test('nepoznati status i podaci ne dovode do HTML injekcije', () => {
  const section = renderFactoryCenter({agents:[{id:'A<script>',name:'<img onerror=x>',role:'A & B',mode:'script'}]}, {agents:[{id:'A<script>',state:'bad'}]}, {countries:[]});
  assert.match(section,/A&lt;script&gt;/); assert.match(section,/&lt;img onerror=x&gt;/);
  assert.match(section,/Nema snimka/); assert.doesNotMatch(section,/<img onerror=x>/);
});
test('bez JavaScripta svi agenti ostaju vidljivi', () => {
  const section = renderFactoryCenter(config,board,registry);
  assert.doesNotMatch(section,/<article[^>]*\shidden/);
  assert.match(section,/data-fc-controls hidden/);
});
test('pretraživanje i filtriranje rade nad karticama', () => {
  const events = {};
  const cards = [{dataset:{fcState:'done'},textContent:'A00 Orkestrator',hidden:false},{dataset:{fcState:'human'},textContent:'A12 Ljudska odluka',hidden:false}];
  const search={value:'',addEventListener:(name,fn)=>events.search=fn};
  const filter={value:'all',addEventListener:(name,fn)=>events.filter=fn};
  const controls={hidden:true}, result={textContent:''};
  const root={querySelector:s=>({'[data-fc-controls]':controls,'#fc-search':search,'#fc-filter':filter,'[data-fc-result]':result}[s]),querySelectorAll:()=>cards};
  const code=readFileSync(new URL('../../apps/portal/assets/factory-center-v1.js',import.meta.url),'utf8');
  runInNewContext(code,{document:{getElementById:()=>root}});
  assert.equal(controls.hidden,false); assert.match(result.textContent,/2 od 2/);
  search.value='orkestrator';events.search();assert.equal(cards[0].hidden,false);assert.equal(cards[1].hidden,true);
  search.value='';filter.value='human';events.filter();assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);
});
test('JSON za plan objave se ne može probiti u HTML', () => {
  const hostile={countries:[{cca2:'HR',id:'<x>',country:'</script><script>alert(1)</script>',status:'planned'}]};
  const html=renderFactoryCenter({agents:[]},{agents:[]},hostile);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
  assert.match(html,/\\u003c\/script\\u003e/);
});
