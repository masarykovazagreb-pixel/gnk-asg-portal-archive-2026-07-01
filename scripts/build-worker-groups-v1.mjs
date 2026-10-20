#!/usr/bin/env node
/* Grupira stvarne GitHub Actions workflowe u radne skupine i gradi javnu
   stranicu /workers/grupacije/ (hr) i /workers/grupacije/en/ (en).

   Izvor istine su datoteke u .github/workflows — nijedna se ne izmišlja.
   Brojevi u podnožju su stvarni brojevi datoteka, a modelirani profili
   radnika ostaju označeni kao model (vidi data/worker-live-reports.json). */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WF = join(ROOT, '.github', 'workflows');
const PORTAL = join(ROOT, 'apps', 'portal');
const REPO = 'masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01';

const GROUPS = [
  {
    id: 'izdanja',
    hr: { name: 'Izdanja i sadržaj', lead: 'Osam gradskih kanala, deskovi, tjednik i svjetsko izdanje — prikupljanje, provjera izvora i objava tekstova.' },
    en: { name: 'Editions and content', lead: 'Eight city channels, desks, the weekly and the world edition — gathering, source checks and publishing.' },
    re: /^(check-aktual|aktual-|region-|newsroom|editorial|blog|tjednik|moda|desk|world-)/,
    page: ['/izdanja/', 'Sva izdanja'], pageEn: ['/en/izdanja/', 'All editions']
  },
  {
    id: 'deploy',
    hr: { name: 'Objava i deploy', lead: 'Objava portala, medija i indeksa na produkciju, uz provjeru odobrenog commita prije svakog puštanja.' },
    en: { name: 'Release and deploy', lead: 'Releasing the portal, media and indexes to production, with an approved-commit check before every push.' },
    re: /^(deploy|publish|release|predeploy|pages)/,
    page: ['/status/', 'Status objave'], pageEn: ['/status/', 'Release status']
  },
  {
    id: 'provjere',
    hr: { name: 'Provjere i auditi', lead: 'Automatske provjere linkova, meta podataka, shema, cijena i pristupačnosti — prije nego što stranica uopće dođe do čitatelja.' },
    en: { name: 'Checks and audits', lead: 'Automated checks of links, meta data, schemas, prices and accessibility — before a page ever reaches a reader.' },
    re: /^(audit|check-|validate|verify|truth-|contract)/,
    page: ['/automation-status/', 'Status automatizacije'], pageEn: ['/automation-status/', 'Automation status']
  },
  {
    id: 'mediji',
    hr: { name: 'Mediji, slike i galerija', lead: 'Priprema slika, galerija, radio i medijskih paketa — s provjerom kvalitete i bez izmišljenih portreta.' },
    en: { name: 'Media, images and gallery', lead: 'Image preparation, galleries, radio and media packs — quality-checked, with no invented portraits.' },
    re: /(image|photo|gallery|asset|radio|premium-image|media-(command|quality))/,
    page: ['/galerija/', 'Galerija'], pageEn: ['/galerija/', 'Gallery']
  },
  {
    id: 'pristup',
    hr: { name: 'Pristup i administracija', lead: 'Prijava, dozvole, mail i zaštićene konzole — s odvojenim odobrenjima za svaku promjenu.' },
    en: { name: 'Access and administration', lead: 'Sign-in, permissions, mail and protected consoles — each change with its own approval.' },
    re: /(admin|auth|access|security|secret|token|mail|smtp)/,
    page: ['/worker-ops/', 'Operativa'], pageEn: ['/worker-ops/', 'Operations']
  },
  {
    id: 'nadzor',
    hr: { name: 'Nadzor i status', lead: 'Zdravlje stranice, vrijeme odgovora, prekidači i izvještaji — ono što rano uhvati zastoj.' },
    en: { name: 'Monitoring and status', lead: 'Site health, response time, kill switches and reports — what catches a stall early.' },
    re: /(health|status|monitor|probe|diagnose|kill-switch|report|floating)/,
    page: ['/workers/', 'Katalog radnika'], pageEn: ['/workers/', 'Worker directory']
  }
];

const files = readdirSync(WF).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
/* Svaka datoteka ide u točno jednu skupinu — prva koja je prepozna. */
for (const g of GROUPS) g.files = [];
const rest = [];
for (const f of files) {
  const g = GROUPS.find((x) => x.re.test(f));
  if (g) g.files.push(f); else rest.push(f);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOTAL = GROUPS.reduce((n, g) => n + g.files.length, 0) + rest.length;
const wfUrl = (f) => `https://github.com/${REPO}/actions/workflows/${f}`;

function page(lang) {
  const EN = lang === 'en';
  const cards = GROUPS.map((g) => {
    const t = g[lang];
    const shown = g.files.slice(0, 6).map((f) => `<li><a href="${wfUrl(f)}" rel="external noopener">${esc(f.replace(/\.ya?ml$/, ''))}</a></li>`).join('');
    const more = g.files.length > 6 ? `<li class="wg-more">+ ${g.files.length - 6} ${EN ? 'more' : 'još'}</li>` : '';
    return `<article class="wg-card" id="g-${g.id}">
      <header><span class="wg-n">${String(g.files.length).padStart(2, '0')}</span><h2>${esc(t.name)}</h2></header>
      <p>${esc(t.lead)}</p>
      <ul class="wg-wf">${shown}${more}</ul>
      <div class="wg-links">
        <a href="https://github.com/${REPO}/actions" rel="external noopener">${EN ? 'All automations' : 'Sve automatizacije'} →</a>
        <a href="${g.page[0]}">${esc(EN ? g.pageEn[1] : g.page[1])} →</a>
        <a href="${g.id === 'nadzor' ? '/status/' : '/workers/'}">${EN ? 'Directory' : 'Katalog'} →</a>
      </div>
    </article>`;
  }).join('\n');

  const restBlock = rest.length ? `<section class="wg-rest"><h2>${EN ? 'Ungrouped jobs' : 'Poslovi izvan skupina'}</h2>
    <p>${EN ? 'Automations that do not fit a single group; listed so nothing is hidden.' : 'Automatizacije koje ne pripadaju jednoj skupini; popisane su da ništa ne ostane skriveno.'}</p>
    <ul class="wg-wf">${rest.slice(0, 12).map((f) => `<li><a href="${wfUrl(f)}" rel="external noopener">${esc(f.replace(/\.ya?ml$/, ''))}</a></li>`).join('')}${rest.length > 12 ? `<li class="wg-more">+ ${rest.length - 12}</li>` : ''}</ul></section>` : '';

  return `<!doctype html>
<html lang="${EN ? 'en' : 'hr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${EN ? 'Worker groups and automations' : 'Grupacije radnika i automatizacije'} — GNK ASG</title>
<meta name="description" content="${EN ? 'Six working groups of digital workers and the real GitHub Actions automations behind them.' : 'Šest radnih skupina digitalnih radnika i stvarne GitHub Actions automatizacije koje ih pokreću.'}">
<link rel="canonical" href="https://gnk-asg.hr/workers/grupacije/${EN ? 'en/' : ''}">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/workers/grupacije/">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/workers/grupacije/en/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/workers/grupacije/">
<meta name="keywords" content="GNK ASG, AKTUAL MEDIA, digitalni radnici, grupacije radnika, GitHub Actions, automatizacije, worker groups">
<meta property="og:type" content="website">
<meta property="og:title" content="${EN ? 'Worker groups and automations' : 'Grupacije radnika i automatizacije'} — GNK ASG">
<meta property="og:description" content="${EN ? 'Six working groups and the real automations behind them.' : 'Šest radnih skupina i stvarne automatizacije koje ih pokreću.'}">
<meta property="og:locale" content="${EN ? 'en_GB' : 'hr_HR'}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box}body{margin:0;background:#faf7ef;color:#14181e;font:16px/1.55 Georgia,serif}
a{color:#8c2f2f}
.wg-top{background:#0d1723;color:#f3ead6;padding:10px 18px;font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}
.wg-top a{color:#e9c66c;text-decoration:none;margin-right:16px}
.wg-wrap{max-width:1120px;margin:0 auto;padding:34px 20px 56px}
h1{font:900 clamp(28px,4.6vw,46px)/1.02 Impact,"Arial Black",system-ui,sans-serif;text-transform:uppercase;letter-spacing:.01em;margin:0 0 10px}
.wg-lead{font-size:16.5px;max-width:78ch;color:#3d3a33;margin:0 0 8px}
.wg-meta{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 26px}
.wg-pill{border:1px solid #d8cfbb;border-radius:999px;padding:7px 12px;background:#fff;font:800 10px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5d5648}
.wg-pill b{color:#111;font-size:12px}
.wg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
.wg-card{background:#fff;border:1px solid #e3d9c3;border-top:4px solid #c8963c;border-radius:14px;padding:16px 16px 12px;box-shadow:0 10px 24px rgba(31,38,48,.07)}
.wg-card header{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
.wg-n{font:900 12px/1 system-ui,sans-serif;color:#b8862f;letter-spacing:.1em}
.wg-card h2{margin:0;font:900 17px/1.1 system-ui,sans-serif;letter-spacing:.01em}
.wg-card p{margin:0 0 10px;font-size:14px;color:#4a463d}
.wg-wf{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:4px}
.wg-wf a{font:700 11.5px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;text-decoration:none;color:#243040;background:#f6f2e8;border:1px solid #e6ddc9;border-radius:7px;padding:5px 8px;display:block}
.wg-wf a:hover{background:#fdf1d2;border-color:#c8963c}
.wg-more{font:700 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8a8578;padding:4px 2px}
.wg-links{display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid #efe7d7;padding-top:9px}
.wg-links a{font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:#8c2f2f}
.wg-rest{margin-top:26px;background:#fff;border:1px solid #e3d9c3;border-radius:14px;padding:16px}
.wg-rest h2{margin:0 0 6px;font:900 16px/1.1 system-ui,sans-serif}
.wg-note{margin-top:22px;font-size:13.5px;color:#5d5648;border-left:3px solid #c8963c;padding-left:12px}
.wg-foot{margin-top:30px;display:flex;gap:14px;flex-wrap:wrap;border-top:1px solid #e3d9c3;padding-top:14px}
.wg-foot a{font:800 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:#8c2f2f}
@media(max-width:560px){.wg-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wg-top">
  <a href="/">GNK ASG</a><a href="/workers/">${EN ? 'Workers' : 'Radnici'}</a><a href="/automation-status/">${EN ? 'Automation status' : 'Status automatizacije'}</a><a href="/izdanja/">${EN ? 'Editions' : 'Izdanja'}</a><a href="/radio/">Radio</a><a href="/galerija/">${EN ? 'Gallery' : 'Galerija'}</a>
</div>
<main class="wg-wrap">
  <h1>${EN ? 'Worker groups and automations' : 'Grupacije radnika i automatizacije'}</h1>
  <p class="wg-lead">${EN
    ? 'Digitalni radnici podijeljeni su u šest radnih skupina. Svaka skupina ima svoje stvarne GitHub Actions automatizacije — popis ispod vodi izravno na njih.'
    : 'Digitalni radnici podijeljeni su u šest radnih skupina. Svaka skupina ima svoje stvarne GitHub Actions automatizacije — popis ispod vodi izravno na njih.'}</p>
  <div class="wg-meta">
    <span class="wg-pill"><b>${TOTAL}</b> ${EN ? 'automations' : 'automatizacija'}</span>
    <span class="wg-pill"><b>${GROUPS.length}</b> ${EN ? 'groups' : 'skupina'}</span>
    <span class="wg-pill"><b>1.573</b> ${EN ? 'modeled profiles' : 'modelirana profila'}</span>
    <span class="wg-pill">${EN ? 'real workflows only' : 'samo stvarni workflowi'}</span>
  </div>
  <div class="wg-grid">${cards}</div>
  ${restBlock}
  <p class="wg-note">${EN
    ? 'The 1,573 worker profiles are a modeled catalogue, not 1,573 running processes. What actually runs are the automation files listed here.'
    : '1.573 profila radnika su modelirani katalog, ne 1.573 pokrenuta procesa. Stvarno se izvršavaju automatizacije popisane ovdje.'}</p>
  <nav class="wg-foot">
    <a href="/workers/">${EN ? '← Worker directory' : '← Katalog radnika'}</a>
    <a href="/workers/grupacije/${EN ? '' : 'en/'}">${EN ? 'Hrvatski' : 'English'}</a>
    <a href="/status/">Status</a>
    <a href="/automation-status/">${EN ? 'Automation status' : 'Status automatizacije'}</a>
    <a href="/worker-ops/">${EN ? 'Operations' : 'Operativa'}</a>
    <a href="/gnk-aktual/">AKTUAL MEDIA</a>
    <a href="/kanal/">${EN ? 'All channels' : 'Svi kanali'}</a>
  </nav>
  <ul class="wg-tags" style="list-style:none;display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 0;padding:0">
    <li style="font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#a29884;align-self:center">${EN ? 'Tags' : 'Oznake'}</li>
    ${['#NerminSefić','#NerminSefic','#SeficNermin','#SEFICNERMIN','#UrednikNerminSefić','#AKTUALMEDIA','#GNKASG','#Automatizacije'].map((t) => `<li><a href="${t.toLowerCase().includes('nermin') || t.includes('Sefic') || t.includes('SEFIC') ? '/nermin-sefic/' : '/gnk-aktual/'}" style="display:inline-block;font:800 9.5px/1 system-ui,sans-serif;text-decoration:none;color:#4a463d;background:#f6f2e8;border:1px solid #e0d6c1;border-radius:999px;padding:5px 9px">${t}</a></li>`).join('')}
  </ul>
</main>
</body>
</html>`;
}

const dir = join(PORTAL, 'workers', 'grupacije');
mkdirSync(join(dir, 'en'), { recursive: true });
writeFileSync(join(dir, 'index.html'), page('hr'));
writeFileSync(join(dir, 'en', 'index.html'), page('en'));

const out = {
  note: 'Groups are derived from real workflow files; worker profiles are a modeled catalogue.',
  total: TOTAL,
  groups: GROUPS.map((g) => ({ id: g.id, name: g.hr.name, nameEn: g.en.name, automations: g.files.length, files: g.files })),
  ungrouped: rest
};
writeFileSync(join(PORTAL, 'data', 'worker-groups.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, total: TOTAL, groups: out.groups.map((g) => [g.id, g.automations]), ungrouped: rest.length }));
