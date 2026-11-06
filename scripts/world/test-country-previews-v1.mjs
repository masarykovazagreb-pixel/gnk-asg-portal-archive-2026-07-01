#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPreviews, renderCountry, validateCountries } from './build-country-previews-v1.mjs';
const sample = {id:'test-city', country:'Test & <script>', capital:'Grad', wave:'W1', status:'planned'};
test('HTML escape, noindex i jasna oznaka pripreme', () => {
  const h = renderCountry(sample);
  assert.match(h, /Test &amp; &lt;script&gt;/); assert.match(h, /noindex,nofollow,noarchive/);
  assert.match(h, /NIJE JAVNO IZDANJE/); assert.match(h, /#NerminSefić #NerminSefic/);
  assert.match(h, /property="og:title"/); assert.match(h, /name="twitter:description"/);
  assert.match(h, /https:\/\/gnk-asg\.hr\/gnk-aktual\//);
  assert.doesNotMatch(h, /property="og:url"|rel="canonical"/);
  assert.doesNotMatch(h, /<script>/);
});
test('engleska verzija ima ispravan jezik, povezane verzije i sigurne metapodatke', () => {
  const country = {...sample, countryEn:'Test " & <unsafe>'};
  const en = renderCountry(country, 'en'), hr = renderCountry(country);
  assert.match(en, /<html lang="en">/);
  assert.match(en, /Test &quot; &amp; &lt;unsafe&gt;/);
  assert.match(en, /WORKING PREVIEW — NOT A PUBLIC EDITION/);
  assert.match(en, /href="\.\.\/" lang="hr"/);
  assert.match(hr, /href="en\/" lang="en"/);
  assert.match(en, /noindex,nofollow,noarchive/);
  assert.match(en, /#NerminSefić #NerminSefic/);
  assert.doesNotMatch(en, /rel="canonical"|property="og:url"|<script>/);
  assert.throws(() => renderCountry(country, 'de'));
});
test('engleska stranica bez oznake generatora ne smije se prepisati', () => {
  const out=mkdtempSync(join(tmpdir(),'country-preview-en-'));
  try {
    mkdirSync(join(out,'test-city','en'),{recursive:true});
    writeFileSync(join(out,'test-city','en','index.html'),'original');
    assert.throws(() => buildPreviews([sample],out));
    assert.equal(readFileSync(join(out,'test-city','en','index.html'),'utf8'),'original');
  } finally {rmSync(out,{recursive:true,force:true});}
});
test('samo planned, bez feeda i bez brisanja drugih datoteka', () => {
  const out = mkdtempSync(join(tmpdir(), 'country-preview-'));
  try {
    writeFileSync(join(out,'keep.txt'),'original');
    assert.equal(buildPreviews([sample,{...sample,id:'live-city',status:'live'}], out),1);
    assert.equal(readFileSync(join(out,'keep.txt'),'utf8'),'original');
    assert.equal(readFileSync(join(out,'test-city','robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
    assert.equal(existsSync(join(out,'live-city')),false);
    assert.equal(existsSync(join(out,'test-city','sitemap.xml')),false);
    assert.equal(buildPreviews([sample],out),1);
  } finally { rmSync(out,{recursive:true,force:true}); }
});
test('odbijanje opasnog ili dupliranog identifikatora', () => {
  assert.throws(() => validateCountries([{...sample,id:'../x'}]));
  assert.throws(() => validateCountries([sample,sample]));
  assert.throws(() => validateCountries([{...sample,status:'unknown'}]));
});
test('ne prepisuje postojeće stranice bez oznake generatora', () => {
  const out=mkdtempSync(join(tmpdir(),'country-preview-'));
  try { mkdirSync(join(out,'test-city')); writeFileSync(join(out,'test-city','index.html'),'original');
    assert.throws(() => buildPreviews([sample],out));
    assert.equal(readFileSync(join(out,'test-city','index.html'),'utf8'),'original');
  } finally {rmSync(out,{recursive:true,force:true});}
});
test('stvarni registar gradi po jedan predložak za svaku planiranu državu', () => {
  const registry = JSON.parse(readFileSync(new URL('../../config/world-countries-v1.json', import.meta.url),'utf8'));
  const planned = registry.countries.filter(c => c.status === 'planned');
  const out=mkdtempSync(join(tmpdir(),'country-registry-'));
  try {
    assert.equal(buildPreviews(registry.countries,out),planned.length);
    assert.ok(planned.length > 0);
    for (const c of planned) {
      const html=readFileSync(join(out,c.id,'index.html'),'utf8');
      assert.match(html,/noindex,nofollow,noarchive/);
      assert.match(html,/NIJE JAVNO IZDANJE/);
      assert.doesNotMatch(html,/<link\b[^>]*rel=["']canonical/i);
      const english=readFileSync(join(out,c.id,'en','index.html'),'utf8');
      assert.match(english,/<html lang="en">/);
      assert.match(english,/WORKING PREVIEW — NOT A PUBLIC EDITION/);
      assert.match(english,/noindex,nofollow,noarchive/);
      assert.doesNotMatch(english,/<link\b[^>]*rel=["']canonical/i);
      assert.match(readFileSync(join(out,c.id,'robots.txt'),'utf8'),/Disallow: \//);
    }
  } finally { rmSync(out,{recursive:true,force:true}); }
});
