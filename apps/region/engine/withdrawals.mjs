/** Privacy takedown registry: only SHA-256 fingerprints, no personal details.
 * Shared by RSS ingestion and page generators; never re-publish a withdrawn item.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync(new URL('../data/withdrawn-content-v1.json', import.meta.url), 'utf8'));
if (registry.schema !== 'AKTUAL_REGION_WITHDRAWN_V1') throw new Error('Invalid withdrawal registry');
const urlHashes = new Set(registry.sourceUrlHashes);
const slugHashes = new Set(registry.slugHashes);
const titleHashes = new Set(registry.titleHashes);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return (url.protocol + '//' + url.host + url.pathname).replace(/\/$/, '').toLowerCase();
  } catch { return ''; }
};
const canonicalTitle = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export function isWithdrawnItem(item) {
  if (!item) return false;
  const url = canonicalUrl(item.url);
  const slug = String(item.slug || '').trim().toLowerCase();
  const title = canonicalTitle(item.title);
  return Boolean(
    (url && urlHashes.has(sha256(url))) ||
    (slug && slugHashes.has(sha256(slug))) ||
    (title && titleHashes.has(sha256(title)))
  );
}
