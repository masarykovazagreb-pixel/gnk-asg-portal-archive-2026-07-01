import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require=createRequire(import.meta.url);
const mt=require('../metodologije/methodology.js');
const ui=await readFile(new URL('../metodologije/methodology-ui.js',import.meta.url),'utf8');
const css=await readFile(new URL('../developer-tools/developer-tools.css',import.meta.url),'utf8');
const ideas=JSON.parse(await readFile(new URL('../data/idea_factory.json',import.meta.url),'utf8'));

const presets=[
  {text:'#000000',background:'#ffffff',expected:21},
  {text:'#767676',background:'#ffffff',expected:4.54,tolerance:0.01},
  {text:'#ffffff',background:'#000000',expected:21}
];

test('WCAG presets reproduce documented contrast values',()=>{
  for(const p of presets){
    const r=mt.calculate('wcag-contrast',{boja_teksta_hex:p.text,boja_pozadine_hex:p.background});
    assert.equal(r.ok,true);
    assert.ok(Math.abs(r.value-p.expected)<=(p.tolerance||0.0001),`${p.text}/${p.background}: ${r.value}`);
  }
});

test('WCAG preset UI is keyboard-safe and loads values through existing calculator',()=>{
  assert.match(ui,/var WCAG_PRESETS = \[/);
  assert.match(ui,/type: 'button', class: 'dt-secondary dt-calc-example'/);
  assert.match(ui,/fields\.boja_teksta_hex\.value = preset\.text/);
  assert.match(ui,/fields\.boja_pozadine_hex\.value = preset\.background/);
  assert.match(ui,/form\.requestSubmit\(\)/);
  assert.match(css,/\.dt-calc-presets/);
  assert.match(css,/\.dt-calc-example/);
});

test('Idea Factory closes idea-04 only after the WCAG preset implementation exists',()=>{
  const idea=ideas.ideas.find(x=>x.id==='idea-04');
  assert.ok(idea);
  assert.equal(idea.status,'gotovo');
  assert.equal(ideas.ideas.filter(x=>x.status==='gotovo').length,16);
  assert.equal(ideas.ideas.filter(x=>x.status==='otvoreno').length,14);
});
