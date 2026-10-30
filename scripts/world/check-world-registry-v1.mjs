#!/usr/bin/env node
// Provjera registra država (config/world-countries-v1.json). Samo čita.
// Pada ako: broj država nije 195, ID-jevi nisu jedinstveni, planirana država nema val,
// postojeći live kanal nije mapiran na svoj projekt, ili URL ne prati obrazac.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'world-countries-v1.json'), 'utf8'));
const channels = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const failures = [];
const rows = reg.countries;

if (rows.length !== 195) failures.push(`broj država ${rows.length} (očekivano 195)`);
const ids = new Set();
for (const r of rows) {
  if (ids.has(r.id)) failures.push(`duplikat id ${r.id}`);
  ids.add(r.id);
  if (r.status === 'planned' && !r.wave) failures.push(`${r.id}: planirana bez vala`);
  if (r.status === 'live' && !r.channelId) failures.push(`${r.id}: live bez kanala`);
  if (r.project !== `gnk-asg-kanal-${r.id}`) failures.push(`${r.id}: projekt ne prati id`);
  if (r.url !== `https://gnk-asg-kanal-${r.id}.pages.dev/`) failures.push(`${r.id}: URL ne prati obrazac`);
}
const chIds = new Set(channels.map((c) => c.id));
for (const c of channels) {
  const r = rows.find((x) => x.channelId === c.id);
  if (!r) failures.push(`kanal ${c.id} nije mapiran u registru`);
}
const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log(JSON.stringify({ countries: rows.length, byStatus, channelsMapped: channels.length - failures.filter((f) => f.includes('nije mapiran')).length }));
for (const f of failures) console.log('FAIL', f);
process.exit(failures.length ? 1 : 0);
