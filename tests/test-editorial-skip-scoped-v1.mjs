import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {addEditorialSkip} from '../scripts/lib/editorial-skip-v1.mjs';
const example=lang=>`<!doctype html><html lang="${lang}"><head><link rel="stylesheet" href="/assets/am-design-v1.css" data-am-design="v1"><title>Keep</title></head><body><div class="am-ribbon">Ribbon</div><main class="editorial-wrap article"><h1>Keep</h1></main><p>Author</p></body></html>`;

test('known editorial template receives one localized skip link and preserves other bytes',()=>{
 for(const [lang,route,label] of [['hr','objave/topic/index.html','Preskoči na sadržaj'],['en','en/publications/topic/index.html','Skip to content']]){
  const input=example(lang),out=addEditorialSkip(input,route);
  assert.equal(out.status,'patched');assert.ok(out.html.includes(`<body><a class="skip" href="#editorialContent">${label}</a>`));
  assert.ok(out.html.includes('<main id="editorialContent" tabindex="-1" class="editorial-wrap article">'));
  assert.equal(out.html.replace(`<a class="skip" href="#editorialContent">${label}</a>`,'').replace('<main id="editorialContent" tabindex="-1" ','<main '),input);
  assert.equal(addEditorialSkip(out.html,route).status,'already');
 }
});
test('unsafe routes and ambiguous markup are left unchanged',()=>{
 const html=example('hr');
 for(const route of ['podijeli/vijest/topic/index.html','objave/../podijeli/vijest/index.html','objave\\..\\vijest','objave/spt-financije/index.html','objave/gnk-asg-504-milijuna-eura-prihoda/index.html']) assert.equal(addEditorialSkip(html,route).html,html,route);
 for(const bad of [html.replace('data-am-design="v1"',''),html.replace('</head>','<meta http-equiv="refresh" content="0;url=/"></head>'),html.replace('<main class="editorial-wrap article">','<main class="other">'),html.replace('</main>','</main><main></main>'),html.replace('<h1>','<p id="editorialContent"></p><h1>')])assert.equal(addEditorialSkip(bad,'objave/topic/index.html').html,bad);
});
test('all scoped changes have first body link, target and shared stylesheet',()=>{
 const dirs=['objave','komentari','analize','en/publications','en/commentary','en/analyses'];let n=0;
 function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.isFile()&&e.name.endsWith('.html')?[path.join(d,e.name)]:[]);}
 for(const root of dirs)for(const file of walk(`apps/portal/${root}`)){
  const html=fs.readFileSync(file,'utf8');if(!html.includes('href="#editorialContent"'))continue;n++;
  assert.match(html,/<body[^>]*><a class="skip" href="#editorialContent">(?:Preskoči na sadržaj|Skip to content)<\/a>/,file);
  assert.match(html,/<main id="editorialContent" tabindex="-1" class="editorial-wrap(?: article)?">/,file);assert.equal((html.match(/id="editorialContent"/g)||[]).length,1,file);
 }
 assert.ok(n>=437,`expected existing scoped pages, found ${n}`);
 const run=spawnSync(process.execPath,['scripts/apply-editorial-skip-scoped-v1.mjs'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).counts.patched,0,'rerun is idempotent');
});
