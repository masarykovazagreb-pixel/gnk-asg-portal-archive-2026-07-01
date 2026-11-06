#!/usr/bin/env node
// Čisto provjerava podatkovni ugovor; status registra nije dokaz deploya uživo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function validateWorldRegistry(reg, channels, expectedCount = 195) {
  const failures = [];
  if (!Array.isArray(reg?.countries) || !Array.isArray(channels)) return ['nedostaje popis država ili kanala'];
  const rows = reg.countries;
  if (rows.length !== expectedCount) failures.push(`broj država ${rows.length} (očekivano ${expectedCount})`);
  const unique = (value, seen, label) => {
    if (seen.has(value)) failures.push(`duplikat ${label} ${value}`);
    seen.add(value);
  };
  const ids = new Set(), codes2 = new Set(), codes3 = new Set(), mapped = new Set();
  const channelById = new Map();
  for (const c of channels) {
    if (!c || typeof c.id !== 'string' || !c.id) { failures.push('kanal bez ID-a'); continue; }
    if (channelById.has(c.id)) failures.push(`duplikat kanala ${c.id}`);
    channelById.set(c.id, c);
  }
  for (const r of rows) {
    if (!r || typeof r !== 'object') { failures.push('neispravan zapis države'); continue; }
    if (typeof r.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id)) failures.push(`neispravan id ${r.id}`);
    unique(r.id, ids, 'id');
    for (const [value, seen, label, pattern] of [[r.cca2,codes2,'cca2',/^[A-Z]{2}$/],[r.cca3,codes3,'cca3',/^[A-Z]{3}$/]]) {
      if (typeof value !== 'string' || !pattern.test(value)) failures.push(`${r.id}: neispravan ${label}`);
      else unique(value, seen, label);
    }
    if (!['planned', 'preparing', 'live'].includes(r.status)) failures.push(`${r.id}: nepoznat status`);
    if (r.status === 'planned' && !r.wave) failures.push(`${r.id}: planirana bez vala`);
    if (r.status === 'planned' && (r.channelId || r.liveUrl)) failures.push(`${r.id}: planirana s postojećim kanalom ili live adresom`);
    if (['live', 'preparing'].includes(r.status) && !r.channelId) failures.push(`${r.id}: ${r.status} bez kanala`);
    if (r.project !== `gnk-asg-kanal-${r.id}`) failures.push(`${r.id}: projekt ne prati id`);
    if (r.url !== `https://gnk-asg-kanal-${r.id}.pages.dev/`) failures.push(`${r.id}: URL ne prati obrazac`);
    if (r.channelId) {
      unique(r.channelId, mapped, 'mapiranje kanala');
      const c = channelById.get(r.channelId);
      if (!c) failures.push(`${r.id}: nepoznat kanal ${r.channelId}`);
      else {
        if (c.countryCode !== r.cca2) failures.push(`${r.id}: država kanala ne odgovara`);
        if (c.base !== r.liveUrl) failures.push(`${r.id}: adresa kanala ne odgovara`);
      }
    }
  }
  for (const c of channels) if (c?.id && !mapped.has(c.id)) failures.push(`kanal ${c.id} nije mapiran u registru`);
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'world-countries-v1.json'), 'utf8'));
  const channels = JSON.parse(fs.readFileSync(path.join(root, 'apps', 'region', 'channels.json'), 'utf8')).channels;
  const failures = validateWorldRegistry(reg, channels);
  const byStatus = {};
  for (const row of reg.countries) byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  console.log(JSON.stringify({countries: reg.countries.length, byStatus, channelsMapped: channels.filter(c => reg.countries.some(r => r.channelId === c.id)).length}));
  for (const failure of failures) console.log('FAIL', failure);
  process.exitCode = failures.length ? 1 : 0;
}
