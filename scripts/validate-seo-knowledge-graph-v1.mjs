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
  return `${path.replace(/\/+$/, '') || '/'}/`.replace(/^\/\/$/, '/');
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
let protectedItems = 0;
let incompleteItems = 0;
for (const item of items) {
  const path = normalisePath(item.path);
  if (!path.startsWith('/')) incompleteItems += 1;
  if (!item.title || !item.lang || !item.type) incompleteItems += 1;
  if (itemPaths.has(`${item.lang}:${path}`)) errors.push(`Duplicate registry path: ${item.lang}:${path}`);
  itemPaths.add(`${item.lang}:${path}`);
  if ((config.protectedPrefixes || []).some((prefix) => path.startsWith(prefix))) protectedItems += 1;
}

if (protectedItems) errors.push(`Editorial registry contains ${protectedItems} protected-route item(s).`);
if (incompleteItems) errors.push(`Editorial registry contains ${incompleteItems} structurally incomplete item(s).`);

const summary = {
  version: config.version,
  pillars: (config.pillars || []).length,
  collections: Object.keys(config.collections || {}).length,
  registryItems: items.length,
  uniqueRegistryPaths: itemPaths.size,
  protectedItems,
  errors,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
