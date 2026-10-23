#!/usr/bin/env node
/**
 * INTERNI LINKOVI — nijedna veza unutar portala ne smije voditi u prazno.
 *
 * Portal ima preko sedam tisuća stranica i svaka nudi najmanje šest veza.
 * Jedna pogrešna putanja dovoljna je da čitatelj završi na 404, a da to nitko
 * ne primijeti tjednima. Ovaj test otvara svaku stranicu, uklanja sadržaj
 * <script> i <style> (da ne broji putanje koje skripta sastavlja u pregledniku)
 * i provjerava da svaki href="/…" ima stvarnu datoteku.
 *
 * Dopušteno je:
 *   • /api/…  — runtime krajnja točka, ne datoteka;
 *   • vanjske adrese (http, https, //) i mailto: — njih ne provjeravamo ovdje.
 *
 * Test ne piše ništa i ne pristupa mreži.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const ALLOWED_PREFIXES = ['/api/'];

const failures = [];
const notes = [];

const pages = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['assets', 'data', 'node_modules'].includes(entry.name)) continue;
      walk(full);
    } else if (entry.name === 'index.html') {
      pages.push(full);
    }
  }
};
walk(PORTAL);

const resolveTarget = (href) => {
  let path = href.slice(1);
  if (path === '') path = 'index.html';
  else if (path.endsWith('/')) path += 'index.html';
  let file = join(PORTAL, path);
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    return file;
  }
  return file;
};

let links = 0;
for (const page of pages) {
  const rel = relative(PORTAL, page);
  let html = readFileSync(page, 'utf8');
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  for (const match of html.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) {
    const href = match[1];
    if (href.startsWith('//')) continue;
    if (ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix))) continue;
    links += 1;
    if (!existsSync(resolveTarget(href))) failures.push(`${rel}: veza ${href} ne postoji`);
  }
}

/* Isti popis veza ne smije se ponavljati u tisućama redaka izvještaja. */
const uniqueFailures = [...new Set(failures)];
if (uniqueFailures.length !== failures.length) {
  notes.push(`${failures.length - uniqueFailures.length} dvostrukih prijava sažeto je u jednu`);
}

console.log(JSON.stringify({
  ok: uniqueFailures.length === 0,
  version: 'GNK_ASG_INTERNAL_LINKS_V1_20261023',
  pages: pages.length,
  links,
  allowed: ALLOWED_PREFIXES,
  notes,
  failures: uniqueFailures.slice(0, 40),
  failureCount: uniqueFailures.length
}, null, 2));
if (uniqueFailures.length) process.exit(1);
