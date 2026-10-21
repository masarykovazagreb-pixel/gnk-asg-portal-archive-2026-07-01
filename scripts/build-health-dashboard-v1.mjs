#!/usr/bin/env node
// GNK ASG — javna ploča zdravlja (/zdravlje/ i /en/zdravlje/).
//
// Čita SAMO datoteke iz repozitorija i iz njih računa stanje:
//   - svježinu svakog od osam gradskih kanala (iz feed.json),
//   - svježinu središnjeg feeda portala (news.json),
//   - stanje flote automatizacija (worker-groups.json + workflow-runs.json),
//   - popis automatizacija koje su posljednji put pale (s linkom na run).
//
// Ništa se ne izmišlja: svaki broj ima izvor u datoteci, a vrijeme računanja
// piše na stranici. Ako izvor nedostaje, stranica to kaže, ne popunjava prazninu.
//
// Pokretanje: node scripts/build-health-dashboard-v1.mjs [--check]
//   --check  samo provjeri da bi stranice nastale, bez pisanja.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = path.join(ROOT, 'apps/portal');
const CHECK_ONLY = process.argv.includes('--check');
const SITE = 'https://gnk-asg.hr';

const CITY_IDS = ['zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest'];
const FRESH_HOURS = 6;
const WARN_HOURS = 24;

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function ageHours(iso, now) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.round(((now - t) / 3600000) * 10) / 10;
}
function fmtDate(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'hr' ? 'hr-HR' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  }).format(d);
}
function stateFor(age) {
  if (age == null) return 'unknown';
  if (age <= FRESH_HOURS) return 'ok';
  if (age <= WARN_HOURS) return 'warn';
  return 'bad';
}

const now = Date.now();
const today = new Date(now).toISOString().slice(0, 10);

// ---- 1. Gradski kanali -------------------------------------------------
const izdanja = readJson(path.join(PORTAL, 'data/izdanja.json'), { cards: [] });
const cards = Array.isArray(izdanja.cards) ? izdanja.cards : [];
const channels = CITY_IDS.map((id) => {
  const card = cards.find((c) => c.id === id) || {};
  const feed = readJson(path.join(PORTAL, 'kanal', id, 'feed.json'), null);
  const items = Array.isArray(feed?.items) ? feed.items : [];
  const newest = items.map((i) => i.date_published || i.date_modified).filter(Boolean).sort().pop() || null;
  const age = newest ? ageHours(newest, now) : null;
  return {
    id,
    name: card.name || `AKTUAL MEDIA KANAL ${id.toUpperCase()}`,
    city: card.city || id,
    country: card.country || '',
    lang: card.lang || '',
    url: card.url || `${SITE}/kanal/${id}/`,
    items: items.length,
    newest,
    age,
    state: stateFor(age),
  };
});

// ---- 2. Središnji feed portala ----------------------------------------
const news = readJson(path.join(PORTAL, 'data/news.json'), []);
const newsItems = Array.isArray(news) ? news : [];
const newsNewest = newsItems.map((i) => i.published_at || i.publishedAt || i.date_published || i.date).filter(Boolean).sort().pop() || null;
const newsAge = newsNewest ? ageHours(newsNewest, now) : null;
const newsState = stateFor(newsAge);
const newsSources = new Set(newsItems.map((i) => i.source).filter(Boolean)).size;

// ---- 3. Flota automatizacija ------------------------------------------
const groups = readJson(path.join(PORTAL, 'data/worker-groups.json'), { groups: [], ungrouped: [] });
const runsFile = readJson(path.join(PORTAL, 'data/workflow-runs.json'), { runs: {} });
const runs = runsFile?.runs && !Array.isArray(runsFile.runs) ? runsFile.runs : {};
const runsCollectedAt = runsFile?.collectedAt || null;

const groupList = Array.isArray(groups.groups) ? groups.groups : [];
const totalAutomations = Number(groups.total) || groupList.reduce((n, g) => n + (g.automations || 0), 0) + (groups.ungrouped?.length || 0);
const scheduled = groupList.reduce((n, g) => n + (g.scheduled || 0), 0);
const runsPerDay = groupList.reduce((n, g) => n + (g.runsPerDay || 0), 0);

const failing = Object.entries(runs)
  .filter(([, r]) => /^(failure|timed_out|startup_failure)$/.test(String(r?.conclusion || '')))
  .map(([file, r]) => ({
    file: file.split('/').pop(),
    conclusion: r.conclusion,
    createdAt: r.createdAt || r.updatedAt || null,
    url: r.url || '',
  }))
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

const staleChannels = channels.filter((c) => c.state === 'bad').length;
const warnChannels = channels.filter((c) => c.state === 'warn').length;
const attention = staleChannels + warnChannels + failing.length + (newsState === 'ok' ? 0 : 1);
const overall = attention === 0 ? 'ok' : attention <= 6 ? 'warn' : 'bad';

const summary = {
  version: 'GNK_ASG_HEALTH_DASHBOARD_V1',
  generatedAt: new Date(now).toISOString(),
  date: today,
  overall,
  channels,
  news: { items: newsItems.length, sources: newsSources, newest: newsNewest, ageHours: newsAge, state: newsState },
  fleet: {
    totalAutomations, scheduled, runsPerDay,
    groups: groupList.length,
    ungrouped: Array.isArray(groups.ungrouped) ? groups.ungrouped.length : 0,
    runsCollectedAt,
    failing,
  },
};

// ---- 4. Stranice ------------------------------------------------------
const COPY = {
  hr: {
    lang: 'hr',
    title: 'Zdravlje sustava — svježina kanala i stanje automatizacija | GNK ASG',
    description: 'Javna ploča zdravlja GNK ASG portala: svježina osam gradskih kanala, središnji feed i stanje automatizacija, izračunato iz repozitorija.',
    eyebrow: 'Javni snimak stanja',
    h1: 'Zdravlje sustava',
    lead: 'Sve na ovoj stranici izračunato je iz datoteka u repozitoriju u trenutku gradnje. Nema živih proba dostupnosti i nema izmišljenih brojeva: svaki redak pokazuje odakle dolazi.',
    generated: 'Izračunato',
    secChannels: 'Osam gradskih kanala',
    colChannel: 'Kanal',
    colItems: 'Stavke',
    colNewest: 'Najnovije',
    colAge: 'Starost',
    colState: 'Stanje',
    secNews: 'Središnji feed portala',
    secFleet: 'Flota automatizacija',
    secFailing: 'Automatizacije koje traže pažnju',
    secRules: 'Što se popravlja samo',
    noFailing: 'Nijedna zabilježena automatizacija nije u padu.',
    states: { ok: 'Svježe', warn: 'Kasni', bad: 'Zastarjelo', unknown: 'Nema zapisa' },
    overall: { ok: 'Sve u granicama', warn: 'Nekoliko stvari traži pažnju', bad: 'Više stvari traži pažnju' },
    hours: 'h',
    fleetLabels: {
      total: 'automatizacija', scheduled: 'na rasporedu', perDay: 'pokretanja dnevno',
      groups: 'radnih skupina', ungrouped: 'izvan skupine', collected: 'zapis o runovima',
    },
    rules: [
      ['Indeks HR/EN', 'Dnevna provjera pariteta; ako se raziđu, otvara se popravak uz zelene provjere.', '/workers/grupacije/'],
      ['Flota', 'Popis svih automatizacija, rasporeda i zadnjih ishoda.', '/automation-status/flota/'],
      ['Svježina', 'Prag: 6 h je svježe, do 24 h kasni, nakon toga zastarjelo.', '/status/'],
      ['Izdanja', 'Osam gradskih kanala, deset provjerljivih tekstova dnevno.', '/izdanja/'],
    ],
    nav: [['Početna', '/'], ['Izdanja', '/izdanja/'], ['AKTUAL MEDIA', '/gnk-aktual/'], ['Flota', '/automation-status/flota/'], ['Status', '/status/']],
    tags: ['#AKTUALMEDIA', '#GNKASG', '#Transparentnost', '#Automatizacija'],
    switchLabel: 'English',
    switchHref: '/en/zdravlje/',
    footer: 'Snimak iz repozitorija. Nije živi nadzor dostupnosti.',
  },
  en: {
    lang: 'en',
    title: 'System health — channel freshness and automation status | GNK ASG',
    description: 'Public health board for the GNK ASG portal: freshness of eight city channels, the central feed and automation status, computed from the repository.',
    eyebrow: 'Public snapshot',
    h1: 'System health',
    lead: 'Everything on this page is computed from repository files at build time. There are no live uptime probes and no invented numbers: every row shows where it comes from.',
    generated: 'Computed',
    secChannels: 'Eight city channels',
    colChannel: 'Channel',
    colItems: 'Items',
    colNewest: 'Newest',
    colAge: 'Age',
    colState: 'State',
    secNews: 'Central portal feed',
    secFleet: 'Automation fleet',
    secFailing: 'Automations needing attention',
    secRules: 'What repairs itself',
    noFailing: 'No recorded automation is failing.',
    states: { ok: 'Fresh', warn: 'Late', bad: 'Stale', unknown: 'No record' },
    overall: { ok: 'Within limits', warn: 'A few items need attention', bad: 'Several items need attention' },
    hours: 'h',
    fleetLabels: {
      total: 'automations', scheduled: 'scheduled', perDay: 'runs per day',
      groups: 'worker groups', ungrouped: 'ungrouped', collected: 'run snapshot',
    },
    rules: [
      ['HR/EN index', 'Daily parity check; a fix opens only with green gates.', '/workers/grupacije/en/'],
      ['Fleet', 'Every automation, its schedule and last outcome.', '/automation-status/flota/en/'],
      ['Freshness', 'Thresholds: 6 h fresh, up to 24 h late, after that stale.', '/status/'],
      ['Editions', 'Eight city channels, ten verifiable stories a day.', '/en/all-desk/'],
    ],
    nav: [['Home', '/en/'], ['Editions', '/en/all-desk/'], ['AKTUAL MEDIA', '/en/gnk-aktual/'], ['Fleet', '/automation-status/flota/en/'], ['Status', '/status/']],
    tags: ['#AKTUALMEDIA', '#GNKASG', '#Transparency', '#Automation'],
    switchLabel: 'Hrvatski',
    switchHref: '/zdravlje/',
    footer: 'Repository snapshot. Not live uptime monitoring.',
  },
};

function stateBadge(state, t) {
  return `<span class="hz-state hz-${state}">${esc(t.states[state] || state)}</span>`;
}
function ageLabel(age, t) {
  if (age == null) return '—';
  return `${String(age).replace('.', ',')} ${t.hours}`;
}

function page(lang) {
  const t = COPY[lang];
  const canonical = lang === 'hr' ? `${SITE}/zdravlje/` : `${SITE}/en/zdravlje/`;
  const other = lang === 'hr' ? `${SITE}/en/zdravlje/` : `${SITE}/zdravlje/`;

  const channelRows = channels.map((c) => `
        <tr>
          <td><a href="${esc(c.url)}">${esc(c.city)}</a><span class="hz-sub">${esc(c.country)} · ${esc(c.lang)}</span></td>
          <td class="hz-num">${c.items}</td>
          <td>${c.newest ? esc(fmtDate(c.newest, lang)) : '—'}</td>
          <td class="hz-num">${ageLabel(c.age, t)}</td>
          <td>${stateBadge(c.state, t)}</td>
        </tr>`).join('');

  const failingRows = failing.length
    ? failing.map((f) => `
        <li><a href="${esc(f.url)}" rel="external noopener">${esc(f.file)}</a>
        <span class="hz-sub">${esc(f.createdAt ? fmtDate(f.createdAt, lang) : '')}</span></li>`).join('')
    : `<li class="hz-empty">${esc(t.noFailing)}</li>`;

  const ruleCards = t.rules.map(([name, text, href]) => `
      <a class="hz-rule" href="${esc(href)}">
        <strong>${esc(name)}</strong>
        <span>${esc(text)}</span>
      </a>`).join('');

  const nav = t.nav.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('');
  const tags = t.tags.map((tag) => `<span class="gnk-tag">${esc(tag)}</span>`).join('');

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'GNK ASG',
      inLanguage: ['hr', 'en'],
      publisher: { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: t.title,
      description: t.description,
      inLanguage: lang,
      isPartOf: { '@id': `${SITE}/#website` },
      publisher: { '@id': `${SITE}/#gnk-asg` },
      dateModified: new Date(now).toISOString(),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: t.h1, item: canonical },
      ],
    },
  ].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; form-action 'none'; object-src 'none'; base-uri 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0d1723">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${other}">
<link rel="alternate" hreflang="x-default" href="${SITE}/zdravlje/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:locale" content="${lang === 'hr' ? 'hr_HR' : 'en_GB'}">
<meta property="og:image" content="${SITE}/assets/gnk-asg-social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
<link rel="stylesheet" href="/assets/gnk-design-v1.css?v=20261020-health">
<link rel="stylesheet" href="/assets/zdravlje-v1.css?v=20261020-health">
${jsonld}
</head>
<body class="gnk-page">
<a class="gnk-skip" href="#sadrzaj">${lang === 'hr' ? 'Preskoči na sadržaj' : 'Skip to content'}</a>
<header class="gnk-topbar">
  <div class="gnk-topbar-inner">
    <a class="gnk-brand" href="${lang === 'hr' ? '/' : '/en/'}">GNK ASG</a>
    <nav class="gnk-topnav" aria-label="${lang === 'hr' ? 'Glavna navigacija' : 'Main navigation'}">${nav}</nav>
    <div class="hz-lang"><a href="${esc(t.switchHref)}" hreflang="${lang === 'hr' ? 'en' : 'hr'}">${esc(t.switchLabel)}</a></div>
  </div>
</header>
<main class="gnk-shell" id="sadrzaj">
  <p class="gnk-eyebrow">${esc(t.eyebrow)}</p>
  <h1 class="gnk-h1">${esc(t.h1)}</h1>
  <p class="gnk-lead">${esc(t.lead)}</p>

  <div class="hz-hero hz-hero-${overall}">
    <div class="hz-ring" role="img" aria-label="${esc(t.overall[overall])}"><span>${attention}</span></div>
    <div>
      <strong>${esc(t.overall[overall])}</strong>
      <p>${esc(t.generated)}: ${esc(fmtDate(new Date(now).toISOString(), lang))}</p>
    </div>
  </div>

  <hr class="gnk-rule">

  <h2 class="hz-h2">${esc(t.secChannels)}</h2>
  <div class="hz-tablewrap">
    <table class="hz-table">
      <thead><tr>
        <th scope="col">${esc(t.colChannel)}</th>
        <th scope="col">${esc(t.colItems)}</th>
        <th scope="col">${esc(t.colNewest)}</th>
        <th scope="col">${esc(t.colAge)}</th>
        <th scope="col">${esc(t.colState)}</th>
      </tr></thead>
      <tbody>${channelRows}
      </tbody>
    </table>
  </div>

  <h2 class="hz-h2">${esc(t.secNews)}</h2>
  <div class="hz-grid">
    <div class="gnk-card">
      <p class="gnk-eyebrow">news.json</p>
      <p class="hz-big">${summary.news.items}</p>
      <p class="hz-sub">${esc(t.colItems)} · ${summary.news.sources} ${lang === 'hr' ? 'izvora' : 'sources'}</p>
      <p class="hz-sub">${esc(t.colNewest)}: ${summary.news.newest ? esc(fmtDate(summary.news.newest, lang)) : '—'}</p>
      ${stateBadge(summary.news.state, t)}
    </div>
    <div class="gnk-card">
      <p class="gnk-eyebrow">${esc(t.secFleet)}</p>
      <p class="hz-big">${summary.fleet.totalAutomations}</p>
      <p class="hz-sub">${esc(t.fleetLabels.total)} · ${summary.fleet.scheduled} ${esc(t.fleetLabels.scheduled)}</p>
      <p class="hz-sub">${summary.fleet.runsPerDay} ${esc(t.fleetLabels.perDay)} · ${summary.fleet.groups} ${esc(t.fleetLabels.groups)}</p>
      <p class="hz-sub">${summary.fleet.ungrouped} ${esc(t.fleetLabels.ungrouped)} · ${esc(t.fleetLabels.collected)}: ${runsCollectedAt ? esc(fmtDate(runsCollectedAt, lang)) : '—'}</p>
    </div>
  </div>

  <h2 class="hz-h2">${esc(t.secFailing)} <span class="hz-count">${failing.length}</span></h2>
  <ul class="hz-list">${failingRows}
  </ul>

  <h2 class="hz-h2">${esc(t.secRules)}</h2>
  <div class="hz-rules">${ruleCards}
  </div>

  <hr class="gnk-rule">
  <p class="gnk-tags">${tags}</p>
  <p class="hz-foot">${esc(t.footer)} · <a href="/zdravlje/">HR</a> · <a href="/en/zdravlje/">EN</a> · <a href="/status/">${lang === 'hr' ? 'Status centar' : 'Status center'}</a> · <a href="/automation-status/flota/">${lang === 'hr' ? 'Flota' : 'Fleet'}</a> · <a href="/workers/grupacije/">${lang === 'hr' ? 'Radne skupine' : 'Worker groups'}</a> · <a href="${lang === 'hr' ? '/autonomija/' : '/en/autonomy/'}">${lang === 'hr' ? 'Autonomija 365' : 'Autonomy 365'}</a> · <a href="${lang === 'hr' ? '/' : '/en/'}">GNK ASG</a></p>
</main>
<footer class="gnk-footer">
  <div class="gnk-shell">
    <p>© ${new Date(now).getUTCFullYear()} GNK ASG d.o.o. · ${esc(t.footer)}</p>
  </div>
</footer>
</body>
</html>
`;
}

const outputs = [
  [path.join(PORTAL, 'zdravlje/index.html'), page('hr')],
  [path.join(PORTAL, 'en/zdravlje/index.html'), page('en')],
  [path.join(PORTAL, 'data/health-dashboard.json'), JSON.stringify(summary, null, 2) + '\n'],
];

let written = 0;
for (const [file, body] of outputs) {
  if (CHECK_ONLY) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  written++;
}

console.log(JSON.stringify({
  ok: true,
  checkOnly: CHECK_ONLY,
  written,
  overall,
  channels: channels.map((c) => `${c.id}:${c.items}/${c.state}`),
  news: `${summary.news.items}/${summary.news.state}`,
  fleet: `${summary.fleet.totalAutomations}/${summary.fleet.scheduled}/${summary.fleet.runsPerDay}`,
  failing: failing.map((f) => f.file),
}, null, 2));
