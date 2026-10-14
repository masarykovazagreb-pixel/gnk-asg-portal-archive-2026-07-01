const DEFAULT_MAX_LENGTH = 200;
const MIN_PREFERRED_SENTENCE_LENGTH = 80;

/**
 * Keep search/social descriptions concise without cutting off a complete sentence
 * when one fits. When a sentence does not fit, truncate at a word boundary and
 * mark the omission explicitly rather than appending keyword filler.
 */
export function limitSeoDescription(value, maxLength = DEFAULT_MAX_LENGTH) {
  const text = String(value ?? '').replace(/\s+/gu, ' ').trim();
  if (!Number.isInteger(maxLength) || maxLength < 2) {
    throw new TypeError('maxLength must be an integer greater than 1');
  }
  if (text.length <= maxLength) return text;

  const limit = maxLength - 1;
  const prefix = text.slice(0, maxLength);
  const sentenceMatches = [...prefix.matchAll(/[.!?](?=\s|$)/gu)];
  const sentenceEnd = sentenceMatches.length
    ? sentenceMatches[sentenceMatches.length - 1].index + 1
    : 0;
  if (sentenceEnd >= MIN_PREFERRED_SENTENCE_LENGTH) {
    return text.slice(0, sentenceEnd).trimEnd();
  }

  const wordBoundary = text.lastIndexOf(' ', limit);
  const end = wordBoundary >= MIN_PREFERRED_SENTENCE_LENGTH ? wordBoundary : limit;
  return `${text.slice(0, end).trimEnd().replace(/[,:;–—-]+$/u, '')}…`;
}
