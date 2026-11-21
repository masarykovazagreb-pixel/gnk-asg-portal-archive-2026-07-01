#!/usr/bin/env node
/**
 * Daily private intake from independent external provider price.download.
 * NOT a publisher: never writes public HTML, sitemaps or articles.
 * API response shape and permission to redistribute data must be verified.
 * Credentials live only in CI/server secrets, never in repository content.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROVIDER = 'https://price.download';
const MAX_BYTES = 1_500_000;
export function validateEndpoint(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash ||
      !(u.hostname === 'price.download' || u.hostname.endsWith('.price.download')) ||
      u.pathname === '/') throw Error('Unverified/unsafe price.download HTTPS API endpoint');
  return u.href;
}
export function validatePriceRows(input) {
  // Adapter schema intentionally separate from vendor schema: no assumption
  // about actual API fields. Use only after mapping a documented vendor response.
  if (input?.schema !== 'aktual-price-adapter-v1' || !Array.isArray(input.items))
    throw Error('PRICE_API_SCHEMA_UNVERIFIED');
  if (input.items.length > 2000) throw Error('Response too large');
  const ids = new Set();
  return input.items.map((item, index) => {
    const id = String(item?.id ?? '').trim();
    const title = String(item?.title ?? '').trim();
    const retailer = String(item?.retailer ?? '').trim();
    const price = Number(item?.price);
    const observedAt = String(item?.observedAt ?? '');
    let source;
    try { source = new URL(item?.sourceUrl); } catch { throw Error('Invalid original source URL at '+index); }
    if (!id || id.length > 128 || !title || title.length > 300 || !retailer ||
        !Number.isFinite(price) || price < 0 || item.currency !== 'EUR' ||
        Number.isNaN(Date.parse(observedAt)) || source.protocol !== 'https:' ||
        ids.has(id)) throw Error('Invalid price row at '+index);
    ids.add(id);
    return { id, title, retailer, price, currency: 'EUR', observedAt, sourceUrl: source.href };
  });
}
export async function fetchPrivate({endpoint, apiKey, fetchImpl=fetch}) {
  if (!apiKey) throw Error('PRICE_DOWNLOAD_API_KEY secret missing');
  const url = validateEndpoint(endpoint);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    const response = await fetchImpl(url, {
      method:'GET',
      headers: {Authorization: 'Bearer '+apiKey, Accept:'application/json'},
      redirect:'error',
      signal:abort.signal
    });
    if (!response.ok) throw Error('Provider HTTP '+response.status);
    if (!(response.headers.get('content-type')||'').includes('application/json'))
      throw Error('Provider response not JSON');
    const body = await response.text();
    if (Buffer.byteLength(body,'utf8') > MAX_BYTES) throw Error('Provider payload exceeds cap');
    return JSON.parse(body);
  } finally { clearTimeout(timer); }
}
export async function main(env=process.env) {
  const status = {provider:PROVIDER, independentThirdParty:true,
    checkedAt:new Date().toISOString(), published:false, itemCount:0, status:'blocked'};
  try {
    if (env.PRICE_DOWNLOAD_REUSE_APPROVED !== 'true')
      throw Error('PRICE_REUSE_RIGHTS_UNVERIFIED');
    if (env.PRICE_DOWNLOAD_API_CONTRACT_VERIFIED !== 'true')
      throw Error('PRICE_API_CONTRACT_UNVERIFIED');
    const raw = await fetchPrivate({endpoint:env.PRICE_DOWNLOAD_API_ENDPOINT, apiKey:env.PRICE_DOWNLOAD_API_KEY});
    const items = validatePriceRows(raw);
    status.itemCount = items.length;
    status.status = items.length ? 'validated-private-only' : 'empty';
  } catch (error) {
    status.reason = String(error.message || error).replace(/pd_live_[a-z0-9]+/ig,'[redacted]').slice(0,100);
  }
  const file = resolve('artifacts/price-download/last-intake-status.json');
  mkdirSync(dirname(file),{recursive:true});
  writeFileSync(file, JSON.stringify(status,null,2)+'\n');
  console.log(JSON.stringify(status));
  return status;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(s=>{if(s.status==='blocked')process.exitCode=1})
    .catch(()=>{console.error('Price intake failed safely');process.exitCode=1});
}
