#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { publishedItems } from './lib/publication-gate-v2.mjs';

const portal = 'apps/portal';
const registryPath = `${portal}/data/editorial-registry.json`;
const supplementPath = `${portal}/data/editorial-registry-supplement.json`;
const preferredHost = 'https://gnk-asg.hr';
const legacyHost = 'https://www.gnk-asg.hr';
const now = new Date(process.env.PUBLICATION_NOW || Date.now());

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const supplement = existsSync(supplementPath)
  ? JSON.parse(readFileSync(supplementPath, 'utf8'))
  : { items: [] };
const merged = [...(registry.items || [])];
const paths = new Set(merged.map((item) => item?.path).filter(Boolean));
for (const item of supplement.items || []) {
  if (item?.path && !paths.has(item.path)) {
    merged.push(item);
    paths.add(item.path);
  }
}

let scanned = 0;
let changed = 0;
let replacements = 0;
const missing = [];
for (const item of publishedItems({ ...registry, items: merged }, now)) {
  const route = String(item.path || '');
  if (!route.startsWith('/') || route.includes('..')) continue;
  const file = join(portal, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!existsSync(file)) {
    missing.push(route);
    continue;
  }
  scanned += 1;
  const before = readFileSync(file, 'utf8');
  const count = before.split(legacyHost).length - 1;
  if (!count) continue;
  const after = before.replaceAll(legacyHost, preferredHost);
  writeFileSync(file, after, 'utf8');
  changed += 1;
  replacements += count;
}

console.log(JSON.stringify({
  version: 'GNK_ASG_FIRST_PARTY_HOST_NORMALIZER_V1',
  preferredHost,
  legacyHost,
  scanned,
  changed,
  replacements,
  missingPublishedRoutes: missing.length
}, null, 2));
