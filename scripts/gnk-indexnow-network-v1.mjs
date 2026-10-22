#!/usr/bin/env node
/**
 * IndexNow za cijelu mrežu — šest domena i matična stranica.
 *
 * Uzima stvarni popis objavljenih stranica iz `apps/sites/site/network.json`
 * i dodaje indekse pod AKTUAL MEDIA. Zatim, po domeni, šalje jedan POST na
 * api.indexnow.org. Ključ je javan i već stoji kao `/<key>.txt` na svakoj
 * domeni (build ga upisuje u svaki izlaz), pa tražilica može provjeriti
 * vlasništvo bez ijednog secreta.
 *
 * Pokretanje:
 *   node scripts/gnk-indexnow-network-v1.mjs --check   samo popis, bez mreže
 *   node scripts/gnk-indexnow-network-v1.mjs           stvarno slanje
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = '2396905717b36885586139576d11142f';
const CHECK = process.argv.includes('--check');
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const networkFile = join(ROOT, 'apps/sites/site/network.json');
if (!existsSync(networkFile)) {
  console.error('nema apps/sites/site/network.json — pokreni node apps/sites/build.mjs');
  process.exit(1);
}
const network = JSON.parse(readFileSync(networkFile, 'utf8'));
const sites = new Map(network.sites.map((site) => [site.slug, site]));

const urls = new Set(network.pages.map((page) => page.url));
urls.add('https://gnk-asg.hr/gnk-aktual/mreza/');
urls.add('https://gnk-asg.hr/en/gnk-aktual/network/');
for (const slug of sites.keys()) {
  urls.add(`https://gnk-asg.hr/gnk-aktual/mreza/${slug}/`);
  urls.add(`https://gnk-asg.hr/en/gnk-aktual/network/${slug}/`);
}

const byHost = new Map();
for (const url of urls) {
  const { host } = new URL(url);
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push(url);
}

console.log(`IndexNow — ${urls.size} URL-ova na ${byHost.size} domena, ključ ${KEY}`);
for (const [host, list] of byHost) console.log(`  ${host}: ${list.length}`);
if (CHECK) process.exit(0);

const results = [];
for (const [host, list] of byHost) {
  const origin = `https://${host}`;
  const body = JSON.stringify({ host, key: KEY, keyLocation: `${origin}/${KEY}.txt`, urlList: list });
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const ok = response.status === 200 || response.status === 202;
    results.push({ host, status: response.status, ok, urls: list.length });
    console.log(`  ${ok ? 'OK' : 'GREŠKA'} ${host} — HTTP ${response.status} (${list.length} URL-ova)`);
  } catch (error) {
    results.push({ host, status: 0, ok: false, urls: list.length, error: error.message });
    console.log(`  GREŠKA ${host} — ${error.message}`);
  }
}

const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.error(`IndexNow: ${failed.length}/${results.length} domena nije potvrđeno.`);
  process.exit(1);
}
console.log(`IndexNow: sve ${results.length} domene potvrđene.`);
