// GNK ASG — čitanje stvarnih cron rasporeda iz workflow datoteka.
// Jedan izvor istine za sve generatore (grupacije, flota, izvještaji).
import { readdirSync, readFileSync } from 'node:fs';

const CRON_LINE = /^\s*-\s*cron:\s*['"]?([^'"\r\n#]+?)['"]?\s*(?:#.*)?$/;

export function cronLinesOf(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    // Komentari i citirani primjeri u dokumentaciji nisu raspored.
    if (/^\s*#/.test(line)) continue;
    const m = line.match(CRON_LINE);
    if (m) out.push(m[1].trim());
  }
  return out;
}

function slots(field, size) {
  if (!field || field === '*') return size;
  let total = 0;
  for (const part of field.split(',')) {
    const step = part.match(/^\*\/(\d+)$/);
    if (step) {
      total += Math.max(1, Math.floor(size / Number(step[1])));
      continue;
    }
    const rangeStep = part.match(/^(\d+)-(\d+)\/(\d+)$/);
    if (rangeStep) {
      total += Math.max(1, Math.floor((Number(rangeStep[2]) - Number(rangeStep[1]) + 1) / Number(rangeStep[3])));
      continue;
    }
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      total += Math.max(1, Number(range[2]) - Number(range[1]) + 1);
      continue;
    }
    if (/^\d+$/.test(part)) total += 1;
  }
  return total;
}

// Procjena pokretanja dnevno iz minute i sata. Dan/mjesec se ne modeliraju,
// pa je broj gornja granica za rasporede vezane na dan u tjednu.
export function runsPerDay(cron) {
  const fields = String(cron).trim().split(/\s+/);
  if (fields.length < 5) return 0;
  const [min, hour] = fields;
  if (fields[2] !== '*' || fields[3] !== '*') return 0;
  return slots(min, 60) * slots(hour, 24);
}

export function readWorkflowCrons(dir) {
  const map = new Map();
  for (const file of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    map.set(file, cronLinesOf(readFileSync(`${dir}/${file}`, 'utf8')));
  }
  return map;
}

export function scheduleOf(map, file) {
  const crons = map.get(file) || [];
  return { crons, perDay: crons.reduce((n, c) => n + runsPerDay(c), 0) };
}
