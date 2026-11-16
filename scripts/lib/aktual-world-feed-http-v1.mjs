/** Read external RSS through at most two explicitly validated HTTPS redirects.
 * Sources are untrusted. This transport never publishes article content.
 */
export function safeUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname || (u.port && u.port !== '443')) return '';
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (host === 'localhost' ||
        ['.localhost', '.local', '.internal', '.test', '.invalid', '.onion', '.example', '.home.arpa'].some(s => host.endsWith(s))) return '';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':') || host === '0') return '';
    return u.href;
  } catch {
    return '';
  }
}

export async function fetchFeedXml(url, { fetchImpl = fetch, maxRedirects = 2, maxBytes = 800000 } = {}) {
  let current = safeUrl(url);
  if (!current) throw new Error('unsafe feed URL');
  const visited = new Set();
  const signal = AbortSignal.timeout(9000);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (visited.has(current)) throw new Error('RSS redirect loop');
    visited.add(current);
    const response = await fetchImpl(current, {
      signal, redirect: 'manual',
      headers: {
        'User-Agent': 'AKTUAL-MEDIA-source-index/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml'
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (hop >= maxRedirects) throw new Error('RSS redirect limit exceeded');
      const location = response.headers.get('location');
      if (!location) throw new Error('RSS redirect missing Location');
      let next;
      try { next = safeUrl(new URL(location, current).href); } catch { next = ''; }
      if (!next) throw new Error('RSS redirect destination is unsafe');
      current = next;
      continue;
    }
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('feed over 800 KB');
    const text = await response.text();
    if (text.length > maxBytes) throw new Error('feed over 800 KB');
    if (!/<(?:rss|feed|rdf:RDF)\b/i.test(text)) throw new Error('not RSS or Atom');
    return text;
  }
  throw new Error('RSS redirect limit exceeded');
}
