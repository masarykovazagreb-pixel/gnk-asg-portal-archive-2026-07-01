import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Small DOM fixture tests the actual browser script without network or a browser dependency.
test('directory search combines text, region and language and reset restores results',()=>{
  const element=()=>({value:'',hidden:false,textContent:'',listeners:{},children:[],addEventListener(event,fn){this.listeners[event]=fn;},append(option){this.children.push(option);},focus(){this.focused=true;}});
  const input=element(),region=element(),language=element(),filters=element(),reset=element(),count=element(),empty=element();
  const sections=['Balkan','Istočna Azija'].map((name,i)=>({id:`r${i}`,hidden:false,querySelector(){return {childNodes:[{textContent:name}]};},querySelectorAll(){return rows.filter(r=>r.section===this);}}));
  const rows=[['hrvatska croatia hr', 'hr',0],['japan japan jp', 'ja',1],['svedska sweden se', 'sv',0]].map(([search,lang,index])=>({dataset:{search,language:lang},section:sections[index],hidden:false,closest(){return this.section;}}));
  const ids={'#worldSearch':input,'#worldRegion':region,'#worldLanguage':language,'#worldFilters':filters,'#worldReset':reset,'#worldMatchCount':count,'#worldNoResults':empty};
  const document={querySelector:selector=>ids[selector],querySelectorAll:selector=>selector==='[data-world-country]'?rows:sections,createElement:()=>element()};
  vm.runInNewContext(readFileSync('apps/portal/assets/aktual-world-directory-v1.js','utf8'),{document,Intl});
  assert.equal(filters.hidden,false);assert.equal(language.children.length,3);assert.equal(region.children.length,2);
  input.value='Švedska';input.listeners.input();assert.deepEqual(rows.map(r=>r.hidden),[true,true,false]);assert.equal(count.textContent,'1 / 3 rezultata');
  region.value='r1';region.listeners.change();assert.equal(empty.hidden,false);assert.equal(count.textContent,'0 / 3 rezultata');
  reset.listeners.click();assert.equal(input.value,'');assert.equal(region.value,'');assert.equal(language.value,'');assert.equal(input.focused,true);assert.equal(empty.hidden,true);
  language.value='ja';language.listeners.change();assert.deepEqual(rows.map(r=>r.hidden),[true,false,true]);assert.equal(sections[0].hidden,true);
});
