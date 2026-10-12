// Regression checks for the bilingual Adria Bank project announcement and its factual boundaries.
// Run: node --test apps/portal/tests/adria-bank-project-page.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = [
  {
    path: new URL('../bank/index.html', import.meta.url),
    lang: 'hr',
    canonical: 'https://gnk-asg.hr/bank/',
    scopeId: 'buduci-opseg',
    date: '12. 12. 2027.',
    announcement: 'PREDSTAVLJAMO PROJEKT ADRIA BANK',
  },
  {
    path: new URL('../en/bank/index.html', import.meta.url),
    lang: 'en',
    canonical: 'https://gnk-asg.hr/en/bank/',
    scopeId: 'potential-scope',
    date: '12 DEC 2027',
    announcement: 'INTRODUCING PROJECT ADRIA BANK',
  },
].map((page) => ({ ...page, html: readFileSync(page.path, 'utf8') }));

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

test('both routes make a bold announcement of the project, not an operating bank', () => {
  for (const page of pages) {
    assert.match(page.html, new RegExp(page.announcement));
    assert.match(page.html, /not an operating bank|ne otvaranje banke/i);
    assert.match(page.html, /permissions? (?:remain )?pending|dozvole su na čekanju/i);
    assert.match(page.html, new RegExp(`<link rel="canonical" href="${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
  }
});

test('nine current demo languages and the conditional 14-month objective are explicit', () => {
  for (const page of pages) {
    assert.equal(count(page.html, /class="ab-language"/g), 9, `${page.lang} language count`);
    assert.match(page.html, /14-MJESEČNI CILJ · UVJETAN|14-MONTH OBJECTIVE · CONDITIONAL/);
    assert.match(page.html, new RegExp(page.date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page.html, /conditional objective|uvjetni projektni cilj/i);
    assert.match(page.html, /not a promised opening date|nije obećanje otvaranja/i);
  }
});

test('the demo inventory remains separate from the market-benchmark catalogue', () => {
  for (const page of pages) {
    assert.equal(count(page.html, /class="ab-detail-card"/g), 9, `${page.lang} demo inventory`);
    assert.equal(count(page.html, /class="ab-scope-card"/g), 9, `${page.lang} market catalogue`);
    assert.match(page.html, new RegExp(`id="${page.scopeId}"`));
    assert.match(page.html, /non-exhaustive|neiscrpan/i);
    assert.match(page.html, /Market benchmark ≠ available service|Tržišni benchmark ≠ dostupna usluga/);
    assert.match(page.html, /does not claim that Adria Bank will offer|ne tvrdi da će Adria Bank nuditi/i);
  }
});

test('every hero and navigation fragment resolves to a unique local ID', () => {
  for (const page of pages) {
    const ids = [...page.html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page.lang} duplicate IDs`);
    for (const [, fragment] of page.html.matchAll(/<a\b[^>]*href="#([^"]+)"/g)) {
      assert.ok(ids.includes(fragment), `${page.lang} missing #${fragment}`);
    }
  }
});
