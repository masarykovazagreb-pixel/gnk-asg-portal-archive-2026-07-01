import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['apps/portal', 'docs'];
const banned = [
  /PREVARA/i,
  /\bFRAUD\b/i
];
const allowedFiles = new Set([
  'docs/security/PREVARA_INCIDENT_REVIEW_20260708.md',
  'scripts/guard-public-content.mjs'
]);

const hits = [];

function walk(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
      walk(path);
      continue;
    }
    if (!/\.(html|md|json|js|mjs|ts|tsx|css)$/i.test(path)) continue;
    const normalized = path.replace(/\\/g, '/');
    if (allowedFiles.has(normalized)) continue;
    const text = readFileSync(path, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(text)) {
        hits.push(`${normalized}: banned public-content term ${pattern}`);
      }
    }
  }
}

for (const root of roots) walk(root);

if (hits.length) {
  console.error('Public content guard failed:');
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('Public content guard passed.');
