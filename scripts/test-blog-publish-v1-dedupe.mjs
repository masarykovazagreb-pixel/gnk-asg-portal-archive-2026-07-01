#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  collapseConsecutiveDuplicateParagraphs,
  normalizeComparableText,
  removeDuplicateIntroParagraph,
} from './lib/blog-content-v1.mjs';

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
assert.deepEqual(
  collapseConsecutiveDuplicateParagraphs([
    'A company accepting crypto payments takes on market risk.',
    'A company accepting crypto payments takes on market risk.',
    'Different supporting paragraph.',
  ]),
  ['A company accepting crypto payments takes on market risk.', 'Different supporting paragraph.'],
);
assert.deepEqual(
  removeDuplicateIntroParagraph('Meta description', [
    'Repeated article lead',
    'Repeated   article lead',
    'Different supporting paragraph.',
  ]),
  ['Repeated article lead', 'Different supporting paragraph.'],
);

console.log('blog mirror intro dedupe: 7/7 passed');
