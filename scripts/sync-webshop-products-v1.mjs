#!/usr/bin/env node
/**
 * Syncs apps/portal/data/webshop-products.json from the live
 * product-catalog-api-v1.js GET endpoint, so the static storefront
 * page always reflects whatever was last written via the API
 * (POST/PUT with the secret key), without the public page needing
 * to call the API directly on every page load.
 *
 * Read-only call, no API key needed (GET /api/v1/products is public
 * by design -- see product-catalog-api-v1.js for the security model
 * of the write endpoints).
 *
 * Run on a schedule via .github/workflows/sync-webshop-products.yml
 * (every 15 minutes) or manually:
 *   node scripts/sync-webshop-products-v1.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'apps/portal/data/webshop-products.json');
const API_URL = 'https://gnk-asg.hr/api/v1/products';

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function loadCurrent() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  let apiResult;
  try {
    apiResult = await fetchJson(API_URL);
  } catch (error) {
    console.error('webshop product sync: API fetch failed:', error.message);
    // Fail-closed on the sync side too: keep whatever static file
    // already exists rather than overwriting it with nothing.
    process.exitCode = 1;
    return;
  }

  const apiProducts = Array.isArray(apiResult?.products) ? apiResult.products : [];
  const current = loadCurrent();

  if (!apiProducts.length) {
    // The API's KV store may simply be empty/unconfigured (e.g. no
    // WEBSHOP_API_KEY secret set yet, or nothing ever POSTed). Do not
    // blank out a working static catalog just because the dynamic
    // store is empty -- that would take the storefront offline.
    console.log('webshop product sync: API returned 0 products; leaving existing static catalog untouched.');
    return;
  }

  const output = {
    schemaVersion: 'webshop-products-v1',
    note: 'Synced automatically from the product-catalog-api-v1.js Worker endpoint. Do not hand-edit directly if the API sync is active -- changes will be overwritten on the next sync cycle. Use POST/PUT /api/v1/products (with the WEBSHOP_API_KEY secret) instead.',
    syncedAt: new Date().toISOString(),
    products: apiProducts.map(p => ({
      id: p.sku,
      name: p.name,
      category: p.category || '',
      description: p.description || '',
      priceNote: typeof p.priceEur === 'number'
        ? `${p.priceEur.toFixed(2)} EUR`
        : 'Cijena na upit',
      availability: p.availability || 'on_request',
    })),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('webshop product sync: wrote', output.products.length, 'products from API.');
}

main();
