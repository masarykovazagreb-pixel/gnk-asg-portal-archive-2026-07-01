#!/usr/bin/env node
/**
 * JEDAN BROJ ARHIVE — za sve stranice koje ga citiraju.
 *
 * "3.360 tekstova" se dosad prepisivalo u četiri generatora. Kad je arhiva
 * narasla na 3.773, broj je ostao star na naslovnici, u proizvodima, u
 * llms.txt i u sitemapu slika. Ovaj modul čita stvarni broj iz arhive i
 * vraća ga već formatiranog, pa se tekst ne može razići s podacima.
 *
 * Redoslijed izvora:
 *   1. apps/arhiva/site/data/arhiva.json  (count koji je arhiva upravo izračunala)
 *   2. zbroj zapisa u apps/region/data/<kanal>.json
 *   3. 0 — pozivatelj tada mora izbjeći tvrdnju o broju
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function archiveCount(root = ROOT) {
  const file = join(root, 'apps', 'arhiva', 'site', 'data', 'arhiva.json');
  if (existsSync(file)) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      if (Number.isFinite(data.count) && data.count > 0) return data.count;
    } catch { /* padne li arhiva, ide se na zbroj izdanja */ }
  }
  const dir = join(root, 'apps', 'region', 'data');
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    try {
      const data = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      total += (data.items || []).length;
    } catch { /* jedan neispravan zapis ne ruši zbroj */ }
  }
  return total;
}

/** Hrvatski zapis tisućica: 3773 → "3.773". */
export const hrCount = (n) => Number(n).toLocaleString('hr-HR');

/** Engleski zapis tisućica: 3773 → "3,773". */
export const enCount = (n) => Number(n).toLocaleString('en-US');
