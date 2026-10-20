/**
 * Minimalni, tolerantni čitač RSS 2.0 / Atom / RDF feedova.
 * Ne pokušava biti potpun parser — cilj je pouzdano izvući naslov, poveznicu,
 * sažetak, datum i rubriku iz onoga što mediji stvarno objavljuju.
 */
import { decode, parseDate, stripTags } from './lib.mjs';

const blocks = (xml, tag) => {
  const out = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
};

const tag = (xml, name) => {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  return m ? decode(m[1]).trim() : '';
};

const attr = (xml, name, attrName) => {
  const re = new RegExp(`<${name}\\b[^>]*\\b${attrName}=["']([^"']+)["'][^>]*>`, 'i');
  const m = xml.match(re);
  return m ? decode(m[1]).trim() : '';
};

const selfLink = (xml) => {
  const re = /<link\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    if (/rel=["']alternate["']/i.test(attrs) || !/rel=/i.test(attrs)) {
      const href = attrs.match(/href=["']([^"']+)["']/i);
      if (href) return decode(href[1]).trim();
    }
  }
  return '';
};

export const resolveUrl = (href, base) => {
  if (!href) return '';
  try { return new URL(href, base).toString(); } catch { return href; }
};

const firstText = (xml, names) => {
  for (const name of names) {
    const value = tag(xml, name);
    if (value) return value;
  }
  return '';
};

const cleanSummary = (value) => stripTags(value)
  .replace(/^\s*(?:\[\.\.\.\]|\[…\])/, '')
  .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '')
  .replace(/\s+/g, ' ')
  .trim();

export function parseFeed(xml, { base = '', sourceId = '', sourceName = '' } = {}) {
  const items = [];
  const rssItems = blocks(xml, 'item');
  const atomEntries = blocks(xml, 'entry');
  const nodes = rssItems.length ? rssItems : atomEntries;

  for (const node of nodes) {
    const title = stripTags(firstText(node, ['title']));
    let link = firstText(node, ['link']);
    if (!link || !/^https?:/i.test(link)) link = selfLink(node) || attr(node, 'link', 'href') || link;
    if (!link) link = stripTags(firstText(node, ['guid', 'id']));
    link = resolveUrl(link, base);
    if (!title || !/^https?:/i.test(link)) continue;

    const rawSummary = firstText(node, ['description', 'summary', 'content:encoded', 'content']);
    const summary = cleanSummary(rawSummary).slice(0, 900);
    const rawDate = firstText(node, ['pubDate', 'published', 'updated', 'dc:date', 'date']);
    const date = parseDate(rawDate);

    const categories = [...node.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)]
      .map((m) => stripTags(decode(m[1])))
      .filter(Boolean)
      .slice(0, 4);

    const author = stripTags(firstText(node, ['dc:creator', 'author', 'name'])).slice(0, 80);

    items.push({
      title: title.replace(/\s+/g, ' ').trim(),
      url: link,
      summary,
      date: date ? date.toISOString() : '',
      categories,
      author,
      source: sourceId,
      sourceName
    });
  }

  return items;
}

export function looksLikeFeed(text = '') {
  return /<rss\b|<feed\b|<rdf:RDF\b/i.test(text.slice(0, 4000));
}
