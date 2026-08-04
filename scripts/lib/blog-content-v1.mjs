const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

export function normalizeComparableText(value = '') {
  return String(value)
    .replace(/&([a-z]+|#39);/gi, (match, entity) => HTML_ENTITIES[entity.toLowerCase()] ?? match)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('hr');
}

export function removeDuplicateIntroParagraph(description = '', paragraphs = []) {
  if (!description || !Array.isArray(paragraphs) || paragraphs.length === 0) return paragraphs;
  const normalizedDescription = normalizeComparableText(description);
  const normalizedFirstParagraph = normalizeComparableText(paragraphs[0]);
  if (!normalizedDescription || normalizedDescription !== normalizedFirstParagraph) return paragraphs;
  return paragraphs.slice(1);
}
