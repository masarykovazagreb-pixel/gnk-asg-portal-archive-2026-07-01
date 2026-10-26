#!/usr/bin/env node
/**
 * CRON BEZ KOLIZIJA.
 *
 * Push na istu granu u istu minutu ne ruši build — ruši ga tiho: drugi posao
 * dobije "non-fast-forward", pa njegov sadržaj ostane neobjavljen do sljedećeg
 * ciklusa. Tako je 20. 10. izdanje zaglavilo na 19. 10.
 *
 * Test raširi svaki cron u skup (dan, sat, minuta) za tjedan dana i traži da
 * dva posla koja pišu u iste putanje nikada ne padnu u istu minutu.
 * Poslovi koji pišu u različita stabla smiju se poklopiti — to je samo
 * upozorenje, ne pad.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, '.github/workflows');

const parseField = (field, lo, hi) => {
  const values = new Set();
  for (const part of String(field).split(',')) {
    let range = part;
    let step = 1;
    if (part.includes('/')) { const [r, s] = part.split('/'); range = r; step = Number(s); }
    let list;
    if (range === '*') list = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    else if (range.includes('-')) { const [a, b] = range.split('-').map(Number); list = []; for (let v = a; v <= b; v += 1) list.push(v); }
    else list = [Number(range)];
    for (const value of list) if ((value - lo) % step === 0) values.add(value);
  }
  return values;
};

const expand = (cron) => {
  const [min, hour, , , dow] = cron.trim().split(/\s+/);
  const minutes = parseField(min, 0, 59);
  const hours = parseField(hour, 0, 23);
  const days = parseField(dow === '*' ? '0-6' : dow, 0, 6);
  const slots = new Set();
  for (const d of days) for (const h of hours) for (const m of minutes) slots.add(`${d} ${h}:${m}`);
  return slots;
};

const jobs = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.yml')).sort()) {
  const text = readFileSync(join(DIR, file), 'utf8');
  if (!/git push/.test(text)) continue;
  if (!/^\s+schedule:/m.test(text)) continue;
  const crons = [...text.matchAll(/cron:\s*['"]?([^'"\n#]+)['"]?/g)].map((m) => m[1].trim());
  const adds = [...text.matchAll(/git add[^\n]*/g)].map((m) => m[0]);
  const slots = new Set();
  for (const cron of crons) for (const slot of expand(cron)) slots.add(slot);
  jobs.push({ file, crons, adds, slots });
}

const overlapsPaths = (a, b) => {
  const all = [...a.adds, ...b.adds].join(' ');
  if (/-A\s|--all/.test(all)) return true;
  const broad = (list) => list.some((line) => /git add\s+(-A\s+)?apps\/portal(\s|$)/.test(line));
  if (broad(a.adds) || broad(b.adds)) return true;
  const paths = (list) => list.flatMap((line) => line.replace(/^git add\s+/, '').split(/\s+/)).filter((p) => p && !p.startsWith('-') && !p.startsWith('2>'));
  const setB = new Set(paths(b.adds));
  return paths(a.adds).some((p) => setB.has(p) || [...setB].some((q) => q.startsWith(p.endsWith('/') ? p : `${p}/`) || p.startsWith(q.endsWith('/') ? q : `${q}/`)));
};

const fails = [];
const warnings = [];
for (let i = 0; i < jobs.length; i += 1) {
  for (let j = i + 1; j < jobs.length; j += 1) {
    const a = jobs[i];
    const b = jobs[j];
    const shared = [...a.slots].filter((slot) => b.slots.has(slot));
    if (!shared.length) continue;
    if (overlapsPaths(a, b)) fails.push(`${a.file} i ${b.file}: ista minuta (${shared[0]}) i isti putanje`);
    else warnings.push(`${a.file} ↔ ${b.file}: ista minuta (${shared[0]}), različita stabla`);
  }
}

const report = {
  version: 'AKTUAL_MEDIA_CRON_COLLISIONS_V1',
  scheduledWriters: jobs.length,
  failures: fails.length,
  warnings: warnings.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
