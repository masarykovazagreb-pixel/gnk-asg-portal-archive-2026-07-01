// Helpers for the read-only SEO coverage audit. They do not crawl the web.
export const personName = /(?<![\p{L}\p{N}])(?:Nermin\s+Sefi[cć]|Sefi[cć]\s+Nermin)(?![\p{L}\p{N}])/iu;

export function attribute(tag, name) {
  const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  return tag.match(pattern)?.[2] ?? null;
}

export function canonicalLinks(head) {
  return [...head.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({ rel: attribute(tag, 'rel'), href: attribute(tag, 'href') }))
    .filter(({ rel, href }) => rel?.toLowerCase().split(/\s+/).includes('canonical') && href)
    .map(({ href }) => href);
}

export function internalLinkPaths(html, pageUrl) {
  const withoutCode = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const paths = new Set();
  for (const [tag] of withoutCode.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(tag, 'href');
    if (href === null) continue;
    try {
      const url = new URL(href.replaceAll('&amp;', '&'), pageUrl);
      if (url.origin === 'https://gnk-asg.hr') paths.add(url.pathname);
    } catch { /* malformed href is not evidence of an internal link */ }
  }
  return paths;
}
