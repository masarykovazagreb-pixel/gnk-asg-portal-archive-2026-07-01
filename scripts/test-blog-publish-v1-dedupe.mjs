#!/usr/bin/env node
import assert from 'node:assert/strict';
import { normalizeComparableText, removeDuplicateIntroParagraph } from './lib/blog-content-v1.mjs';

assert.equal(normalizeComparableText('Rizik &amp; kapital'), 'rizik & kapital');
assert.deepEqual(
  removeDuplicateIntroParagraph('Digitalni due diligence', ['Digitalni   due diligence', 'Drugi odlomak']),
  ['Drugi odlomak'],
);
assert.deepEqual(
  removeDuplicateIntroParagraph('Rizik & kapital', ['Rizik &amp; kapital', 'Drugi odlomak']),
  ['Drugi odlomak'],
);
assert.deepEqual(
  removeDuplicateIntroParagraph('Opis članka', ['Drugačiji uvod', 'Drugi odlomak']),
  ['Drugačiji uvod', 'Drugi odlomak'],
);
assert.deepEqual(removeDuplicateIntroParagraph('', ['Uvod']), ['Uvod']);

console.log('blog mirror intro dedupe: 5/5 passed');
