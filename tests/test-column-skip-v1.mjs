import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {addColumnSkip} from '../scripts/lib/column-skip-v1.mjs';
const sample=lang=>`<!doctype html><html lang="${lang}"><head><link rel="stylesheet" href="/assets/am-design-v1.css?v=1" data-am-design="v1"></head><body><header>Header</header><main class="editorial-wrap article"><h1>Content</h1></main></body></html>`;
test('recognized columns get localized link without other changes',()=>{
 for(const [lang,route,label] of [['hr','gnk-aktual/kolumne/topic/index.html','Preskoči na sadržaj'],['en','en/gnk-aktual/columns/topic/index.html','Skip to content']]){
  const before=sample(lang), result=addColumnSkip(before,route);assert.equal(result.status,'patched');
  assert.ok(result.html.includes(`<body><a class="skip" href="#columnContent">${label}</a>`));
  assert.equal(result.html.replace(`<a class="skip" href="#columnContent">${label}</a>`,'').replace('<main id="columnContent" tabindex="-1" ','<main '),before);
  assert.equal(addColumnSkip(result.html,route).status,'already');
 }
});
test('protected routes and ambiguous templates remain unchanged',()=>{
 const html=sample('hr');
 for(const route of ['podijeli/vijest/topic/index.html','gnk-aktual/kolumne/../other/index.html','gnk-aktual/kolumne/gnk-asg-504-milijuna-eura-prihoda/index.html','gnk-aktual/kolumne/adria-bank/index.html'])assert.equal(addColumnSkip(html,route).html,html);
 for(const bad of [html.replace('<main class="editorial-wrap article">','<main>'),html.replace('</main>','</main><main></main>'),html.replace('data-am-design="v1"',''),html.replace('</head>','<meta http-equiv="refresh" content="0;url=/"></head>')])assert.equal(addColumnSkip(bad,'gnk-aktual/kolumne/topic/index.html').html,bad);
});
test('scoped pages retain the target and dry-run is idempotent',()=>{
 let n=0;function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.isFile()&&e.name==='index.html'?[path.join(d,e.name)]:[])}
 for(const dir of ['apps/portal/gnk-aktual/kolumne','apps/portal/en/gnk-aktual/columns'])for(const file of walk(dir)){
  const html=fs.readFileSync(file,'utf8');if(!html.includes('href="#columnContent"'))continue;n++;
  assert.match(html,/<body><a class="skip" href="#columnContent">(?:Preskoči na sadržaj|Skip to content)<\/a>/,file);
  assert.match(html,/<main id="columnContent" tabindex="-1" class="(?:wrap|editorial-wrap article)">/,file);
  assert.equal((html.match(/id="columnContent"/g)||[]).length,1,file);
 }
 assert.ok(n>=55);const run=spawnSync(process.execPath,['scripts/apply-column-skip-scoped-v1.mjs'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).counts.patched,0);
});
