import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { appendSitemap } from '../lib/prenos-v1.mjs';
import { columnSitemapEntries } from '../../apps/sites/lib/sindikacija.mjs';
test('ne izmišlja lastmod iz dana gradnje i čuva poznat datum',()=>{
  const dir=mkdtempSync(join(tmpdir(),'sitemap-dates-'));
  try {
    const file=join(dir,'sitemap.xml');writeFileSync(file,'<urlset>\n</urlset>');
    const entries=[{loc:'https://example.com/no-date/'},{loc:'https://example.com/known/',lastmod:'2026-10-20'},{loc:'https://example.com/bad/',lastmod:'2026-02-30'}];
    assert.equal(appendSitemap(file,entries),true);
    const xml=readFileSync(file,'utf8');
    assert.match(xml,/<loc>https:\/\/example\.com\/no-date\/<\/loc><changefreq>/);
    assert.match(xml,/<loc>https:\/\/example\.com\/known\/<\/loc><lastmod>2026-10-20<\/lastmod>/);
    assert.match(xml,/<loc>https:\/\/example\.com\/bad\/<\/loc><changefreq>/);
    assert.equal(appendSitemap(file,entries),false);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('kolumne ne dobijaju izmišljeni lastmod i imaju stabilne adrese', () => {
  const site={base:'https://example.com/'}, columns=[{slug:'prva',published:'2026-01-01'}, {slug:'druga'}];
  const first=columnSitemapEntries(site,columns);
  assert.equal(first,columnSitemapEntries(site,columns));
  assert.match(first,/<loc>https:\/\/example\.com\/kolumna\/prva\/<\/loc>/);
  assert.doesNotMatch(first, /<lastmod>/);
});
