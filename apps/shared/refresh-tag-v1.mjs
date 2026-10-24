/**
 * Osvježavanje — jedan natpis za sve generatore.
 *
 * Zašto modul: svaki generator mora sam upisati `<script>` u svoj izlaz, inače
 * se izlaz mijenja nakon gradnje (sloj dodaje skriptu) i test svježine padne
 * na svakoj stranici. Zato tag nastaje u generatoru, a sloj
 * `scripts/apply-refresh-v1.mjs` pokriva samo rukom pisane stranice portala.
 *
 * Datum dolazi iz podataka (`apps/portal/data/network-counts-v1.json`), nikad
 * iz sata — inače dvije gradnje ne bi dale iste bajtove.
 */
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let cached = null;
const dataDay = () => {
  if (cached !== null) return cached;
  try {
    const counts = JSON.parse(readFileSync(join(ROOT, 'apps', 'portal', 'data', 'network-counts-v1.json'), 'utf8'));
    cached = counts.dataDay || counts.generatedAt || '';
  } catch {
    cached = '';
  }
  return cached;
};

/**
 * Natpis modula. `prefix` je put do korijena weba ('/' za vlastitu domenu,
 * '../' za stranicu u podmapi).
 */
export function refreshTag(prefix = '/') {
  const day = dataDay();
  if (!day) return '';
  return `<script src="${prefix}assets/am-refresh-v1.js?v=${day}" data-am-netday="${day}" defer></script>`;
}

/** Kanonska datoteka modula — jedan izvor za svih šest webova. */
export const REFRESH_MODULE = join(ROOT, 'apps', 'portal', 'assets', 'am-refresh-v1.js');

/**
 * Kopira modul u izlaz weba (`<outRoot>/assets/am-refresh-v1.js`).
 *
 * Natpis u HTML-u nema smisla ako datoteka na tom webu ne postoji — tada
 * preglednik traži 404 na svakoj stranici. Zato svaki generator koji ubacuje
 * `refreshTag()` mora pozvati i ovu funkciju.
 */
export function ensureRefreshModule(outRoot) {
  if (!existsSync(REFRESH_MODULE)) return false;
  const dir = join(outRoot, 'assets');
  mkdirSync(dir, { recursive: true });
  copyFileSync(REFRESH_MODULE, join(dir, 'am-refresh-v1.js'));
  return true;
}
