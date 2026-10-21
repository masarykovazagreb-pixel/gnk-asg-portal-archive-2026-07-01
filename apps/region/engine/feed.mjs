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


/* Slika iz feeda. Redom: media:content, media:thumbnail, enclosure s
   image/*, pa <img src> iz sažetka. Vraća se samo apsolutna https adresa —
   relativne se rješavaju prema adresi izvora. */
const imageFrom = (node, base, decodedSummary = '') => {
  const candidates = [];
  for (const m of node.matchAll(/<media:content\b[^>]*>/gi)) {
    const url = m[0].match(/\burl=["']([^"']+)["']/i);
    if (url) candidates.push(url[1]);
  }
  for (const m of node.matchAll(/<media:thumbnail\b[^>]*>/gi)) {
    const url = m[0].match(/\burl=["']([^"']+)["']/i);
    if (url) candidates.push(url[1]);
  }
  for (const m of node.matchAll(/<enclosure\b[^>]*>/gi)) {
    const type = (m[0].match(/\btype=["']([^"']+)["']/i) || [])[1] || '';
    const url = m[0].match(/\burl=["']([^"']+)["']/i);
    if (url && /^image\//i.test(type)) candidates.push(url[1]);
  }
  for (const m of node.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) candidates.push(m[1]);
  /* Sažetak često nosi escaped HTML, pa <img> postoji tek nakon dekodiranja. */
  for (const m of decodedSummary.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) candidates.push(m[1]);
  for (const raw of candidates) {
    const url = resolveUrl(decode(raw).trim(), base);
    if (!/^https:\/\//i.test(url)) continue;
    if (!/\.[a-z0-9]{2,5}(?:[?#].*)?$/i.test(url)) continue;
    return url;
  }
  return '';
};

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
      sourceName,
      image: imageFrom(node, base || link, decode(rawSummary || '')),
      imageAlt: title.replace(/\s+/g, ' ').trim().slice(0, 180)
    });
  }

  return items;
}

export function looksLikeFeed(text = '') {
  return /<rss\b|<feed\b|<rdf:RDF\b/i.test(text.slice(0, 4000));
}
