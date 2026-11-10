import test from 'node:test';
import assert from 'node:assert/strict';
import { personName, canonicalLinks, internalLinkPaths } from '../scripts/lib/seo-coverage-v1.mjs';

test('Croatian and unaccented names use Unicode-aware word boundaries', () => {
  assert.equal(personName.test('Urednik: Nermin Sefić.'), true);
  assert.equal(personName.test('Nermin Sefic'), true);
  assert.equal(personName.test('Nermin Sefićev'), false);
});

test('canonical link attributes work in either order and retain duplicates', () => {
  const head = `<link rel="canonical" href="https://gnk-asg.hr/a/"><link href='https://gnk-asg.hr/b/' rel='canonical'>`;
  assert.deepEqual(canonicalLinks(head), ['https://gnk-asg.hr/a/', 'https://gnk-asg.hr/b/']);
});

test('only actual same-origin links count, resolving relative addresses per page', () => {
  const html = `<script>"<a href='/nermin-sefic/'>"</script><a href='../radio/'>radio</a><a href='https://example.com/usa/'>x</a><a href='https://gnk-asg.hr/nermin-sefic/#about'>Nermin</a>`;
  assert.deepEqual([...internalLinkPaths(html, new URL('https://gnk-asg.hr/en/'))], ['/radio/', '/nermin-sefic/']);
});
