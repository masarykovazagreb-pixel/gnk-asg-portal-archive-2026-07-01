#!/usr/bin/env node
// Sinkronizira samo dvije označene cjeline. Ne dira slojeve ni druge stranice.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFactoryCenter } from './factory-center-v1.mjs';
import { renderWorldDirectory } from './world-directory-v1.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function replaceSection(html, name, section) {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a || html.indexOf(start, a + start.length) !== -1 || html.indexOf(end, b + end.length) !== -1 || !section.startsWith(start) || !section.endsWith(end)) {
    throw new Error(`${name}: nedostaju, ponavljaju se ili su neispravne oznake`);
  }
  return html.slice(0, a) + section + html.slice(b + end.length);
}
export function updateSections(html, center, directory) {
  return replaceSection(replaceSection(html, 'factory-center-v1', center), 'world-directory-v1', directory);
}
function main() {
  const args = process.argv.slice(2);
  if (args.some(x => x !== '--check') || args.length > 1) throw new Error('Upotreba: node scripts/factory/sync-factory-view-v1.mjs [--check]');
  const read = path => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
  const config = read('config/factory-agents-v1.json'), board = read('artifacts/factory/orchestration-board.json');
  const countries = read('config/world-countries-v1.json'), sources = read('config/world-sources-v1.json');
  const channels = read('apps/region/channels.json');
  const file = join(ROOT, 'apps/portal/agenti/index.html'), original = readFileSync(file, 'utf8');
  const next = updateSections(original, renderFactoryCenter(config, board, countries), renderWorldDirectory(countries, sources, channels));
  if (args.includes('--check')) {
    if (next !== original) { console.error('Prikaz tvornice nije sinkroniziran.'); process.exitCode = 1; }
    else console.log('Prikaz tvornice je sinkroniziran.');
  } else if (next !== original) { writeFileSync(file, next); console.log('Osvježene su samo označene cjeline.'); }
  else console.log('Prikaz tvornice već je sinkroniziran.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
