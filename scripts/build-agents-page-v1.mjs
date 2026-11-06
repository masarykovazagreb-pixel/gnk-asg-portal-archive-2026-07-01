#!/usr/bin/env node
/**
 * JAVNA PLOČA AGENATA — `/agenti/`.
 *
 * Zahtjev: svaki web ima najmanje jednog agenta koji radi i održava
 * automatizacije, i to mora biti vidljivo, a ne samo u JSON-u. Ploča čita
 * registar (`ops/network-agents-v1.json`) i posljednje mjerenje
 * (`apps/portal/data/agents-status-v1.json`) i piše stranicu koja se ne
 * dovršava (neregistrirani agent se ne može pojaviti).
 *
 * Pokretanje: node scripts/build-agents-page-v1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';
import { impressumBlock } from '../apps/shared/impressum-v1.mjs';
import { authorBand } from '../apps/shared/author-band-v1.mjs';
import { entityGraph } from './lib/entity-graph-v1.mjs';
import { renderFactoryCenter } from './factory/factory-center-v1.mjs';
import { renderWorldDirectory } from './factory/world-directory-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'portal', 'agenti');

/* Ikona kuće u vlastitoj mapi `assets/`: brand-audit traži `/assets/favicon.svg`
   u najbližoj mapi `assets/` uz stranicu. */
const ICON = join(ROOT, 'apps', 'portal', 'assets', 'favicon.svg');
const ensureIcon = (dir) => {
  const assets = join(dir, 'assets');
  mkdirSync(assets, { recursive: true });
  const target = join(assets, 'favicon.svg');
  if (!existsSync(target) && existsSync(ICON)) copyFileSync(ICON, target);
};
const PUBLIC = 'https://gnk-asg.hr';

const registry = JSON.parse(readFileSync(join(ROOT, 'ops', 'network-agents-v1.json'), 'utf8'));
const statusFile = join(ROOT, 'apps', 'portal', 'data', 'agents-status-v1.json');
const status = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, 'utf8')) : { results: [], healthy: 0, webs: 0 };

const factoryConfig = JSON.parse(readFileSync(join(ROOT, 'config', 'factory-agents-v1.json'), 'utf8'));
const factoryBoard = JSON.parse(readFileSync(join(ROOT, 'artifacts', 'factory', 'orchestration-board.json'), 'utf8'));
const worldRegistry = JSON.parse(readFileSync(join(ROOT, 'config', 'world-countries-v1.json'), 'utf8'));
const factoryCenter = renderFactoryCenter(factoryConfig, factoryBoard, worldRegistry);
const worldSources = JSON.parse(readFileSync(join(ROOT, 'config', 'world-sources-v1.json'), 'utf8'));
const channelRegistry = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8'));
const worldDirectory = renderWorldDirectory(worldRegistry, worldSources, channelRegistry);

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Svaki agent nosi web na koji se odnosi; `required=false` je savjetodavan. */
const agents = registry.agents || [];
const byWeb = new Map();
for (const agent of agents) {
  const key = agent.web && /^https?:/.test(agent.web) ? agent.web.replace(/^https?:\/\//, '').split('/')[0] : (agent.web || 'mreža');
  if (!byWeb.has(key)) byWeb.set(key, []);
  byWeb.get(key).push(agent);
}

const webRows = (status.results || []).map((row) => `<tr>
      <td><b>${esc(row.id)}</b></td>
      <td>${esc(row.label || '')}</td>
      <td class="num">${row.pages}</td>
      <td class="num">${row.refresh}%</td>
      <td class="num">${row.impressum}%</td>
      <td class="num">${row.icon}%</td>
      <td>${row.ok ? '✔' : '✖'}</td>
    </tr>`).join('\n');

const agentRows = agents.map((agent) => `<tr>
      <td><code>${esc(agent.id)}</code></td>
      <td>${esc(agent.name || '')}</td>
      <td>${agent.web ? `<a href="${esc(agent.web)}" rel="external noopener">${esc(agent.web.replace(/^https?:\/\//, ''))}</a>` : '—'}</td>
      <td>${agent.required === false ? 'savjet' : 'obavezan'}</td>
      <td>${esc((agent.cmd || []).join(' '))}</td>
      <td>${esc(agent.checks || '')}</td>
    </tr>`).join('\n');

const facts = [
  ['GNK ASG d.o.o.', 'nositelj'],
  ['GNK DINAMO Ltd, SAD', 'osnivač'],
  ['AKTUAL MEDIA d.o.o.', 'izdavač'],
  ['Nermin Sefić', 'direktor i glavni urednik'],
  ['info@gnk-asg.hr', 'kontakt']
].map(([v, k]) => `<li><b>${k}:</b> ${v}</li>`).join('');

const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    ...entityGraph({ compact: false })['@graph'],
    {
      '@type': 'WebSite',
      '@id': `${PUBLIC}/#website`,
      url: `${PUBLIC}/`,
      name: 'GNK ASG',
      alternateName: ['AKTUAL MEDIA', 'AKTUAL MEDIA d.o.o.'],
      inLanguage: ['hr', 'en'],
      publisher: { '@id': `${PUBLIC}/#gnk-asg` }
    },
    {
      '@type': 'WebPage',
      '@id': `${PUBLIC}/agenti/`,
      url: `${PUBLIC}/agenti/`,
      name: 'Agenti mreže — AKTUAL MEDIA',
      description: 'Popis agenata koji održavaju sedam webova AKTUAL MEDIA mreže, s mjerenjem standarda po webu.',
      isPartOf: { '@id': `${PUBLIC}/#website` },
      inLanguage: 'hr',
      publisher: { '@id': `${PUBLIC}/#gnk-asg` }
    }
  ]
};

const html = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agenti mreže — ${agents.length} agenata na ${status.webs || 7} webova | AKTUAL MEDIA</title>
<meta name="description" content="Javni popis agenata AKTUAL MEDIA mreže: ${agents.length} agenata održava ${status.webs || 7} webova. Mjerenje standarda pokazuje osvježavanje, impressum i ikonu na svakoj stranici.">
<link rel="canonical" href="${PUBLIC}/agenti/">
<meta property="og:type" content="website">
<meta property="og:title" content="Agenti mreže — AKTUAL MEDIA">
<meta property="og:description" content="${agents.length} agenata na ${status.webs || 7} webova: mjerenje standarda po webu.">
<meta property="og:url" content="${PUBLIC}/agenti/">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta name="twitter:card" content="summary">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="Nermin Sefić">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css?v=20261024" data-am-design="v1">
<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025">
<link rel="alternate" hreflang="hr" href="${PUBLIC}/agenti/">
<link rel="alternate" hreflang="x-default" href="${PUBLIC}/agenti/">
<style>
.ag-wrap{max-width:1120px;margin:0 auto;padding:28px 20px 8px;font:400 15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.ag-wrap h1{font:800 clamp(26px,4vw,38px)/1.15 Georgia,serif;margin:0 0 10px}
.ag-lead{opacity:.8;max-width:78ch;margin:0 0 18px}
.ag-wrap table{width:100%;border-collapse:collapse;margin:10px 0 26px;font-size:13px}
.ag-wrap th,.ag-wrap td{padding:8px 10px;border-bottom:1px solid rgba(128,128,128,.22);text-align:left;vertical-align:top}
.ag-wrap th{font:800 10px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.66}
.ag-wrap td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.ag-wrap code{font:600 12px/1 ui-monospace,monospace}
.ag-facts{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.ag-h2{font:800 18px/1.2 Georgia,serif;margin:26px 0 8px}
</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<main class="ag-wrap" id="sadrzaj">
  <h1>Agenti mreže</h1>
  <p class="ag-lead">${agents.length} agenata održava ${status.webs || 7} webova AKTUAL MEDIA mreže. Ploča se ne uređuje ručno: nastaje iz registra agenata i iz mjerenja koje svaki agent sam pokreće. Ako mjerenje padne, padne i zapis — nema „zelenog" statusa bez dokaza.</p>
  <ul class="ag-facts">${facts}</ul>
  ${factoryCenter}
  ${worldDirectory}

  <h2 class="ag-h2">Mjerenje po webu</h2>
  <table>
    <thead><tr><th>Web</th><th>Ime</th><th>Stranica</th><th>Osvježavanje</th><th>Impressum</th><th>Ikona</th><th>Standard</th></tr></thead>
    <tbody>
${webRows}
    </tbody>
  </table>

  <h2 class="ag-h2">Registar agenata</h2>
  <table>
    <thead><tr><th>ID</th><th>Ime</th><th>Web</th><th>Vrsta</th><th>Naredba</th><th>Što provjerava</th></tr></thead>
    <tbody>
${agentRows}
    </tbody>
  </table>
</main>
${authorBand('hr', null, { portrait: '/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp' })}
${impressumBlock('hr')}
${refreshTag('/')}
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
ensureIcon(OUT);
writeFileSync(join(OUT, 'index.html'), html);
console.log(JSON.stringify({
  version: 'AKTUAL_MEDIA_AGENTS_PAGE_V1',
  agents: agents.length,
  webs: status.webs || 7,
  healthy: status.healthy || 0,
  out: 'apps/portal/agenti/index.html',
  ok: true
}, null, 2));
