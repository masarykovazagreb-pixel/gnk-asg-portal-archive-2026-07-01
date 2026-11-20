import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {authorBand} from '../apps/shared/author-band-v1.mjs';

const en=['https://gnk-asg.hr/en/gnk-aktual/columns/','https://gnk-asg.hr/en/autorske-objave/','https://gnk-asg.hr/en/nermin-sefic/'];
const hr=['https://gnk-asg.hr/gnk-aktual/kolumne/','https://gnk-asg.hr/autorske-objave/','https://gnk-asg.hr/nermin-sefic/'];
const navLinks=html=>[...html.matchAll(/<a href="(https:\/\/gnk-asg\.hr\/[^" ]+)">/g)].map(m=>m[1]);
test('author-band template keeps English readers on English routes',()=>{
 for(const lang of ['en','en-GB','EN-us']) assert.deepEqual(navLinks(authorBand(lang)),en,lang);
 for(const lang of ['hr','sr','ja']) assert.deepEqual(navLinks(authorBand(lang)),hr,lang);
});
test('existing English author-archive bands link to their English destinations',()=>{
 const dir='apps/portal/en/autorske-objave';const files=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.html'));
 assert.ok(files.length>=14);
 for(const f of files){const file=path.join(dir,f.name),html=fs.readFileSync(file,'utf8');const bands=[...html.matchAll(/<section class="am-author"[^>]*data-am-lang="en"[^>]*>[\s\S]*?<\/section>/g)];assert.equal(bands.length,1,file);assert.deepEqual(navLinks(bands[0][0]),en,file);}
 for(const route of ['/en/gnk-aktual/columns/','/en/autorske-objave/','/en/nermin-sefic/']) {
  const file=`apps/portal${route}index.html`;assert.ok(fs.existsSync(file),file);assert.match(fs.readFileSync(file,'utf8'),/<html\b[^>]*lang="en"/i,file);
 }
});
