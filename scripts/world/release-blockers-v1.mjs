#!/usr/bin/env node
// Read-only inventory, not a deployment gate or authorization to publish.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function countryBlockers(registry, sourceRegistry) {
  if (!Array.isArray(registry?.countries) || !sourceRegistry?.countries || typeof sourceRegistry.countries !== 'object') throw new TypeError('Neispravan registar');
  return registry.countries.filter(c => c.status === 'planned').map(c => {
    const record = sourceRegistry.countries[c.cca2];
    const sources = Array.isArray(record?.sources) ? record.sources : [];
    const blockers = [];
    if (!sources.length) blockers.push('nema evidentiranih izvora');
    else if (!sources.some(s => s?.status === 'approved')) blockers.push('nema odobrenog izvora');
    // Registri trenutačno nemaju dokaze uredništva, infrastrukture ni testova
    // za pojedinačno izdanje. Ovaj izvještaj ih ne pokušava zaključiti.
    blockers.push('treba dokaz prava po izvoru i slici', 'treba potvrditi urednika i provjeru sadržaja',
      'treba potvrditi produkcijski projekt, kapacitet i URL', 'treba proći testove, odobrenje objave i provjeru uživo');
    return { id: c.id, country: c.country, code: c.cca2, wave: c.wave,
      plannedUrl: c.url, sources: sources.length,
      approvedSources: sources.filter(s => s?.status === 'approved').length,
      blockers };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const rows = countryBlockers(read('config/world-countries-v1.json'), read('config/world-sources-v1.json'));
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !/^--country=[A-Z]{2}$/.test(args[0]))) {
    console.error('Uporaba: node scripts/world/release-blockers-v1.mjs [--country=HR]'); process.exit(2);
  }
  const selected = args.length ? rows.filter(r => r.code === args[0].slice(10)) : rows;
  if (args.length && !selected.length) { console.error('Nema planirane države s tom oznakom.'); process.exit(2); }
  console.log(JSON.stringify({plannedCountries: rows.length, selected,
    note:'Pregled poznatih prepreka; planirane adrese nisu dokaz deploya. Nije odobrenje za objavu.'}, null, 2));
}
