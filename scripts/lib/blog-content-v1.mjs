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

export function collapseConsecutiveDuplicateParagraphs(paragraphs = []) {
  if (!Array.isArray(paragraphs) || paragraphs.length < 2) return paragraphs;
  return paragraphs.filter((paragraph, index) => {
    if (index === 0) return true;
    const current = normalizeComparableText(paragraph);
    const previous = normalizeComparableText(paragraphs[index - 1]);
    return !current || current !== previous;
  });
}

export function removeDuplicateIntroParagraph(description = '', paragraphs = []) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return paragraphs;
  const normalizedDescription = normalizeComparableText(description);
  const normalizedFirstParagraph = normalizeComparableText(paragraphs[0]);
  const withoutMetaDuplicate = normalizedDescription && normalizedDescription === normalizedFirstParagraph
    ? paragraphs.slice(1)
    : paragraphs;
  return collapseConsecutiveDuplicateParagraphs(withoutMetaDuplicate);
}
