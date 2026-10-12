import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ECB_DAILY_URL, CBK_FOREX_URL, parseEcbDailyReference, parseCbkDailyReference } from '../src/fx.mjs';
import { TWELVE_DATA_REFERENCE_URL, parseTwelveDataExchangeRate } from '../src/market-data.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
let ecbCache = { xml: '', fetchedAt: 0 };
let cbkCache = { html: '', fetchedAt: 0 };
let twelveDataCache = { value: null, fetchedAt: 0 };

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const decoded = decodeURIComponent(url.pathname);
    if (decoded === '/api/fx/ecb') {
      if (!ecbCache.xml || Date.now() - ecbCache.fetchedAt > 60 * 60 * 1000) {
        try {
          const upstream = await fetch(ECB_DAILY_URL, { headers: { Accept: 'application/xml,text/xml' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
          if (!upstream.ok) throw new Error('ECB feed returned an unsuccessful response.');
          const xml = await upstream.text();
          parseEcbDailyReference(xml);
          ecbCache = { xml, fetchedAt: Date.now() };
        } catch {
          if (!ecbCache.xml) {
            response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            response.end('ECB daily reference feed is unavailable. Bundled sample rates remain available in the app.');
            return;
          }
        }
      }
      response.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(ecbCache.xml),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      if (request.method === 'HEAD') response.end(); else response.end(ecbCache.xml);
      return;
    }
    if (decoded === '/api/market/eur-usd') {
      const sendJson = (status, payload, cacheControl = 'no-store') => {
        const body = JSON.stringify(payload);
        response.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body),
          'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
        });
        response.end(request.method === 'HEAD' ? '' : body);
      };
      const apiKey = String(process.env.TWELVEDATA_API_KEY || '').trim();
      if (!apiKey) {
        sendJson(200, { ok: false, configured: false, message: 'Optional market-data feed is not configured.' });
        return;
      }
      if (twelveDataCache.value && Date.now() - twelveDataCache.fetchedAt < 60_000) {
        sendJson(200, { ok: true, configured: true, ...twelveDataCache.value }, 'private, max-age=30');
        return;
      }
      try {
        const upstreamUrl = new URL(TWELVE_DATA_REFERENCE_URL);
        upstreamUrl.searchParams.set('symbol', 'EUR/USD');
        upstreamUrl.searchParams.set('apikey', apiKey);
        const upstream = await fetch(upstreamUrl, {
          headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000)
        });
        if (!upstream.ok) throw new Error('Market-data upstream request failed.');
        const text = await upstream.text();
        if (text.length > 64_000) throw new Error('Market-data response was too large.');
        const reference = parseTwelveDataExchangeRate(JSON.parse(text));
        twelveDataCache = { value: reference, fetchedAt: Date.now() };
        sendJson(200, { ok: true, configured: true, ...reference }, 'private, max-age=30');
      } catch {
        // Do not echo provider errors or the API key into the renderer or logs.
        sendJson(200, { ok: false, configured: true, message: 'Optional market-data reference is currently unavailable.' });
      }
      return;
    }
    if (decoded === '/api/fx/cbk') {
      if (!cbkCache.html || Date.now() - cbkCache.fetchedAt > 60 * 60 * 1000) {
        try {
          const upstream = await fetch(CBK_FOREX_URL, { headers: { Accept: 'text/html' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
          if (!upstream.ok) throw new Error('CBK page returned an unsuccessful response.');
          const html = await upstream.text();
          parseCbkDailyReference(html);
          cbkCache = { html, fetchedAt: Date.now() };
        } catch {
          if (!cbkCache.html) {
            response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            response.end('CBK daily indicative rate is unavailable. The sample rate remains available in the app.');
            return;
          }
        }
      }
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(cbkCache.html),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      if (request.method === 'HEAD') response.end(); else response.end(cbkCache.html);
      return;
    }
    const relative = decoded === '/' ? 'welcome.html' : decoded.replace(/^\/+/, '');
    const path = resolve(projectRoot, relative);
    if (path !== projectRoot && !path.startsWith(projectRoot + sep)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const info = await stat(path);
    if (!info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'"
    });
    if (request.method === 'HEAD') response.end(); else response.end(body);
  } catch (error) {
    const status = error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500;
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    response.end(status === 404 ? 'Not found' : 'Server error');
  }
});
server.listen(port, host, () => console.log(`Adria Bank demo serving locally at http://${host}:${port} — synthetic data only`));
