import { isVerifiedNerminAuthor } from './editorial-attribution-v1.mjs';

const isPersonalAuthorTag = (value) => /nermin|sefi[cć]/i.test(String(value || '').replace(/^#+/, ''));

/**
 * Keep hashtags in social distribution only. Personal-name tags are retained
 * only on a registry-verified Nermin byline; organization/topic tags remain.
 */
export function socialHashtagsFor(item, candidates, fallback = ['GNKASG']) {
  const source = Array.isArray(candidates) ? candidates : [];
  const allowed = source.filter((tag) => {
    const value = String(tag || '').trim();
    return value && (!isPersonalAuthorTag(value) || isVerifiedNerminAuthor(item));
  });
  const selected = allowed.length ? allowed : fallback;
  const seen = new Set();
  return selected.map((tag) => String(tag || '').replace(/^#+/, '').trim())
    .filter((tag) => tag && (!isPersonalAuthorTag(tag) || isVerifiedNerminAuthor(item)))
    .filter((tag) => {
      const key = tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
