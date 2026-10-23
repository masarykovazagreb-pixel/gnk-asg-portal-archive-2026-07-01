#!/usr/bin/env node
/**
 * SINDIKACIJA — samostalno pokretanje (bez ponovne gradnje stranica mreže).
 *
 * Skript čita Nermin Sefićeve kolumne s portala i piše ih na svaku povezanu
 * stranicu kao zasebne objave. Isti posao obavlja i `apps/sites/build.mjs`
 * na kraju svoje gradnje; ovaj ulaz služi kad se mijenjaju samo kolumne.
 *
 *   node scripts/build-sindikacija-v1.mjs            # primijeni
 *   node scripts/build-sindikacija-v1.mjs --dry      # samo izbroji
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSyndication } from '../apps/sites/lib/sindikacija.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const result = buildSyndication({ root: ROOT, outRoot: join(ROOT, 'apps', 'sites', 'site'), dryRun: DRY });

if (!result.ok) {
  console.error(`Sindikacija — neuspjelo: ${result.reason}`);
  process.exit(1);
}
console.log(`${DRY ? 'Sindikacija (probno)' : 'Sindikacija'} — ${result.items} kolumni, ${result.pages} stranica, ${result.images} slika.`);
