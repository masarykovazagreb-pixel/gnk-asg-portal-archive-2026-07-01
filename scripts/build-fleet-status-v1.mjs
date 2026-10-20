// GNK ASG — flota automatizacija: statička stranica sa stanjem svih workflowa.
// Ulaz: apps/portal/data/worker-groups.json + apps/portal/data/workflow-runs.json
// Izlaz: apps/portal/automation-status/flota/index.html (+ /en/), apps/portal/data/fleet-status.json
// Stranica je statička (bez JS-a) pa radi i kad GitHub API nije dostupan.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { readWorkflowCrons, scheduleOf } from './lib/workflow-crons.mjs';

const GROUPS_FILE = 'apps/portal/data/worker-groups.json';
const RUNS_FILE = 'apps/portal/data/workflow-runs.json';
const OUT_HR = 'apps/portal/automation-status/flota/index.html';
const OUT_EN = 'apps/portal/automation-status/flota/en/index.html';
const OUT_JSON = 'apps/portal/data/fleet-status.json';
const CSS_VERSION = '20261020-fleet';
const SITE = 'https://gnk-asg.hr';

const groupsDoc = JSON.parse(readFileSync(GROUPS_FILE, 'utf8'));
let runsDoc = { runs: {}, collectedAt: null, repository: '' };
try {
  runsDoc = JSON.parse(readFileSync(RUNS_FILE, 'utf8'));
} catch {
  // Bez povijesti runova stranica i dalje vrijedi — samo piše da zapisa nema.
}

// Stvarni cron izrazi iz svih workflow datoteka — i onih izvan skupina.
const CRONS = readWorkflowCrons('.github/workflows');
const fileMeta = (file) => ({ file, ...scheduleOf(CRONS, file) });

const REPO = runsDoc.repository || 'masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01';

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const T = {
  hr: {
    lang: 'hr',
    title: 'Flota automatizacija — sve worker grupe i rasporedi | GNK ASG',
    desc: 'Potpuni popis GitHub Actions automatizacija GNK ASG portala po radnim skupinama: raspored, pokretanja dnevno i zadnji zabilježeni ishod.',
    h1: 'Flota automatizacija',
    lead: 'Svaka automatizacija u repozitoriju, razvrstana u radne skupine. Raspored se čita iz stvarnih cron izraza u workflow datotekama, a ishod iz zadnjeg zabilježenog GitHub Actions runa. Gdje runa nema, stranica to kaže — ništa se ne pretpostavlja.',
    pillWorkflows: 'automatizacija',
    pillScheduled: 'na rasporedu',
    pillPerDay: 'pokretanja / dan',
    pillTracked: 's poviješću runova',
    collected: 'Povijest runova prikupljena',
    noHistory: 'bez zapisa',
    tabAutomation: 'Automatizacija',
    tabSchedule: 'Raspored',
    tabPerDay: '/ dan',
    tabLast: 'Zadnji run',
    tabOutcome: 'Ishod',
    manual: 'ručno',
    noRun: 'Nema zapisa',
    openActions: 'Otvori u Actions',
    details: 'Prikaži sve automatizacije skupine',
    scheduled: 'Na rasporedu',
    unscheduled: 'Bez rasporeda (ručno ili na događaj)',
    ungrouped: 'Izvan skupina',
    ungroupedLead: 'Automatizacije koje ne pripadaju nijednoj radnoj skupini. Popis je potpun, bez izostavljanja.',
    outcomes: { success: 'Uspjeh', failure: 'Pad', skipped: 'Preskočeno', cancelled: 'Otkazano', timed_out: 'Isteklo', action_required: 'Treba odobrenje', neutral: 'Neutralno', stale: 'Zastarjelo' },
    linksTitle: 'Povezano',
    links: [
      ['/workers/', 'Svi radnici'],
      ['/workers/grupacije/', 'Radne skupine'],
      ['/automation-status/', 'Status automatizacije'],
      ['/status/', 'Status sustava'],
      ['/izdanja/', 'Izdanja'],
      ['/radio/', 'AKTUAL RADIO'],
      ['/', 'GNK ASG početna'],
      ['/en/', 'English'],
    ],
    hashtags: ['#GnkAsg', '#AktualMedia', '#Automatizacija', '#DigitalniRadnici', '#Transparentnost', '#SeficNermin'],
  },
  en: {
    lang: 'en',
    title: 'Automation fleet — all worker groups and schedules | GNK ASG',
    desc: 'Every GitHub Actions automation of the GNK ASG portal, grouped by worker group, with schedule, daily run count and the last recorded outcome.',
    h1: 'Automation fleet',
    lead: 'Every automation in the repository, grouped by worker group. Schedules come from the real cron expressions in the workflow files; outcomes come from the last recorded GitHub Actions run. Where there is no run, the page says so — nothing is assumed.',
    pillWorkflows: 'automations',
    pillScheduled: 'scheduled',
    pillPerDay: 'runs / day',
    pillTracked: 'with run history',
    collected: 'Run history collected',
    noHistory: 'no record',
    tabAutomation: 'Automation',
    tabSchedule: 'Schedule',
    tabPerDay: '/ day',
    tabLast: 'Last run',
    tabOutcome: 'Outcome',
    manual: 'manual',
    noRun: 'No record',
    openActions: 'Open in Actions',
    details: 'Show all automations in this group',
    scheduled: 'Scheduled',
    unscheduled: 'Unscheduled (manual or event)',
    ungrouped: 'Outside groups',
    ungroupedLead: 'Automations that belong to no worker group. The list is complete, nothing is omitted.',
    outcomes: { success: 'Success', failure: 'Failure', skipped: 'Skipped', cancelled: 'Cancelled', timed_out: 'Timed out', action_required: 'Needs approval', neutral: 'Neutral', stale: 'Stale' },
    linksTitle: 'Related',
    links: [
      ['/en/workers/', 'All workers'],
      ['/workers/grupacije/en/', 'Worker groups'],
      ['/en/', 'GNK ASG home'],
      ['/izdanja/', 'Editions (HR)'],
      ['/en/radio/', 'AKTUAL RADIO'],
      ['/en/newsroom/', 'Newsroom'],
      ['/en/contact/', 'Contact'],
      ['/en/group-network/', 'Group network'],
    ],
    hashtags: ['#GnkAsg', '#AktualMedia', '#Automation', '#DigitalWorkforce', '#Transparency', '#SeficNermin'],
  },
};

const stamp = runsDoc.collectedAt || null;
const fmtStamp = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCDate()).padStart(2, '0')}. ${String(d.getUTCMonth() + 1).padStart(2, '0')}. ${d.getUTCFullYear()}. ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};

const fmtRun = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}. ${pad(d.getUTCMonth() + 1)}. ${d.getUTCFullYear()}. ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
};

const cronLabel = (crons) => {
  if (!crons || !crons.length) return null;
  return crons.join(' · ');
};

const allFiles = [
  ...groupsDoc.groups.flatMap((g) => g.files.map((f) => ({ ...fileMeta(f.file), group: g.id }))),
  ...groupsDoc.ungrouped.map((file) => ({ ...fileMeta(file), group: 'ungrouped' })),
];

const tracked = allFiles.filter((f) => runsDoc.runs[`.github/workflows/${f.file}`]).length;
const totalPerDay = allFiles.reduce((sum, f) => sum + f.perDay, 0);
const scheduledTotal = allFiles.filter((f) => f.crons.length).length;

const outcomeOf = (run) => {
  if (!run) return null;
  if (run.status && run.status !== 'completed') return run.status === 'in_progress' ? 'running' : run.status;
  return run.conclusion || 'neutral';
};

function rowHtml(entry, t) {
  const path = `.github/workflows/${entry.file}`;
  const run = runsDoc.runs[path];
  const outcome = outcomeOf(run);
  const tone = outcome === 'success' ? 'ok' : outcome === 'failure' || outcome === 'timed_out' ? 'bad' : 'mut';
  const label = outcome ? (t.outcomes[outcome] || outcome) : t.noRun;
  const last = run ? `<a href="${esc(run.url)}" rel="noopener">${esc(fmtRun(run.createdAt))}</a>` : '<span class="fl-mut">—</span>';
  const actions = `https://github.com/${REPO}/actions/workflows/${encodeURIComponent(entry.file)}`;
  return `      <tr>
        <th scope="row"><a class="fl-file" href="${esc(actions)}" rel="noopener" title="${esc(t.openActions)}">${esc(entry.file)}</a></th>
        <td class="fl-mono">${entry.crons.length ? esc(cronLabel(entry.crons)) : `<span class="fl-mut">${esc(t.manual)}</span>`}</td>
        <td class="fl-num">${entry.perDay ? esc(entry.perDay) : '—'}</td>
        <td class="fl-mono">${last}</td>
        <td><span class="fl-badge fl-${tone}">${esc(label)}</span></td>
      </tr>`;
}

function tableHtml(list, t) {
  return `    <div class="fl-scroll">
    <table class="fl-table">
      <thead><tr><th scope="col">${esc(t.tabAutomation)}</th><th scope="col">${esc(t.tabSchedule)}</th><th scope="col">${esc(t.tabPerDay)}</th><th scope="col">${esc(t.tabLast)}</th><th scope="col">${esc(t.tabOutcome)}</th></tr></thead>
      <tbody>
${list.map((entry) => rowHtml(entry, t)).join('\n')}
      </tbody>
    </table>
    </div>`;
}

function page(t, otherLang) {
  const lang = t.lang;
  const canonical = lang === 'hr' ? `${SITE}/automation-status/flota/` : `${SITE}/automation-status/flota/en/`;
  const altHr = `${SITE}/automation-status/flota/`;
  const altEn = `${SITE}/automation-status/flota/en/`;
  const stampText = fmtStamp(stamp);

  const groupSections = groupsDoc.groups.map((group, index) => {
    const meta = group.files.map((f) => ({ ...fileMeta(f.file), group: group.id }));
    const scheduled = meta.filter((f) => f.crons.length);
    const rest = meta.filter((f) => !f.crons.length);
    const name = lang === 'hr' ? group.name : group.nameEn;
    const groupPerDay = scheduled.reduce((sum, f) => sum + f.perDay, 0);
    const stats = lang === 'hr'
      ? `${group.files.length} automatizacija · ${scheduled.length} na rasporedu · ${groupPerDay} pokretanja dnevno`
      : `${group.files.length} automations · ${scheduled.length} scheduled · ${groupPerDay} runs per day`;
    return `  <section class="fl-group" id="grupa-${esc(group.id)}" aria-labelledby="h-${esc(group.id)}">
    <header class="fl-group-head">
      <span class="fl-num-badge">${String(index + 1).padStart(2, '0')}</span>
      <h2 id="h-${esc(group.id)}">${esc(name)}</h2>
      <p class="fl-stat-line">${esc(stats)}</p>
    </header>
${scheduled.length ? tableHtml(scheduled, t) : `    <p class="fl-mut">${esc(t.unscheduled)}</p>`}
${rest.length ? `    <details class="fl-details">
      <summary>${esc(t.details)} <b>${rest.length}</b></summary>
      <ul class="fl-list">${rest.map((f) => `<li><span class="fl-file">${esc(f.file)}</span></li>`).join('')}</ul>
    </details>` : ''}
  </section>`;
  }).join('\n');

  const ungroupedSection = groupsDoc.ungrouped.length ? `  <section class="fl-group" id="izvan-skupina" aria-labelledby="h-ungrouped">
    <header class="fl-group-head">
      <span class="fl-num-badge">—</span>
      <h2 id="h-ungrouped">${esc(t.ungrouped)}</h2>
      <p class="fl-stat-line">${esc(t.ungroupedLead)}</p>
    </header>
    <details class="fl-details" open>
      <summary>${esc(t.ungrouped)} <b>${groupsDoc.ungrouped.length}</b></summary>
      <ul class="fl-list">${groupsDoc.ungrouped.map((file) => {
        const run = runsDoc.runs[`.github/workflows/${file}`];
        const outcome = outcomeOf(run);
        const tone = outcome === 'success' ? 'ok' : outcome === 'failure' || outcome === 'timed_out' ? 'bad' : 'mut';
        const badge = `<span class="fl-badge fl-${tone}">${esc(outcome ? (t.outcomes[outcome] || outcome) : t.noRun)}</span>`;
        return `<li><span class="fl-file">${esc(file)}</span>${badge}</li>`;
      }).join('')}</ul>
    </details>
  </section>` : '';

  const links = t.links.map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('');
    // Svaka oznaka vodi na stranicu koja stvarno postoji.
  const tagHref = (tag) => {
    const key = tag.toLowerCase();
    if (key.includes('sefic')) return '/nermin-sefic/';
    if (key.includes('aktual')) return '/gnk-aktual/';
    if (key.includes('automatiz') || key.includes('automation')) return '/automation-status/flota/';
    if (key.includes('radnic') || key.includes('workforce')) return '/workers/grupacije/';
    if (key.includes('transparent')) return '/automation-status/';
    return '/';
  };
  const hashtags = t.hashtags.map((tag) => `<a class="gnk-tag" href="${tagHref(tag)}">${esc(tag)}</a>`).join('');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: t.h1,
        url: canonical,
        inLanguage: lang,
        description: t.desc,
        isPartOf: { '@type': 'WebSite', name: 'GNK ASG d.o.o.', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${SITE}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: lang === 'hr' ? 'Automatizacija' : 'Automation', item: `${SITE}/automation-status/` },
          { '@type': 'ListItem', position: 3, name: t.h1, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="GNK ASG d.o.o.">
<meta name="theme-color" content="#0d1723">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${altHr}">
<link rel="alternate" hreflang="en" href="${altEn}">
<link rel="alternate" hreflang="x-default" href="${altHr}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="GNK ASG d.o.o.">
<meta property="og:locale" content="${lang === 'hr' ? 'hr_HR' : 'en_US'}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<link rel="icon" href="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" type="image/svg+xml">
<link rel="stylesheet" href="/assets/gnk-design-v1.css?v=${CSS_VERSION}">
<link rel="stylesheet" href="/automation-status/flota/fleet.css?v=${CSS_VERSION}">
</head>
<body class="gnk-page">
<a class="gnk-skip" href="#glavni-sadrzaj">${lang === 'hr' ? 'Preskoči na sadržaj' : 'Skip to content'}</a>
<header class="gnk-topbar">
  <div class="gnk-topbar-inner">
    <a class="gnk-brand" href="/" aria-label="GNK ASG">GNK <b>ASG</b></a>
    <nav class="gnk-topnav" aria-label="${lang === 'hr' ? 'Glavna navigacija' : 'Main navigation'}">
      <a href="${lang === 'hr' ? '/workers/' : '/en/workers/'}">${lang === 'hr' ? 'Radnici' : 'Workers'}</a>
      <a href="${lang === 'hr' ? '/workers/grupacije/' : '/workers/grupacije/en/'}">${lang === 'hr' ? 'Grupacije' : 'Groups'}</a>
      <a href="${lang === 'hr' ? '/automation-status/' : '/automation-status/'}"${lang === 'hr' ? '' : ' lang="hr" hreflang="hr"'}>${lang === 'hr' ? 'Status' : 'Status (HR)'}</a>
      <a href="${otherLang === 'hr' ? '/automation-status/flota/' : '/automation-status/flota/en/'}" hreflang="${otherLang}" lang="${otherLang}">${otherLang.toUpperCase()}</a>
    </nav>
  </div>
</header>
<main id="glavni-sadrzaj" class="gnk-shell">
  <p class="gnk-eyebrow">${lang === 'hr' ? 'Automatizacija · flota' : 'Automation · fleet'}</p>
  <h1 class="gnk-h1">${esc(t.h1)}</h1>
  <p class="gnk-lead">${esc(t.lead)}</p>
  <div class="fl-pills">
    <span class="gnk-pill"><b>${groupsDoc.total}</b> ${esc(t.pillWorkflows)}</span>
    <span class="gnk-pill"><b>${scheduledTotal}</b> ${esc(t.pillScheduled)}</span>
    <span class="gnk-pill"><b>${totalPerDay}</b> ${esc(t.pillPerDay)}</span>
    <span class="gnk-pill"><b>${tracked}</b> ${esc(t.pillTracked)}</span>
  </div>
  <p class="fl-stamp">${esc(t.collected)}: ${stampText ? `<time datetime="${esc(stamp)}">${esc(stampText)}</time>` : `<span class="fl-mut">${esc(t.noHistory)}</span>`}</p>
  <div class="gnk-rule"></div>
${groupSections}
${ungroupedSection}
  <section class="fl-links">
    <h2>${esc(t.linksTitle)}</h2>
    <nav aria-label="${esc(t.linksTitle)}">${links}</nav>
    <div class="gnk-tags">${hashtags}</div>
  </section>
</main>
<footer class="gnk-footer">
  <p>GNK ASG d.o.o. · Nermin Sefić, ${lang === 'hr' ? 'urednik i direktor' : 'editor and director'} · <a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a></p>
  <p class="gnk-mono">${lang === 'hr' ? 'Stranica se generira iz repozitorija; ne pokreće nijednu automatizaciju.' : 'This page is generated from the repository; it starts no automation.'}</p>
</footer>
</body>
</html>
`;
}

mkdirSync(dirname(OUT_HR), { recursive: true });
mkdirSync(dirname(OUT_EN), { recursive: true });
writeFileSync(OUT_HR, page(T.hr, 'en'), 'utf8');
writeFileSync(OUT_EN, page(T.en, 'hr'), 'utf8');

const fleet = {
  version: 'GNK_ASG_FLEET_STATUS_V1',
  generatedAt: new Date().toISOString(),
  runsCollectedAt: stamp,
  total: groupsDoc.total,
  scheduled: scheduledTotal,
  runsPerDay: totalPerDay,
  tracked,
  groups: groupsDoc.groups.map((g) => ({
    id: g.id,
    name: g.name,
    nameEn: g.nameEn,
    automations: g.files.length,
    scheduled: g.files.filter((f) => (fileMeta(f.file).crons.length > 0)).length,
    runsPerDay: g.runsPerDay,
  })),
  ungrouped: groupsDoc.ungrouped.length,
};
mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, `${JSON.stringify(fleet, null, 2)}\n`, 'utf8');

console.log(`fleet: ${fleet.total} automatizacija, ${fleet.scheduled} na rasporedu, ${fleet.runsPerDay}/dan, ${fleet.tracked} s poviješću -> ${OUT_HR}`);
