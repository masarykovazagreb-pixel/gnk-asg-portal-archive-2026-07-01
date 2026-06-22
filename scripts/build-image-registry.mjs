#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd());
const portalRoot = path.resolve(repoRoot, process.argv[2] || 'apps/portal');
const outputPath = path.resolve(repoRoot, process.argv[3] || 'apps/portal/data/image-usage-registry.json');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);

if (!fs.existsSync(portalRoot)) {
  throw new Error(`Portal root does not exist: ${portalRoot}`);
}

const previous = readPrevious(outputPath);
const previousByPath = new Map((previous.images || []).map(item => [item.path, item]));
const files = walk(portalRoot).filter(file => allowedExtensions.has(path.extname(file).toLowerCase()));
const images = [];

for (const file of files) {
  const relative = slash(path.relative(portalRoot, file));
  const bytes = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const prior = previousByPath.get(relative) || {};

  images.push({
    id: prior.id || `img-${hash.slice(0, 16)}`,
    path: relative,
    filename: path.basename(file),
    extension: path.extname(file).toLowerCase(),
    bytes: bytes.length,
    sha256: hash,
    width: prior.width || null,
    height: prior.height || null,
    category: prior.category || inferCategory(relative),
    language: prior.language || 'neutral',
    alt: prior.alt || '',
    caption: prior.caption || '',
    credit: prior.credit || 'GNK ASG',
    source: prior.source || 'internal-library',
    generatedAt: prior.generatedAt || null,
    archivedAt: prior.archivedAt || null,
    status: prior.status || 'available',
    usedBy: Array.isArray(prior.usedBy) ? prior.usedBy : [],
    usageCount: Number(prior.usageCount || 0),
    firstUsedAt: prior.firstUsedAt || null,
    lastUsedAt: prior.lastUsedAt || null,
    notes: prior.notes || ''
  });
}

images.sort((a, b) => a.path.localeCompare(b.path));
const duplicateHashGroups = groupDuplicates(images, 'sha256');
const duplicateFilenameGroups = groupDuplicates(images, 'filename');
const usedImages = images.filter(item => item.usageCount > 0 || item.usedBy.length > 0);
const availableImages = images.filter(item => item.status === 'available' && item.usageCount === 0 && item.usedBy.length === 0);

const registry = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  portalRoot: slash(path.relative(repoRoot, portalRoot)),
  policy: {
    reuseAllowed: false,
    requireAlt: true,
    requireCaption: true,
    requireCredit: true,
    archiveAfterUse: true,
    preferredFormats: ['webp', 'avif', 'jpg', 'png']
  },
  summary: {
    total: images.length,
    available: availableImages.length,
    used: usedImages.length,
    duplicateHashGroups: duplicateHashGroups.length,
    duplicateFilenameGroups: duplicateFilenameGroups.length,
    missingAlt: images.filter(item => !item.alt).length,
    missingCaption: images.filter(item => !item.caption).length,
    missingCredit: images.filter(item => !item.credit).length
  },
  duplicateHashGroups,
  duplicateFilenameGroups,
  images
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2), 'utf8');
console.log(JSON.stringify(registry.summary, null, 2));

function walk(root) {
  const output = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'reports') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) output.push(path.resolve(full));
    }
  }

  return output;
}

function readPrevious(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { images: [] };
  }
}

function inferCategory(relative) {
  const value = relative.toLowerCase();
  if (value.includes('ai') || value.includes('tech')) return 'ai-technology';
  if (value.includes('market') || value.includes('finance')) return 'markets-finance';
  if (value.includes('sport') || value.includes('stadium')) return 'sport-economy';
  if (value.includes('corporate') || value.includes('office')) return 'corporate';
  if (value.includes('news') || value.includes('article')) return 'editorial';
  if (value.includes('logo') || value.includes('brand')) return 'brand';
  return 'general';
}

function groupDuplicates(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item.path);
  }

  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([value, paths]) => ({ [key]: value, paths }))
    .sort((a, b) => b.paths.length - a.paths.length);
}

function slash(value) {
  return String(value || '').replaceAll('\\', '/');
}
