import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {normalizeRegionalArticles} from '../apps/region/engine/article-url-integrity.mjs';

const record=(slug,url,date='2026-10-23T05:00:00Z',title='Verifiable headline')=>
  ({slug,url,date,title,source:'uol',sourceName:'UOL',summary:'Short attributed excerpt'});
test('Two different original sources cannot overwrite one regional article path',()=>{
  const rows=[
    record('saopaulo-2026-10-23-uol-headline-7a1ea5','https://www.uol.com.br/one'),
    record('saopaulo-2026-10-23-uol-headline-7a1ea5','https://www.uol.com.br/two'),
    record('saopaulo-2026-10-23-uol-headline-7a1ea5','https://www.uol.com.br/three')
  ];
  const a=normalizeRegionalArticles(rows);
  const b=normalizeRegionalArticles([...rows].reverse());
  assert.equal(a.items.length,3);
  assert.equal(a.stats.slugCollisionsResolved,2);
  assert.equal(new Set(a.items.map(x=>x.slug)).size,3);
  assert.equal(new Set(a.items.map(x=>x.url)).size,3);
  assert.deepEqual(a.items,b.items,'Input feed order cannot change article canonical URLs');
  assert.ok(a.items.every(x=>x.slug.length<=120));
  assert.deepEqual(rows.map(x=>x.slug),Array(3).fill('saopaulo-2026-10-23-uol-headline-7a1ea5'),
    'Do not mutate archived source records');
});
test('Same source URL repeated in RSS is one page, one sitemap entry',()=>{
  const a=normalizeRegionalArticles([
    record('article-1','https://news.example.org/a#top','2026-10-22T06:00:00Z'),
    record('article-1','https://news.example.org/a','2026-10-23T06:00:00Z'),
    record('article-2','https://news.example.org/b')
  ]);
  assert.equal(a.items.length,2);
  assert.equal(a.stats.duplicateSources,1);
  assert.equal(a.stats.slugCollisionsResolved,0);
  assert.equal(a.items[0].date,'2026-10-23T06:00:00Z');
});
test('Fail closed for path traversal, credentials, HTTP, malformed records',()=>{
  const a=normalizeRegionalArticles([
    null,
    record('../admin','https://news.example.org/1'),
    record('valid','http://news.example.org/2'),
    record('valid','https://user:secret@news.example.org/3'),
    record('valid','https://news.example.org/4'),
    record('valid','https://news.example.org/5')
  ]);
  assert.equal(a.stats.invalid,4);
  assert.equal(a.stats.slugCollisionsResolved,1);
  assert.equal(a.stats.accepted,2);
  assert.equal(a.stats.input,a.stats.accepted+a.stats.invalid+a.stats.duplicateSources);
  assert.ok(a.items.every(x=>!x.slug.includes('/')&&!x.slug.includes('..')));
  assert.throws(()=>normalizeRegionalArticles({}),TypeError);
});
test('Production regional generator normalizes before writing HTML and sitemap',()=>{
  const source=fs.readFileSync('apps/region/engine/build.mjs','utf8');
  assert.match(source,/const normalized = normalizeRegionalArticles\(data\.items\)/);
  assert.match(source,/data\.items = normalized\.items/);
  assert.ok(source.indexOf('data.items = normalized.items')<source.indexOf("write('index.html', homePage"));
  assert.match(source,/urlIntegrity: normalized\.stats/);
});
