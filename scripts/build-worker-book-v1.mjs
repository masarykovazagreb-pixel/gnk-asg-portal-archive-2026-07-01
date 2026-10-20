#!/usr/bin/env node
/**
 * Knjiga radnika — javni registar modeliranih workera i automatizacija koje ih vrte.
 *
 * Ulazi su isključivo postojeći zapisi u repozitoriju:
 *   apps/portal/data/worker-live-reports.json   — broj modeliranih profila, domena, projekata
 *   apps/portal/data/workforce-evolution-log.json — zapis promjena modela
 *   .github/workflows/*.yml                      — stvarni rasporedi (cron)
 *
 * Ništa se ne izmišlja: ako zapis ne postoji, stranica to kaže. Workeri su modelirani
 * profili, ne zasebni procesi; automatizacije su GitHub Actions rasporedi.
 *
 *   node scripts/build-worker-book-v1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const OUT = join(PORTAL, 'digital-workforce', 'knjiga');
const BASE = 'https://gnk-asg.hr';
const readJSON = (p, f) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return f; } };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const live = readJSON(join(PORTAL, 'data', 'worker-live-reports.json'), null);
const evolution = readJSON(join(PORTAL, 'data', 'workforce-evolution-log.json'), null);

/* Stvarni rasporedi iz workflowa — ime, cron, i ljudski opis iz komentara/imenjaka. */
const WF_DIR = join(ROOT, '.github', 'workflows');
const NAMES = {
  'region-daily.yml': 'Regionalna izdanja — dnevni ciklus',
  'region-deploy.yml': 'Izdanja — objava na Cloudflare',
  'gnk-news-refresh-v2.yml': 'AKTUAL MEDIA — osvježavanje vijesti',
  'content-queue-publish.yml': 'Red objava — dnevno objavljivanje',
  'editorial-scheduled-publish.yml': 'Uredničke objave po rasporedu',
  'tjednik-daily.yml': 'Business Tjednik — dnevni ciklus',
  'workforce-bot-orchestrator.yml': 'Botovi radne snage — orkestrator',
  'workforce-supervisor-agent.yml': 'Nadzorni agent radne snage',
  'ops-automation-sla-watchdog.yml': 'Nadzor automatizacija (SLA)',
  'site-health-check-v1.mjs': 'Zdravlje stranice',
  'site-health-check-v1.yml': 'Zdravlje stranice',
  'gnk-seo-nightly-audit.yml': 'SEO noćni audit',
  'weather-refresh.yml': 'Vrijeme — osvježavanje',
  'market-pulse-refresh.yml': 'Puls tržišta',
  'macro-market-refresh.yml': 'Makro tržišta',
  'world-monitor-refresh.yml': 'Svijet — monitor',
  'image-health-scan.yml': 'Zdravlje slika',
  'refresh-gnkc-index.yml': 'GNKC indeks',
  'refresh-index-live-data.yml': 'Indeks — uživo podaci',
  'aeo-ai-visibility.yml': 'AEO / AI vidljivost',
  'entity-visibility-campaign-monitor.yml': 'Kampanja vidljivosti entiteta',
  'devto-mirror-publish.yml': 'Dev.to zrcalo',
  'sync-webshop-products.yml': 'Webshop — sinkronizacija',
  'generate-digital-workforce-newsroom-pages.yml': 'Newsroom radne snage',
  'objavi-15-dnevno.yml': 'Objava — dnevni ritam'
};

const toHuman = (cron) => {
  const m = cron.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
  if (!m) return cron;
  const [, min, hour, dom, mon, dow] = m;
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') return `svakih sat (minuta ${min})`;
  if (hour.startsWith('*/')) return `svakih ${hour.slice(2)} h (minuta ${min})`;
  if (hour.includes(',')) return `dnevno u ${hour.split(',').map((h) => `${h}:${String(min).padStart(2, '0')}`).join(', ')} UTC`;
  if (hour === '*') return `svaki sat u minuti ${min}`;
  return `dnevno u ${hour}:${String(min).padStart(2, '0')} UTC`;
};

const jobs = [];
for (const file of readdirSync(WF_DIR).filter((f) => f.endsWith('.yml'))) {
  const src = readFileSync(join(WF_DIR, file), 'utf8');
  for (const m of src.matchAll(/-\s*cron:\s*'([^']+)'/g)) {
    jobs.push({ file, name: NAMES[file] || file.replace(/\.yml$/, ''), cron: m[1], when: toHuman(m[1]) });
  }
}
jobs.sort((a, b) => a.name.localeCompare(b.name, 'hr'));

const totalJobs = jobs.length;
const modeled = live?.modeledWorkerProfiles;
const assignments = live?.modeledAssignments;
const projects = live?.modeledProjects;
const domains = live?.modeledDomains;
const supervisor = live?.supervisorAgent;
const updates = Array.isArray(evolution?.events) ? evolution.events.length : Array.isArray(evolution) ? evolution.length : null;

const stat = (label, value, note) => `<li class="kb-stat"><b>${esc(value ?? '—')}</b><span>${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ''}</li>`;

const rows = jobs.map((j) => `<tr><td><strong>${esc(j.name)}</strong><br><code>${esc(j.file)}</code></td><td>${esc(j.when)}</td><td><code>${esc(j.cron)}</code></td></tr>`).join('');

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Knjiga radnika — modelirani workeri i automatizacije',
  url: `${BASE}/digital-workforce/knjiga/`,
  inLanguage: 'hr',
  description: 'Registar modeliranih radnih profila i stvarnih rasporeda automatizacije koji ih pokreću.',
  isPartOf: { '@type': 'WebSite', url: `${BASE}/`, name: 'GNK ASG' },
  publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${BASE}/` },
  editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: `${BASE}/nermin-sefic/` },
  about: { '@type': 'Dataset', name: 'Modelirana digitalna radna snaga', description: 'Simulirani profili; nisu zasebni procesi ni stvarni zaposlenici.' }
};

const html = `<!doctype html>
<html lang="hr" class="gnk-unified-shell">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Knjiga radnika — modelirani workeri i automatizacije | GNK ASG</title>
<meta name="description" content="Registar modeliranih radnih profila i stvarnih rasporeda automatizacije: ${totalJobs} zakazanih poslova, ${esc(modeled ?? '—')} modeliranih profila i jasna granica između simulacije i stvarnog rada.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${BASE}/digital-workforce/knjiga/">
<meta name="author" content="GNK ASG d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="keywords" content="digitalna radna snaga, automatizacija, GitHub Actions, modelirani workeri, GNK ASG, AKTUAL MEDIA">
<meta property="og:type" content="article">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:title" content="Knjiga radnika — modelirani workeri i automatizacije">
<meta property="og:description" content="Što stvarno radi u pozadini: ${totalJobs} zakazanih automatizacija i ${esc(modeled ?? '—')} modeliranih radnih profila.">
<meta property="og:url" content="${BASE}/digital-workforce/knjiga/">
<meta property="og:image" content="${BASE}/assets/gnk-asg-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
*{box-sizing:border-box}
body{margin:0;background:#070f18;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:#e9c66c}
.kb-top{background:#04101d;border-bottom:1px solid #1b3550;padding:12px 0;font:700 10.5px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#8fa3ba}
.kb-wrap{max-width:1080px;margin:0 auto;padding:0 clamp(16px,4vw,32px)}
.kb-wrap.kb-top{max-width:none}
.kb-top .kb-wrap{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.kb-kick{display:inline-block;background:#e9c66c;color:#0b1622;font:800 9.5px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;padding:7px 10px;border-radius:999px;margin-top:28px}
h1{font:700 clamp(30px,4.6vw,50px)/1.04 Georgia,serif;letter-spacing:-.02em;margin:14px 0 10px}
.kb-lead{color:#a9b7c8;max-width:76ch;margin:0 0 8px}
.kb-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;list-style:none;margin:22px 0 8px;padding:0}
.kb-stat{background:#0b1d31;border:1px solid #1e3b58;border-radius:14px;padding:14px 16px;display:grid;gap:2px}
.kb-stat b{font:700 26px/1.1 Georgia,serif;color:#fff}
.kb-stat span{font:700 9.5px/1.3 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8fa3ba}
.kb-stat small{font-size:11.5px;color:#7d8fa4}
h2{font:700 22px/1.25 Georgia,serif;margin:34px 0 10px}
table{width:100%;border-collapse:collapse;font-size:13.5px;background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #16304a;vertical-align:top}
th{font:800 9.5px/1.3 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8fa3ba;background:#081726}
td code{font:600 11px/1.4 ui-monospace,Menlo,monospace;color:#9fb3c9}
tr:last-child td{border-bottom:0}
.kb-note{border-left:3px solid #e9c66c;background:rgba(233,198,108,.08);padding:12px 14px;color:#cbd6e3;font-size:14px;margin:18px 0}
.kb-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;list-style:none;padding:0;margin:14px 0 48px}
.kb-links a{display:grid;gap:2px;text-decoration:none;border:1px solid #1e3b58;border-radius:10px;padding:10px 12px;background:#08182a}
.kb-links a:hover{border-color:#e9c66c}
.kb-links b{font:700 12.5px/1.2 system-ui;color:#eef3f9}
.kb-links span{font:700 8.5px/1.2 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba}
@media(max-width:640px){table{font-size:12px}th:nth-child(3),td:nth-child(3){display:none}}
</style>
</head>
<body>
<div class="kb-top"><div class="kb-wrap"><span>GNK ASG · Knjiga radnika</span><span><a href="/digital-workforce/">← Digitalna radna snaga</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a></span></div></div>
<main class="kb-wrap">
<span class="kb-kick">Javni registar</span>
<h1>Knjiga radnika: što radi, kada i pod kojim imenom</h1>
<p class="kb-lead">Ova stranica je zapisnik, ne brošura. S jedne strane su modelirani radni profili iz javne simulacije, s druge stvarni rasporedi automatizacije koji ih pokreću. Worker nije zaposlenik i nije zaseban proces — to je profil u modelu; posao obavlja zakazani workflow, a rezultat se provjerava auditima.</p>

<ul class="kb-stats">
  ${stat('modeliranih profila', modeled, live?.semantics ? '' : 'izvor: worker-live-reports.json')}
  ${stat('modeliranih rasporeda', assignments, '')}
  ${stat('domena modela', domains, '')}
  ${stat('projekata u modelu', projects, '')}
  ${stat('zakazanih automatizacija', totalJobs, 'cron unosi u .github/workflows')}
</ul>
<p class="kb-note">${esc(live?.semantics || 'Modelirani profili nisu zasebni procesi.')} Nadzorni agent: <strong>${esc(supervisor || '—')}</strong>. Dokaz rada su zapisi workflowa i provjere zdravlja, ne broj profila.${updates != null ? ` Zapis promjena modela sadrži ${updates} unosa.` : ''}</p>

<h2>Automatizacije koje stvarno rade</h2>
<table>
<thead><tr><th>Posao</th><th>Kada</th><th>Cron</th></tr></thead>
<tbody>${rows || '<tr><td colspan="3">Nema zapisanih rasporeda.</td></tr>'}</tbody>
</table>
<p class="kb-lead" style="margin-top:12px;font-size:13.5px">Rasporedi su prepisani iz repozitorija u trenutku gradnje ove stranice. Vremena su u UTC-u; ljeti je Europe/Zagreb +2 h. Ako se raspored promijeni u workflowu, stranica se osvježava sljedećom gradnjom.</p>

<h2>Dalje</h2>
<ul class="kb-links">
  <li><a href="/digital-workforce/"><b>Digitalna radna snaga</b><span>simulacija</span></a></li>
  <li><a href="/digital-workforce/workers/"><b>Katalog workera</b><span>profili</span></a></li>
  <li><a href="/kanal/"><b>Svi kanali</b><span>8 izdanja</span></a></li>
  <li><a href="/izdanja/"><b>Sva izdanja i deskovi</b><span>9 deskova</span></a></li>
  <li><a href="/radio/"><b>AKTUAL MEDIA RADIO</b><span>player</span></a></li>
  <li><a href="/gnk-aktual/"><b>AKTUAL MEDIA</b><span>središte</span></a></li>
</ul>
</main>
<script src="/assets/public-unified-menu-v6.js?v=20261019-izdanja" defer></script>
<script src="/assets/public-contrast-hardening-v1.js?v=20261019-izdanja" defer></script>
<script src="/assets/aktual-radio-mini-v1.js?v=20261020-radio-mini" defer></script>
</body>
</html>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);
console.log(JSON.stringify({ ok: true, out: 'apps/portal/digital-workforce/knjiga/index.html', jobs: totalJobs, modeled }, null, 2));
