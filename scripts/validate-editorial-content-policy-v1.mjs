import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = process.env.EDITORIAL_PLAN_PATH
  ? path.resolve(process.env.EDITORIAL_PLAN_PATH)
  : path.join(ROOT, 'apps/portal/data/editorial-plan/manifest.json');
const PLAN_DIR = path.dirname(PLAN_PATH);
const POLICY_CUTOFF = new Date(process.env.EDITORIAL_POLICY_CUTOFF || '2026-08-05T00:00:00+02:00');
const MIN_WORDS = Number(process.env.EDITORIAL_MIN_WORDS || 3000);
const MIN_INTERNAL_LINKS = Number(process.env.EDITORIAL_MIN_INTERNAL_LINKS || 5);

if (!Number.isFinite(POLICY_CUTOFF.getTime())) throw new Error('Invalid EDITORIAL_POLICY_CUTOFF');
if (!Number.isInteger(MIN_WORDS) || MIN_WORDS < 1) throw new Error('Invalid EDITORIAL_MIN_WORDS');
if (!Number.isInteger(MIN_INTERNAL_LINKS) || MIN_INTERNAL_LINKS < 1) throw new Error('Invalid EDITORIAL_MIN_INTERNAL_LINKS');
if (!fs.existsSync(PLAN_PATH)) throw new Error(`Missing editorial plan: ${PLAN_PATH}`);

const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
const errors = [];
const checked = [];
const skipped = [];
const authorialTypes = new Set(['objava', 'komentar', 'analiza', 'publication', 'commentary', 'analysis']);
const operationalExceptionPattern = /(?:digital[\s-]*workforce|worker(?:i|s)?|operativn(?:i|a|o)|statusn(?:i|a|o)|tehni(?:c|č)k(?:i|a|o) bilten)/iu;
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('hr', { granularity: 'word' })
  : null;

function countWords(value) {
  const text = String(value || '').trim();
  if (!text) return 0;
  if (segmenter) return [...segmenter.segment(text)].filter(segment => segment.isWordLike).length;
  return (text.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) || []).length;
}

function normalizeParagraph(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('hr')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOperationalException(item, sourceFile) {
  const haystack = [
    item.type,
    item.section,
    item.slug,
    item.contentClass,
    item.route,
    sourceFile,
  ].filter(Boolean).join(' ');
  return item.editorialPolicyException === 'digital-workforce-worker'
    || operationalExceptionPattern.test(haystack);
}

function addError(packId, item, message) {
  errors.push(`${packId}/${item.slug || item.title || 'unknown'}: ${message}`);
}

for (const pack of plan.packages || []) {
  const publishAt = new Date(pack.publishAt);
  if (!Number.isFinite(publishAt.getTime())) {
    errors.push(`${pack.id || 'unknown package'}: invalid publishAt`);
    continue;
  }

  // Previously published content is grandfathered. Every unpublished package
  // scheduled on or after the policy date must satisfy the new contract before
  // the publisher is allowed to materialize public HTML.
  if (pack.publishedAt || publishAt < POLICY_CUTOFF) {
    skipped.push({ id: pack.id, reason: pack.publishedAt ? 'already-published' : 'pre-policy' });
    continue;
  }

  for (const sourceFile of pack.files || []) {
    const sourcePath = path.join(PLAN_DIR, sourceFile);
    if (!fs.existsSync(sourcePath)) {
      errors.push(`${pack.id}: missing source file ${sourceFile}`);
      continue;
    }

    const items = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    if (!Array.isArray(items)) {
      errors.push(`${pack.id}/${sourceFile}: expected an array of editorial items`);
      continue;
    }

    for (const item of items) {
      const type = String(item.type || '').toLocaleLowerCase('hr');
      if (!authorialTypes.has(type)) {
        skipped.push({ id: pack.id, slug: item.slug, reason: `non-authorial:${type || 'missing'}` });
        continue;
      }
      if (isOperationalException(item, sourceFile)) {
        skipped.push({ id: pack.id, slug: item.slug, reason: 'digital-workforce-worker-exception' });
        continue;
      }

      const paragraphs = Array.isArray(item.paragraphs) ? item.paragraphs : [];
      const normalizedParagraphs = paragraphs.map(normalizeParagraph).filter(Boolean);
      const body = paragraphs.join('\n\n');
      const wordCount = countWords(body);
      const internalLinks = [...new Set((Array.isArray(item.links) ? item.links : [])
        .map(link => String(link || '').trim())
        .filter(link => link.startsWith('/') && !link.startsWith('//')))];
      const duplicates = normalizedParagraphs.filter((paragraph, index) => normalizedParagraphs.indexOf(paragraph) !== index);

      if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) addError(pack.id, item, 'missing or invalid slug');
      if (!item.title || !String(item.title).trim()) addError(pack.id, item, 'missing title');
      if (!item.seoTitle || !String(item.seoTitle).trim()) addError(pack.id, item, 'missing SEO title');
      if (!item.description || !String(item.description).trim()) addError(pack.id, item, 'missing meta description');
      if (!item.summary || !String(item.summary).trim()) addError(pack.id, item, 'missing summary');
      if (!item.image || !String(item.image).startsWith('/')) addError(pack.id, item, 'missing local image path');
      if (wordCount < MIN_WORDS) addError(pack.id, item, `body has ${wordCount} words; minimum is ${MIN_WORDS}`);
      if (internalLinks.length < MIN_INTERNAL_LINKS) addError(pack.id, item, `has ${internalLinks.length} unique internal links; minimum is ${MIN_INTERNAL_LINKS}`);
      if (duplicates.length) addError(pack.id, item, 'contains duplicated body paragraphs');

      checked.push({
        package: pack.id,
        sourceFile,
        slug: item.slug,
        type,
        wordCount,
        internalLinks: internalLinks.length,
      });
    }
  }
}

const summary = {
  ok: errors.length === 0,
  version: 'GNK_ASG_EDITORIAL_CONTENT_POLICY_V1_20260805',
  policyCutoff: POLICY_CUTOFF.toISOString(),
  minimumWords: MIN_WORDS,
  minimumInternalLinks: MIN_INTERNAL_LINKS,
  checked,
  skippedCount: skipped.length,
  errors,
};

if (errors.length) {
  console.error(`EDITORIAL_CONTENT_POLICY_FAILED ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log('EDITORIAL_CONTENT_POLICY_OK');
console.log(JSON.stringify(summary, null, 2));
