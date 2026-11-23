#!/usr/bin/env node
/**
 * AKTUAL MEDIA: fail-closed draft quality check.
 * A source-linked draft is NOT an approved article or a public deployment.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = 'content/hr-news/drafts/2026-11-23-original-technology-explainers.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
assert.equal(data.status, 'DRAFT_ONLY_NOT_LIVE');
assert.ok(Array.isArray(data.articles) && data.articles.length >= 6);
assert.equal(data.draftCount, data.articles.length);
const slugs = new Set();
const titles = new Set();
for (const item of data.articles) {
  assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!slugs.has(item.slug), 'Duplicate slug');
  slugs.add(item.slug);
  assert.ok(item.title.length > 25 && item.title.length < 105);
  assert.ok(!titles.has(item.title), 'Duplicate title');
  titles.add(item.title);
  assert.ok(item.description.length >= 80 && item.description.length <= 180, 'Meta description length');
  assert.equal(item.language, 'hr');
  assert.equal(item.format, 'original_explainer');
  assert.equal(item.originalWork, true);
  assert.equal(item.editorApproved, false, 'Draft cannot self-approve');
  assert.equal(item.independentFactCheck, false, 'Draft cannot claim independent fact-check');
  assert.equal(item.imageRightsVerified, false, 'Draft cannot assert image rights');
  assert.equal(item.publicationStatus, 'editorial_review_required');
  assert.equal(item.publicUrl, null, 'Draft cannot claim public URL');
  assert.equal(item.author, null, 'Author must be established by editor');
  assert.equal(item.editor, null, 'Editor must be established by editor');
  assert.ok(Array.isArray(item.paragraphs) && item.paragraphs.length >= 4);
  assert.equal(item.articleBody, item.paragraphs.join('\n\n'));
  assert.ok(item.articleBody.split(/\s+/).length >= 175, 'Original text too short');
  assert.ok(Array.isArray(item.tags) && item.tags.length >= 2);
  assert.ok(Array.isArray(item.sources) && item.sources.length >= 2);
  const sources = new Set();
  for (const s of item.sources) {
    const u = new URL(s.url);
    assert.equal(u.protocol, 'https:', 'Source must use HTTPS');
    assert.ok(!u.username && !u.password);
    assert.ok(s.name.length > 4 && s.supports.length > 35);
    assert.ok(!sources.has(u.hostname), 'Use distinct source domains');
    sources.add(u.hostname);
  }
}
console.log(JSON.stringify({ ok: true, draftOnly: true, count: data.articles.length, articleSlugs: [...slugs] }));
