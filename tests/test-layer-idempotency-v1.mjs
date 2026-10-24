#!/usr/bin/env node
/**
 * SLOJ MORA BITI IDEMPOTENTAN.
 *
 * Sloj koji pri svakom pokretanju mijenja datoteku stvara dva problema:
 * 1. CI nikada nije na "nema promjena", pa svaki sat nastaje commit koji ne
 *    nosi ništa (i tako se gubi pravi signal);
 * 2. test svježine izlaza pada bez ijedne stvarne promjene.
 *
 * Test pušta svaki sloj dvaput i traži da drugo puštanje ne promijeni ni jedan
 * bajt. Uspoređuje se sažetak stabala koja slojevi diraju.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Redom kako ih zove `scripts/sync-all-v1.mjs`. */
const LAYERS = [
  { id: 'design-tokens', script: 'scripts/apply-design-tokens-v1.mjs' },
  { id: 'brand-mark', script: 'scripts/apply-brand-mark-v1.mjs' },
  { id: 'social-cards', script: 'scripts/apply-social-card-meta-v1.mjs' },
  { id: 'image-sitemap', script: 'scripts/prune-image-sitemap-v1.mjs' },
  { id: 'prenos-crosslinks', script: 'scripts/apply-prenos-crosslinks-v1.mjs' }
];

const TREES = ['apps/portal', 'apps/sites/site', 'apps/world/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/kanal/site'];

const walk = (dir, out = [], root = dir) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out, root);
    else out.push(relative(root, full));
  }
  return out;
};

/* Sažetak samo onoga što slojevi stvarno diraju: stranice i sitemapi. */
const digest = () => {
  const hash = createHash('sha256');
  for (const tree of TREES) {
    const files = walk(join(ROOT, tree))
      .filter((file) => file.endsWith('.html') || file.endsWith('sitemap.xml') || file.endsWith('.json') || file.endsWith('.css'))
      .sort();
    for (const file of files) {
      hash.update(`${tree}/${file}\n`);
      hash.update(readFileSync(join(ROOT, tree, file)));
    }
  }
  return hash.digest('hex');
};

const fails = [];
const results = [];

for (const layer of LAYERS) {
  const run = () => spawnSync(process.execPath, [join(ROOT, layer.script)], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

  run();
  const first = digest();
  const second = run();
  const again = digest();

  const ok = first === again && second.status === 0;
  results.push({ id: layer.id, ok });
  if (second.status !== 0) fails.push(`${layer.id}: drugo pokretanje palo (${second.status})`);
  else if (first !== again) fails.push(`${layer.id}: drugo pokretanje mijenja datoteke (${first.slice(0, 12)} → ${again.slice(0, 12)})`);
}

const report = {
  version: 'AKTUAL_MEDIA_LAYER_IDEMPOTENCY_V1',
  layers: results.length,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 10).join('\n'));
  process.exit(1);
}
