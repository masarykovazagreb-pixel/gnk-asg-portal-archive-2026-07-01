#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const CONFIG_FILE = resolve(ROOT, 'apps/portal/data/seo-knowledge-graph-v1.json');
const REGISTRY_FILE = resolve(ROOT, 'apps/portal/data/editorial-registry.json');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const config = readJson(CONFIG_FILE);
const registry = readJson(REGISTRY_FILE);
const errors = [];
const warnings = [];

const normalisePath = (value) => {
  const path = String(value || '').trim();
  if (!path.startsWith('/')) return path;
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/' ? '/' : `${clean}/`;
};

const inferLanguage = (item, path) => {
  const explicit = String(item?.lang || '').toLowerCase();
  if (explicit === 'hr' || explicit === 'en') return explicit;
  return path.startsWith('/en/') ? 'en' : 'hr';
};

const inferType = (item, path) => {
  if (item?.type) return item.type;
  if (path.startsWith('/komentari/') || path.startsWith('/en/commentary/')) return 'komentar';
  if (path.startsWith('/analize/') || path.startsWith('/en/analyses/')) return 'analiza';
  if (path.startsWith('/gnk-aktual/kolumne/') || path.startsWith('/en/gnk-aktual/columns/')) return 'kolumna';
  if (path.startsWith('/objave/') || path.startsWith('/en/publications/')) return 'objava';
  return 'unknown';
};

if (config.version !== 'GNK_ASG_SEO_KNOWLEDGE_GRAPH_V1') {
  errors.push(`Unexpected config version: ${config.version || '(missing)'}`);
}
if (!Array.isArray(config.pillars) || config.pillars.length < 12) {
  errors.push('At least 12 SEO pillar definitions are required.');
}
if (!Array.isArray(config.protectedPrefixes) || !config.protectedPrefixes.length) {
  errors.push('Protected route prefixes are required.');
}

const ids = new Set();
const routes = new Map();
for (const pillar of config.pillars || []) {
  if (!pillar.id || ids.has(pillar.id)) errors.push(`Duplicate or missing pillar id: ${pillar.id || '(missing)'}`);
  ids.add(pillar.id);
  for (const key of ['hr', 'en']) {
    const route = normalisePath(pillar[key]);
    if (!route.startsWith('/')) errors.push(`Pillar ${pillar.id} has invalid ${key} route: ${pillar[key]}`);
    const routeKey = `${key}:${route}`;
    if (routes.has(routeKey) && routes.get(routeKey) !== pillar.id) {
      warnings.push(`Shared ${key} pillar route ${route}: ${routes.get(routeKey)} and ${pillar.id}`);
    } else {
      routes.set(routeKey, pillar.id);
    }
  }
  if (!Array.isArray(pillar.aliases) || pillar.aliases.length < 3) {
    errors.push(`Pillar ${pillar.id} must define at least 3 aliases.`);
  }
}

const items = Array.isArray(registry.items) ? registry.items : [];
const itemPaths = new Set();
const duplicatePaths = [];
let protectedItems = 0;
let incompleteItems = 0;
let inferredLanguageItems = 0;
let inferredTypeItems = 0;

for (const item of items) {
  const path = normalisePath(item.path);
  if (!path.startsWith('/') || !item.title) incompleteItems += 1;

  const language = inferLanguage(item, path);
  const type = inferType(item, path);
  if (!item.lang) inferredLanguageItems += 1;
  if (!item.type && type !== 'unknown') inferredTypeItems += 1;

  const key = `${language}:${path}`;
  if (itemPaths.has(key)) duplicatePaths.push(key);
  itemPaths.add(key);

  if ((config.protectedPrefixes || []).some((prefix) => path.startsWith(prefix))) protectedItems += 1;
}

if (protectedItems) errors.push(`Editorial registry contains ${protectedItems} protected-route item(s).`);
if (incompleteItems) errors.push(`Editorial registry contains ${incompleteItems} item(s) without a valid path or title.`);
for (const duplicate of duplicatePaths) warnings.push(`Duplicate registry path: ${duplicate}`);

const summary = {
  version: config.version,
  pillars: (config.pillars || []).length,
  collections: Object.keys(config.collections || {}).length,
  registryItems: items.length,
  uniqueRegistryPaths: itemPaths.size,
  duplicateRegistryPaths: duplicatePaths.length,
  inferredLanguageItems,
  inferredTypeItems,
  protectedItems,
  errors,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
