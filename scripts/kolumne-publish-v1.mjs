#!/usr/bin/env node
/**
 * Safe compatibility entrypoint for the retired one-off columns publisher.
 *
 * Columns now use the Content Factory calendar (`content/factory-queue/queue.json`),
 * its duplicate/hold preflight, the canonical published editorial registry, and
 * the generated bilingual archive. This legacy command intentionally performs
 * no image/network requests, no file writes, and no publication.
 *
 * Read-only inspection:
 *   node scripts/kolumne-publish-v1.mjs --slug <slug>
 *
 * Publication is handled only by the existing guarded Content Queue workflow;
 * `--uzivo` is rejected so this old script cannot bypass its gates.
 */
import fs from 'node:fs';

const slugAt = process.argv.indexOf('--slug');
const slug = slugAt >= 0 ? process.argv[slugAt + 1] : null;
if (process.argv.includes('--uzivo') || process.argv.includes('--write')) {
  console.error('Legacy direct publishing is disabled. Use the guarded Content Factory queue and its exact-SHA release process.');
  process.exit(2);
}
if (slugAt >= 0 && (!slug || slug.startsWith('--') || !/^[a-z0-9-]+$/.test(slug))) {
  console.error('--slug requires a lowercase URL-safe column slug.');
  process.exit(2);
}

const queue = JSON.parse(fs.readFileSync('content/factory-queue/queue.json', 'utf8'));
const state = JSON.parse(fs.readFileSync('apps/portal/data/content-queue-state.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json', 'utf8'));
const items = (queue.items || []).filter((item) => item.category === 'kolumne' && (!slug || item.slug === slug));
const result = items.map((item) => {
  const publishedState = state.published?.[item.id] || null;
  const canonical = (registry.items || []).find((entry) => entry.type === 'kolumna' && entry.slug === item.slug && entry.language === 'hr' && entry.status === 'published');
  return {
    id: item.id,
    slug: item.slug,
    status: publishedState && canonical ? 'published' : (queue.skipped || []).includes(item.id) ? 'skipped' : 'scheduled-or-pending',
    scheduledFor: `${item.date} ${item.time} Europe/Zagreb`,
    url: canonical?.url || null,
    action: 'read-only; no publication, network call or file write',
  };
});
if (slug && !items.length) {
  const canonical = (registry.items || []).find((entry) => entry.type === 'kolumna' && entry.slug === slug && entry.language === 'hr' && entry.status === 'published');
  if (!canonical) {
    console.error(`No column with slug "${slug}" exists in the published registry or Content Factory queue.`);
    process.exit(1);
  }
  result.push({ id: null, slug, status: 'published', scheduledFor: null, url: canonical.url, action: 'read-only; no publication, network call or file write' });
}
console.log(JSON.stringify({ version: 'GNK_ASG_COLUMNS_PUBLISHER_COMPAT_V1', items: result, noSideEffects: true }, null, 2));
