#!/usr/bin/env node
/**
 * NADZORNA PLOČA MORA GOVORITI ISTINU.
 *
 * Ploča koja se ne slaže sa stvarnim stanjem gora je od nikakve: pokaže zeleno
 * i nitko ne pogleda. Zato se ovdje ne provjerava "postoji li datoteka", nego
 * da se svaki broj na ploči može ponovno izvesti iz repozitorija — broj
 * rasporeda iz workflowa, broj koraka iz `sync-all-v1`, popis webova iz
 * direktorija.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS } from '../scripts/sync-all-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAYLOAD = join(ROOT, 'apps/portal/status/sync.json');
const PAGE = join(ROOT, 'apps/portal/status/sinkronizacija/index.html');

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

check(existsSync(PAYLOAD), 'nema /status/sync.json');
check(existsSync(PAGE), 'nema /status/sinkronizacija/');

let data = null;
if (existsSync(PAYLOAD)) {
  try { data = JSON.parse(readFileSync(PAYLOAD, 'utf8')); } catch (error) { fails.push(`sync.json se ne parsira: ${error.message}`); }
}

if (data) {
  /* Koraci: isti popis kao u sinkronizaciji, bez izostavljenih. */
  const ids = new Set(data.steps.map((step) => step.id));
  for (const step of STEPS) check(ids.has(step.id), `ploča ne poznaje korak ${step.id}`);
  check(data.steps.length === STEPS.length, `ploča ima ${data.steps.length} koraka, popis sinkronizacije ${STEPS.length}`);

  /* Rasporedi: moraju se poklopiti s brojem workflowa koji imaju `schedule`. */
  const dir = join(ROOT, '.github/workflows');
  const scheduled = readdirSync(dir).filter((f) => f.endsWith('.yml') && /^\s+schedule:/m.test(readFileSync(join(dir, f), 'utf8')));
  check(data.schedules.length === scheduled.length, `ploča ima ${data.schedules.length} rasporeda, u repozitoriju ih je ${scheduled.length}`);
  for (const schedule of data.schedules) {
    check(existsSync(join(dir, schedule.file)), `ploča navodi nepostojeći workflow ${schedule.file}`);
    check(schedule.crons.length > 0, `${schedule.file}: nema cron na ploči`);
  }

  /* Webovi: svaki direktorij izdanja, mreže, svijeta i portala mora biti na ploči. */
  const channelIds = JSON.parse(readFileSync(join(ROOT, 'apps/region/channels.json'), 'utf8')).channels.map((c) => c.id);
  const webIds = new Set(data.webs.map((w) => w.id));
  for (const id of channelIds) check(webIds.has(id), `ploča ne prikazuje izdanje ${id}`);
  check(data.webs.length >= 32, `ploča prikazuje ${data.webs.length} webova (očekivano najmanje 32)`);

  /* Zapis mora nositi vrijeme i verziju — inače se ne zna koliko je star. */
  check(Boolean(data.generatedAt), 'sync.json nema generatedAt');
  check(data.version === 'AKTUAL_MEDIA_SYNC_STATUS_V1', 'sync.json nema ispravnu verziju');
}

if (existsSync(PAGE)) {
  const html = readFileSync(PAGE, 'utf8');
  check(/\/status\/sync\.json/.test(html), 'stranica ne vodi na strojni zapis');
  check(/<link rel="canonical"/.test(html), 'stranica nema canonical');
  check(/data-am-design="v1"|id="am-design-v1"/.test(html), 'stranica nema dizajn sustav');
}

const report = {
  version: 'AKTUAL_MEDIA_SYNC_STATUS_GATE_V1',
  steps: data ? data.steps.length : 0,
  schedules: data ? data.schedules.length : 0,
  webs: data ? data.webs.length : 0,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 15).join('\n'));
  process.exit(1);
}
