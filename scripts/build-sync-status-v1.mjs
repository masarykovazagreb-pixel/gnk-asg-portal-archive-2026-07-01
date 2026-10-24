#!/usr/bin/env node
/**
 * NADZORNA PLOČA SINKRONIZACIJE — stanje bez otvaranja Actionsa.
 *
 * Mreža ima 337 workflowa i 14 rasporeda koji pišu u git. Kad jedan stane,
 * nitko to ne vidi dok stranica ne počne zaostajati danima. Ova skripta
 * izvodi jedno javno, strojno čitljivo stanje:
 *
 *   apps/portal/status/sync.json   — za strojeve (i za watchdog)
 *   apps/portal/status/sinkronizacija/index.html — za ljude
 *
 * Sve što piše izvedeno je iz stvarnih datoteka: rasporedi iz workflowa,
 * svježina iz podataka izdanja i mreže, popis koraka iz `sync-all-v1`.
 * Nijedan broj se ne upisuje napamet.
 *
 *   node scripts/build-sync-status-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';
import { STEPS } from './sync-all-v1.mjs';
import { designTokensCss } from '../apps/shared/design-system-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const OUT_JSON = join(PORTAL, 'status', 'sync.json');
const OUT_PAGE = join(PORTAL, 'status', 'sinkronizacija', 'index.html');

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- 1. Rasporedi iz workflowa ---------- */
const workflowDir = join(ROOT, '.github', 'workflows');
const schedules = [];
for (const file of readdirSync(workflowDir).filter((f) => f.endsWith('.yml')).sort()) {
  const text = readFileSync(join(workflowDir, file), 'utf8');
  if (!/^\s+schedule:/m.test(text)) continue;
  const name = (text.match(/^name:\s*(.+)$/m) || [])[1] || file;
  const crons = [...text.matchAll(/cron:\s*['"]?([^'"\n#]+)['"]?/g)].map((m) => m[1].trim());
  const writes = /git push/.test(text);
  schedules.push({ file, name: name.trim(), crons, writes });
}

/* ---------- 2. Svježina po webu ---------- */
const channels = readJSON(join(ROOT, 'apps/region/channels.json'), { channels: [] }).channels || [];

const newestIn = (file) => {
  if (!existsSync(file)) return null;
  const stat = statSync(file);
  return stat.mtime.toISOString();
};

const webs = [];
for (const channel of channels) {
  const dir = join(PORTAL, 'kanal', channel.id);
  webs.push({
    id: channel.id,
    kind: 'izdanje',
    url: channel.base,
    newest: newestIn(join(dir, 'index.html')),
    pages: existsSync(dir) ? readdirSync(dir).length : 0
  });
}
for (const [id, dir] of [['arhiva', 'apps/arhiva/site'], ['dnevnik', 'apps/dnevnik/site'], ['kanal', 'apps/kanal/site'], ['tjednik', 'apps/tjednik/site']]) {
  webs.push({ id, kind: 'portal', url: '', newest: newestIn(join(ROOT, dir, 'index.html')), pages: existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).length : 0 });
}
for (const slug of readdirSync(join(ROOT, 'apps/sites/site'))) {
  const dir = join(ROOT, 'apps/sites/site', slug);
  if (!statSync(dir).isDirectory()) continue;
  webs.push({ id: slug, kind: 'web', url: '', newest: newestIn(join(dir, 'index.html')), pages: readdirSync(dir).length });
}
for (const id of readdirSync(join(ROOT, 'apps/world/site'))) {
  const dir = join(ROOT, 'apps/world/site', id);
  if (!statSync(dir).isDirectory()) continue;
  webs.push({ id, kind: 'svijet', url: '', newest: newestIn(join(dir, 'index.html')), pages: readdirSync(dir).length });
}

/* ---------- 3. Zapis ---------- */
const now = new Date();
const payload = {
  version: 'AKTUAL_MEDIA_SYNC_STATUS_V1',
  generatedFrom: 'datoteke u repozitoriju',
  steps: STEPS.map((s) => ({ id: s.id, group: s.group, file: s.file, why: s.why, slow: Boolean(s.slow), optional: Boolean(s.optional) })),
  schedules,
  webs: webs.sort((a, b) => a.id.localeCompare(b.id)),
  counts: {
    steps: STEPS.length,
    generators: STEPS.filter((s) => s.group === 'generate').length,
    layers: STEPS.filter((s) => s.group === 'layers').length,
    checks: STEPS.filter((s) => s.group === 'audit').length,
    schedules: schedules.length,
    writingSchedules: schedules.filter((s) => s.writes).length,
    webs: webs.length
  },
  generatedAt: now.toISOString()
};

if (CHECK) {
  const current = readJSON(OUT_JSON, null);
  const same = current && JSON.stringify({ ...current, generatedAt: null }) === JSON.stringify({ ...payload, generatedAt: null });
  console.log(JSON.stringify({ ok: Boolean(same), mode: 'check', version: payload.version, webs: webs.length, schedules: schedules.length }, null, 2));
  process.exit(same ? 0 : 1);
}

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);

/* ---------- 4. Stranica za ljude ---------- */
const rows = schedules.map((s) => `<tr><td><code>${esc(s.crons.join(' · '))}</code></td><td>${esc(s.name)}</td><td>${s.writes ? 'piše u git' : 'samo provjerava'}</td></tr>`).join('');
const webRows = payload.webs.map((w) => `<tr><td>${esc(w.id)}</td><td>${esc(w.kind)}</td><td>${w.pages}</td><td>${w.newest ? esc(w.newest.slice(0, 16).replace('T', ' ')) : '—'}</td></tr>`).join('');
const stepRows = payload.steps.map((s) => `<tr><td>${esc(s.group)}</td><td><code>${esc(s.id)}</code></td><td>${esc(s.why)}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sinkronizacija mreže — AKTUAL MEDIA</title>
<meta name="description" content="Stanje svih automatizacija mreže AKTUAL MEDIA: ${payload.counts.schedules} rasporeda, ${payload.counts.steps} koraka sinkronizacije i ${payload.counts.webs} webova, izvedeno iz datoteka repozitorija.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://gnk-asg.hr/status/sinkronizacija/">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      /* Portalski WebSite čvor ima jedno ime na svakoj stranici: "GNK ASG".
         Ime brenda (AKTUAL MEDIA) nosi Organization čvor, ne WebSite — inače
         tražilica dobije dva imena za istu domenu. */
      '@type': 'WebSite',
      '@id': 'https://gnk-asg.hr/#website',
      url: 'https://gnk-asg.hr/',
      name: 'GNK ASG',
      inLanguage: ['hr', 'en'],
      publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' }
    },
    {
      '@type': 'WebPage',
      '@id': 'https://gnk-asg.hr/status/sinkronizacija/#webpage',
      url: 'https://gnk-asg.hr/status/sinkronizacija/',
      name: 'Sinkronizacija mreže — AKTUAL MEDIA',
      isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
      inLanguage: 'hr'
    }
  ]
})}</script>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<style>
body{font:16px/1.6 Georgia,serif;max-width:960px;margin:0 auto;padding:24px;background:var(--amd-bg,#f7f5ef);color:var(--amd-ink,#1a1f27)}
h1{font-size:clamp(24px,4vw,38px);margin:0 0 8px}
h2{margin-top:36px;font-size:20px}
table{border-collapse:collapse;width:100%;font-size:14px;background:var(--amd-surface,#fff)}
th,td{border-bottom:1px solid var(--amd-line,#ddd);padding:6px 8px;text-align:left;vertical-align:top}
code{font:13px/1.4 ui-monospace,monospace}
p.lead{color:var(--amd-muted,#59606a)}
</style>
${designTokensCss()}
</head>
<body>
<a class="skip" href="#sadrzaj">Sadržaj</a>
<main id="sadrzaj">
<h1>Sinkronizacija mreže</h1>
<p class="lead">${payload.counts.schedules} rasporeda (${payload.counts.writingSchedules} piše u git), ${payload.counts.steps} koraka sinkronizacije (${payload.counts.generators} generatora, ${payload.counts.layers} sloja, ${payload.counts.checks} provjere) i ${payload.counts.webs} webova. Sve je izvedeno iz datoteka repozitorija, ne iz prethodnog izvještaja.</p>
<p class="lead">Strojni zapis: <a href="/status/sync.json">/status/sync.json</a>.</p>

<h2>Rasporedi</h2>
<table><thead><tr><th>Kada (UTC)</th><th>Posao</th><th>Piše?</th></tr></thead><tbody>${rows}</tbody></table>

<h2>Koraci sinkronizacije</h2>
<table><thead><tr><th>Skupina</th><th>Korak</th><th>Što radi</th></tr></thead><tbody>${stepRows}</tbody></table>

<h2>Webovi</h2>
<table><thead><tr><th>Web</th><th>Vrsta</th><th>Stavki u korijenu</th><th>Zadnja izmjena</th></tr></thead><tbody>${webRows}</tbody></table>

<p class="lead">Zapis sastavljen ${esc(now.toISOString().slice(0, 16).replace('T', ' '))} UTC.</p>
</main>
${refreshTag('/')}
</body>
</html>
`;

mkdirSync(dirname(OUT_PAGE), { recursive: true });
writeFileSync(OUT_PAGE, html);

console.log(JSON.stringify({ ok: true, version: payload.version, mode: 'write', webs: webs.length, schedules: schedules.length, steps: STEPS.length }, null, 2));
