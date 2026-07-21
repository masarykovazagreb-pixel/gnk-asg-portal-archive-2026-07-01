import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCycle } from '../src/review-gate.mjs';

function cycleWith(drafts, comments = []) {
  return {
    mode: 'OFFLINE',
    date: '2026-07-22',
    drafts,
    comments
  };
}

test('review gate never allows public release', () => {
  const review = reviewCycle(cycleWith([
    { id: 'd1', tab: 'plan', title: 'Dnevni plan', body: 'Interni pregled napretka.', status: 'DRAFT_ONLY', public: false, publishAt: null }
  ]));
  assert.equal(review.publicReleaseAllowed, false);
  assert.equal(review.controls.publicPublishingAllowed, false);
  assert.equal(review.controls.productionWriteAllowed, false);
});

test('binding corporate claim is held', () => {
  const review = reviewCycle(cycleWith([
    { id: 'd2', tab: 'newsroom', title: 'Ugovor', body: 'Potpisan je ugovor s partnerom.', status: 'DRAFT_ONLY', public: false, publishAt: null }
  ]));
  assert.equal(review.reviewedItems[0].decision, 'HOLD');
  assert.ok(review.reviewedItems[0].findings.some((finding) => finding.code === 'BINDING_CLAIM'));
});

test('unclassified financial claim is held', () => {
  const review = reviewCycle(cycleWith([
    { id: 'd3', tab: 'krediti', title: 'Likvidnost', body: 'Planirani kredit iznosi 2 milijuna EUR.', status: 'DRAFT_ONLY', public: false, publishAt: null }
  ]));
  assert.equal(review.reviewedItems[0].decision, 'HOLD');
  assert.ok(review.reviewedItems[0].findings.some((finding) => finding.code === 'FINANCIAL_CLASS_MISSING'));
});

test('near-duplicate content requires revision', () => {
  const current = cycleWith([
    { id: 'd4', tab: 'plan', title: 'Dnevni operativni smjer', body: 'Tim zatvara ključne ovisnosti i određuje vlasnike zadataka.', status: 'DRAFT_ONLY', public: false, publishAt: null }
  ]);
  const previous = cycleWith([
    { id: 'old', tab: 'plan', title: 'Dnevni operativni smjer', body: 'Tim zatvara ključne ovisnosti i određuje vlasnike zadataka.', status: 'DRAFT_ONLY', public: false, publishAt: null }
  ]);
  const review = reviewCycle(current, [previous]);
  assert.equal(review.reviewedItems[0].decision, 'HOLD');
  assert.ok(review.reviewedItems[0].findings.some((finding) => finding.code === 'NEAR_DUPLICATE'));
});
