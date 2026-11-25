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

async function readBounded(response, maxBytes) {
  if (!response.body?.getReader) {
    // Minimal fetch mocks may only expose text(); production fetch has a stream.
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('feed over 800 KB');
    return text;
  }
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel().catch(()=>{}); throw new Error('feed over 800 KB'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map(chunk=>Buffer.from(chunk)),size).toString('utf8');
}

// At most one retry, inside the existing per-host slot and overall timeout.
// A server requesting a longer Retry-After is not retried early.
async function requestWithRetry(url, options, fetchImpl, sleep) {
  for (let attempt=0; attempt<2; attempt++) {
    let response;
    try { response=await fetchImpl(url,options); }
    catch (error) {
      if (attempt || options.signal.aborted) throw error;
      await sleep(250,options.signal);
      continue;
    }
    const retryable=[408,429,500,502,503,504].includes(response.status);
    if (!retryable || attempt) return response;
    const header=response.headers.get('retry-after');
    let delay=250;
    if (header) {
      const seconds=Number(header);
      const date=Date.parse(header);
      if (Number.isFinite(seconds) && seconds>=0) delay=seconds*1000;
      else if (Number.isFinite(date)) delay=Math.max(0,date-Date.now());
      else return response;
    }
    if (delay>2000) return response;
    if (response.body?.cancel) await response.body.cancel().catch(()=>{});
    await sleep(delay,options.signal);
  }
}

export async function fetchFeedXml(url, { fetchImpl = fetch, maxRedirects = 2, maxBytes = 800000, sleep = (ms,signal) => new Promise((resolve,reject)=>{
  if(signal.aborted) return reject(signal.reason);
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  signal.addEventListener('abort',abort,{once:true});
}) } = {}) {
  let current = safeUrl(url);
  if (!current) throw new Error('unsafe feed URL');
  const visited = new Set();
  const signal = AbortSignal.timeout(9000);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (visited.has(current)) throw new Error('RSS redirect loop');
    visited.add(current);
    const response = await requestWithRetry(current, {
      signal, redirect: 'manual',
      headers: {
        'User-Agent': 'AKTUAL-MEDIA-source-index/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml'
      }
    }, fetchImpl, sleep);
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
    const text = await readBounded(response, maxBytes);
    if (!/<(?:rss|feed|rdf:RDF)\b/i.test(text)) throw new Error('not RSS or Atom');
    return text;
  }
  throw new Error('RSS redirect limit exceeded');
}
