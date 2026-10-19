#!/usr/bin/env node
/**
 * GNK ASG BUSINESS TJEDNIK — generator statičkog sitea.
 *
 * Ulaz:  src/critiques/*.json  (dnevni stroj)
 * Izlaz: site/                  (HTML, feedovi, sitemap; bez servera)
 *
 * Pokretanje:
 *   node apps/tjednik/build.mjs
 *   node apps/tjednik/build.mjs --base https://gnk-asg-tjednik.pages.dev/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  esc, hrDate, hrDateTime, isoDate, dayKey, weekKey, weekRangeLabel, prevWeekKey, BASE_DEFAULT
} from './engine/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const OUT = join(HERE, 'site');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const BASE = (arg('--base', process.env.TJEDNIK_BASE || BASE_DEFAULT)).replace(/\/+$/, '') + '/';
const abs = (p = '') => BASE + String(p).replace(/^\/+/, '');

const BRAND = 'GNK ASG BUSINESS TJEDNIK';
const SHORT = 'BUSINESS TJEDNIK';
const TAGLINE = 'Kritički tjednik o poslovnom izvještavanju: Lider, Jutarnji list, Poslovni dnevnik i Forbes.';
const DESCRIPTION = 'Business tjednik GNK ASG-a: kritički osvrti na poslovne tekstove Lidera, Jutarnjeg lista, Poslovnog dnevnika i Forbesa, tjedna promjena i dnevni dodaci. Automatski sastavljeno, izvori uvijek navedeni.';
const PUBLISHER = 'GNK ASG d.o.o.';
const CONTACT = 'info@gnk-asg.hr';
const START = '2026-10-19';

const SECTIONS = {
  kritike: { label: 'Kritike', href: 'kritike/' },
  tjednik: { label: 'Tjedna promjena', href: 'tjednik/' },
  dodaci: { label: 'Dnevni dodaci', href: 'dodaci/' },
  izvori: { label: 'Izvori', href: 'izvori/' },
  metodologija: { label: 'Metodologija', href: 'metodologija/' }
};

const SOURCE_NAMES = {
  lider: 'Lider',
  jutarnji: 'Jutarnji list',
  poslovni: 'Poslovni dnevnik',
  forbes: 'Forbes'
};

const THEME_WHY = {
  financije: 'Financijski naslovi najlakše prelaze iz podatka u dojam. Ako iznos nema razdoblje, osnovicu i izvor, čitatelj ne može razlikovati rast od promjene metodologije. Zato je pitanje „u odnosu na što“ važnije od same brojke.',
  trziste: 'Tržišni tekstovi često spajaju kretanje i uzrok. Cijena može rasti zbog potražnje, tečaja, sezone ili odluke jednog igrača — a naslov obično bira samo jedan od tih uzroka. Kritički osvrt ne osporava kretanje, nego traži da uzrok bude dokazan, a ne pretpostavljen.',
  regulacija: 'Regulatorna vijest ima pravne posljedice. Razlika između prijedloga, usvojenog propisa i primjene u praksi je razlika između najave i obveze. Ako tekst tu razliku ne napravi, čitatelj planira prema nečemu što još ne postoji.',
  tehnologija: 'Tehnološki tekstovi najčešće miješaju demonstraciju i proizvodnju. Pilot, najava i sustav u pogonu tri su različita stanja s različitim rizicima. Kritički osvrt traži da se navede što je izmjereno, na kojem uzorku i tko je mjerio.',
  rad: 'Podaci o plaćama i zaposlenosti ovise o definiciji. Prosjek i medijana, bruto i neto, trenutno stanje i kumulativ — sve su to različite brojke koje u naslovu izgledaju isto. Bez definicije, promjena se ne može usporediti ni s prošlom godinom.',
  tvrtke: 'Korporativna vijest ima kontekst koji se ne vidi iz jednog podatka: strukturu grupe, računovodstvenu politiku i novčani tok. Rast prihoda uz pad dobiti nije kontradikcija — ali jest pitanje na koje tekst mora odgovoriti ako želi biti informacija, a ne najava.',
  nekretnine: 'Gradnja i nekretnine spajaju javni interes, dozvole i novac. Brojka „vrijednost projekta“ ne govori koliko će koštati infrastruktura ni tko preuzima rizik. Kritički osvrt traži dokumente i razlikuje investicijsku najavu od izvedenog stanja.',
  potrosnja: 'Potrošački podaci podložni su sezoni, inflaciji i promjeni uzorka. Ako tekst ne razdvoji nominalno od realnog, rast prometa može izgledati kao rast potrošnje, iako je cijena porasla više od količine. To je metodološka, a ne ideološka primjedba.',
  poslovanje: 'Poslovni tekst je koristan kada se iz njega može izvući tvrdnja koju netko može provjeriti. Ako ostane na razini dojma, čitatelj dobiva priču, ali ne dobiva osnovu za odluku. Zato ovaj osvrt traži izvor, brojku i dokument.'
};

/* ---------- podaci ---------- */

const critiques = existsSync(join(SRC, 'critiques'))
  ? readdirSync(join(SRC, 'critiques')).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(SRC, 'critiques', f), 'utf8')))
    .sort((a, b) => (a.date === b.date ? b.addedAt.localeCompare(a.addedAt) : b.date.localeCompare(a.date)))
  : [];

const byDate = new Map();
const byWeek = new Map();
for (const c of critiques) {
  if (!byDate.has(c.date)) byDate.set(c.date, []);
  byDate.get(c.date).push(c);
  const w = weekKey(`${c.date}T12:00:00Z`);
  if (!byWeek.has(w)) byWeek.set(w, []);
  byWeek.get(w).push(c);
}

const TODAY = dayKey();
const CURRENT_WEEK = weekKey(`${TODAY}T12:00:00Z`);
const CURRENT_DAY = byDate.has(TODAY) ? TODAY : (byDate.keys().next().value || TODAY);

const statsFor = (list) => {
  const perSource = {};
  for (const id of Object.keys(SOURCE_NAMES)) perSource[id] = 0;
  const perTheme = {};
  let withNumbers = 0;
  for (const c of list) {
    perSource[c.source] = (perSource[c.source] || 0) + 1;
    perTheme[c.themeLabel] = (perTheme[c.themeLabel] || 0) + 1;
    if (c.hasNumber) withNumbers += 1;
  }
  const topThemes = Object.entries(perTheme).sort((a, b) => b[1] - a[1]);
  return {
    total: list.length,
    perSource,
    perTheme,
    topThemes,
    numericShare: list.length ? Math.round((withNumbers / list.length) * 100) : 0
  };
};

const currentWeekList = byWeek.get(CURRENT_WEEK) || [];
const prevWeekList = byWeek.get(prevWeekKey(CURRENT_WEEK)) || [];
const weekStats = statsFor(currentWeekList);
const prevStats = statsFor(prevWeekList);

/* ---------- layout ---------- */

const nav = (active = '', root = '') => Object.entries(SECTIONS)
  .map(([k, s]) => `<li><a href="${root}${s.href}"${k === active ? ' aria-current="page"' : ''}>${esc(s.label)}</a></li>`)
  .join('');

const head = ({ title, description, canonical, type = 'website', published, modified, section, tags = [], graph, root = '' }) => {
  const url = canonical === '' ? BASE : abs(canonical);
  const image = abs('assets/og/tjednik.png');
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(BRAND)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#061019">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" hreflang="hr" href="${esc(url)}">
<link rel="alternate" hreflang="x-default" href="${esc(url)}">
<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)} — RSS" href="${abs('feed.xml')}">
<link rel="alternate" type="application/feed+json" title="${esc(BRAND)} — JSON Feed" href="${abs('feed.json')}">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/tjednik.css">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:locale" content="hr_HR">
<meta property="og:type" content="${type === 'news' ? 'article' : type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${published ? `<meta property="article:published_time" content="${isoDate(published)}">\n<meta property="article:modified_time" content="${isoDate(modified || published)}">` : ''}
${section ? `<meta property="article:section" content="${esc(section)}">` : ''}
${tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}
${graph ? `<script type="application/ld+json">${JSON.stringify(graph)}</script>` : ''}
</head>`;
};

const header = (active, root) => `<header class="masthead">
  <div class="wrap mast-top">
    <a class="brand" href="${root}" aria-label="${esc(BRAND)} — naslovnica">
      <svg class="mark" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 12h20M20 12v18" stroke="currentColor" stroke-width="2.4"/><path d="M27 22l5 8h-10z" fill="currentColor" opacity=".55"/></svg>
      <span class="brand-word"><b>BUSINESS</b><span>GNK ASG · TJEDNIK</span></span>
    </a>
    <div class="mast-right">
      <span class="mast-note">Kritika izvještavanja, ne prepisivanje</span>
      <time class="mast-date" datetime="${TODAY}">${hrDate(TODAY)}</time>
    </div>
  </div>
  <nav class="nav" aria-label="Glavna navigacija"><div class="wrap"><ul>${nav(active, root)}</ul></div></nav>
</header>
<div class="status-strip"><div class="wrap"><span class="badge"><span class="dot"></span>Automatski sastavljeni kritički osvrti</span><span>Izvornik je uvijek povezan · tvrdnje izvornika nisu naše tvrdnje</span></div></div>`;

const footer = (root) => `<footer>
  <div class="wrap foot">
    <div>
      <b>${esc(BRAND)}</b>
      <p>${esc(TAGLINE)}</p>
      <p class="fine">Izdavač: ${esc(PUBLISHER)} · Zagreb · ${esc(CONTACT)}</p>
    </div>
    <div class="foot-links">
      <a href="${root}kritike/">Kritike</a>
      <a href="${root}tjednik/">Tjedna promjena</a>
      <a href="${root}dodaci/">Dnevni dodaci</a>
      <a href="${root}izvori/">Izvori</a>
      <a href="${root}metodologija/">Metodologija</a>
      <a href="${abs('feed.json')}">Feed</a>
      <a href="https://gnk-asg-kanal.pages.dev/" target="_blank" rel="external noopener">KANAL ZAGREB ↗</a>
      <a href="https://gnk-asg.hr/izdanja/" target="_blank" rel="external noopener">Naša izdanja — AKTUAL MEDIA ↗</a>
      <a href="https://gnk-asg.hr/gnk-aktual/" target="_blank" rel="external noopener">AKTUAL MEDIA ↗</a>
    </div>
  </div>
  <div class="wrap fine">Sadržaj se generira iz javnih naslova, sažetaka i poveznica na izvornike. Tjednik ne prenosi cjelovite tekstove i ne tvrdi da su tvrdnje izvornika provjerene. Kritika se odnosi na način izvještavanja.</div>
</footer>`;

const layout = ({ title, description, canonical, active = '', root = '', content, type, published, modified, section, tags, graph }) =>
  `${head({ title, description, canonical, type, published, modified, section, tags, graph, root })}
<body>
${header(active, root)}
<main id="sadrzaj">
${content}
</main>
${footer(root)}
</body>
</html>`;

const page = (slug, html) => {
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
};

const themeTags = (c) => [c.sourceName, c.themeLabel, 'kritika', 'business'];

const critiqueCard = (c, root = '') => `<article class="card">
  <div class="card-meta"><span class="src">${esc(c.sourceName)}</span><span>${esc(c.themeLabel)}</span><time datetime="${c.date}">${hrDate(`${c.date}T12:00:00Z`)}</time></div>
  <h3><a href="${root}kritike/${c.slug}/">${esc(c.title)}</a></h3>
  <p>${c.summary ? esc(c.summary.slice(0, 180)) : 'Osvrt na naslov i dostupni sažetak; izvornik treba čitati u cjelini.'}</p>
  <div class="card-foot"><a href="${esc(c.url)}" target="_blank" rel="noopener external">Izvornik ↗</a><a href="${root}kritike/${c.slug}/">Osvrt →</a></div>
</article>`;

const critiqueRow = (c, root = '') => `<li>
  <div class="row-meta"><span>${esc(c.sourceName)}</span><span>${esc(c.themeLabel)}</span></div>
  <h3><a href="${root}kritike/${c.slug}/">${esc(c.title)}</a></h3>
  ${c.summary ? `<p>${esc(c.summary.slice(0, 200))}</p>` : ''}
</li>`;

const statsStrip = (stats) => `<div class="stats">
  <div><b>${stats.total}</b><span>kritika</span></div>
  <div><b>${Object.values(stats.perSource).filter(Boolean).length}/4</b><span>izvora</span></div>
  <div><b>${stats.numericShare}%</b><span>naslova s brojkom</span></div>
  <div><b>${esc(stats.topThemes[0]?.[0] || '—')}</b><span>dominantna tema</span></div>
</div>`;

const sourceTable = (stats, root = '') => `<table class="src-table">
  <thead><tr><th>Izvor</th><th>Osvrta</th></tr></thead>
  <tbody>${Object.entries(SOURCE_NAMES).map(([id, name]) => `<tr><td><a href="${root}izvori/${id}/">${esc(name)}</a></td><td>${stats.perSource[id] || 0}</td></tr>`).join('')}</tbody>
</table>`;

/* ---------- stranice ---------- */

const homeGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': abs('#izdavac'), name: PUBLISHER, url: 'https://gnk-asg.hr/', email: CONTACT },
    { '@type': 'WebSite', '@id': abs('#site'), url: BASE, name: BRAND, inLanguage: 'hr-HR', publisher: { '@id': abs('#izdavac') } },
    { '@type': 'CollectionPage', '@id': abs('#naslovnica'), url: BASE, name: BRAND, description: DESCRIPTION, isPartOf: { '@id': abs('#site') } }
  ]
};

const latest = critiques.slice(0, 12);
const latestDay = CURRENT_DAY;
const dayList = byDate.get(latestDay) || [];
const dayStats = statsFor(dayList);

page('', layout({
  title: `${BRAND} — kritika poslovnog izvještavanja`,
  description: DESCRIPTION,
  canonical: '',
  active: '',
  content: `<section class="hero wrap">
    <p class="kicker">Tjednik · kritika izvještavanja</p>
    <h1>Poslovne vijesti ne stižu s izvorom. Mi ga tražimo.</h1>
    <p class="lead">Čitamo Lider, Jutarnji list, Poslovni dnevnik i Forbes. Za svaki pronađeni poslovni tekst pišemo kritički osvrt: što naslov tvrdi, što sažetak otkriva i što treba provjeriti prije zaključka. Izvornik je uvijek povezan.</p>
    <div class="hero-actions">
      <a class="btn" href="tjednik/${CURRENT_WEEK}/">Tjedna promjena · ${esc(CURRENT_WEEK)}</a>
      <a class="btn btn--ghost" href="dodaci/${latestDay}/">Dnevni dodatak · ${hrDate(`${latestDay}T12:00:00Z`)}</a>
      <a class="btn btn--ghost" href="metodologija/">Kako radimo</a>
    </div>
  </section>

  <section class="wrap section">
    <div class="section-head"><h2>Tjedna promjena</h2><a href="tjednik/">Svi tjedni →</a></div>
    <p class="section-sub">${weekRangeLabel(CURRENT_WEEK)} · ${weekStats.total} osvrta u tekućem tjednu, ${prevStats.total} u prethodnom.</p>
    ${statsStrip(weekStats)}
    <div class="two-col">
      <div>
        <h3>Što se promijenilo</h3>
        <p>${weekStats.total >= prevStats.total ? 'Broj obrađenih tekstova raste' : 'Broj obrađenih tekstova pada'} u odnosu na prethodni tjedan (${prevStats.total} → ${weekStats.total}). Dominantna tema je <strong>${esc(weekStats.topThemes[0]?.[0] || '—')}</strong>${prevStats.topThemes[0] ? `, a prošli tjedan <strong>${esc(prevStats.topThemes[0][0])}</strong>` : ''}. ${weekStats.numericShare}% naslova sadrži brojku; to je ${weekStats.numericShare === prevStats.numericShare ? 'isto kao prošli tjedan' : weekStats.numericShare > prevStats.numericShare ? 'više nego prošli tjedan' : 'manje nego prošli tjedan'} (${prevStats.numericShare}%).</p>
        <p><a class="more" href="tjednik/${CURRENT_WEEK}/">Otvorite tjednu promjenu →</a></p>
      </div>
      <div>${sourceTable(weekStats)}</div>
    </div>
  </section>

  <section class="wrap section">
    <div class="section-head"><h2>Najnovije kritike</h2><a href="kritike/">Sve kritike →</a></div>
    ${latest.length ? `<div class="grid">${latest.map((c) => critiqueCard(c)).join('')}</div>` : '<p class="empty">Prvo izdanje još nije sastavljeno. Stroj obrađuje izvore svakoga dana u 06:00 po Zagrebu.</p>'}
  </section>

  <section class="wrap section">
    <div class="section-head"><h2>Dnevni dodatak</h2><a href="dodaci/">Svi dodaci →</a></div>
    <p class="section-sub">${hrDate(`${latestDay}T12:00:00Z`)} · ${dayStats.total} osvrta · ${dayStats.topThemes.slice(0, 3).map(([t, n]) => `${esc(t)} (${n})`).join(' · ') || 'bez tema'}</p>
    ${dayList.length ? `<ul class="rows">${dayList.slice(0, 8).map((c) => critiqueRow(c)).join('')}</ul>` : '<p class="empty">Današnji dodatak još nema stavki.</p>'}
  </section>

  <section class="wrap section">
    <div class="section-head"><h2>Izvori koje čitamo</h2><a href="izvori/">Svi izvori →</a></div>
    <div class="sources">${Object.entries(SOURCE_NAMES).map(([id, name]) => `<a href="izvori/${id}/"><b>${esc(name)}</b><span>${statsFor(critiques.filter((c) => c.source === id)).total} osvrta</span></a>`).join('')}</div>
  </section>`,
  graph: homeGraph
}));

/* kritike — popis */
page('kritike', layout({
  title: `Sve kritike | ${BRAND}`,
  description: `Kritički osvrti na poslovne tekstove Lidera, Jutarnjeg lista, Poslovnog dnevnika i Forbesa. ${critiques.length} osvrta u arhivi.`,
  canonical: 'kritike/',
  active: 'kritike',
  root: '../',
  content: `<section class="wrap page-head">
    <p class="kicker">Arhiva</p>
    <h1>Sve kritike</h1>
    <p class="lead">${critiques.length} osvrta na način izvještavanja. Svaki vodi na izvornik i navodi što treba provjeriti.</p>
  </section>
  <section class="wrap section">
    ${critiques.length ? `<ul class="rows">${critiques.slice(0, 300).map((c) => critiqueRow(c, '../')).join('')}</ul>` : '<p class="empty">Nema objavljenih kritika.</p>'}
    ${critiques.length > 300 ? '<p class="note">Prikazano 300 najnovijih; starije pretražite po tjednima u arhivi tjedna.</p>' : ''}
  </section>`,
  graph: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url: abs('kritike/'),
    name: `Sve kritike | ${BRAND}`,
    inLanguage: 'hr-HR'
  }
}));

/* pojedinačna kritika */
for (const c of critiques) {
  const root = '../../';
  const week = weekKey(`${c.date}T12:00:00Z`);
  const why = THEME_WHY[c.theme] || THEME_WHY.poslovanje;
  const quoteBlock = c.summary
    ? `<blockquote class="quote"><p>„${esc(c.summary)}“</p><footer>Sažetak izvornika — <a href="${esc(c.url)}" target="_blank" rel="noopener external">${esc(c.sourceName)}</a></footer></blockquote>`
    : `<p class="note">Uz ovaj tekst nije bio dostupan sažetak u feedu. Osvrt se zato odnosi samo na naslov i na pitanja koja naslov ostavlja otvorenima; tvrdnje iz članka nisu preuzete.</p>`;

  page(`kritike/${c.slug}`, layout({
    title: `Kritički osvrt: ${c.title} | ${BRAND}`,
    description: `Kritički osvrt na tekst „${c.title}“ (${c.sourceName}). Što naslov tvrdi, što sažetak otkriva i što treba provjeriti prije zaključka.`,
    canonical: `kritike/${c.slug}/`,
    active: 'kritike',
    root,
    type: 'news',
    published: `${c.date}T08:00:00+02:00`,
    modified: c.addedAt,
    section: c.themeLabel,
    tags: themeTags(c),
    content: `<article class="wrap article">
      <nav class="crumbs" aria-label="Putanja"><a href="${root}">Naslovnica</a><span>/</span><a href="${root}kritike/">Kritike</a><span>/</span><span>${esc(c.sourceName)}</span></nav>
      <p class="kicker">${esc(c.sourceName)} · ${esc(c.themeLabel)}</p>
      <h1>Kritički osvrt: ${esc(c.title)}</h1>
      <p class="dek">Osvrt na način izvještavanja, ne na istinitost tvrdnji. Izvornik je povezan i nije preuzet u cjelini.</p>
      <div class="byline"><span class="badge badge--sm">Automatski osvrt</span><time datetime="${c.date}">${hrDate(`${c.date}T12:00:00Z`)}</time><span>·</span><a href="${root}tjednik/${week}/">Tjedna promjena ${esc(week)}</a></div>

      <h2>Što tekst tvrdi</h2>
      <p>Naslov izvornika: <strong><a href="${esc(c.url)}" target="_blank" rel="noopener external">${esc(c.title)}</a></strong>. ${c.hasNumber ? 'Naslov sadrži brojku, što odmah otvara pitanje njezina referentnog razdoblja i osnovice.' : 'Naslov ne sadrži brojku, pa je prvo pitanje koji se konkretni podatak nalazi u tekstu.'}</p>

      <h2>Što sažetak otkriva</h2>
      ${quoteBlock}
      <p>Sažetak je najava, ne dokaz. Ostatak teksta može sadržavati kontekst koji sažetak ispušta — zato ovaj osvrt ne zaključuje o kvaliteti članka, nego postavlja pitanja koja čitatelj može provjeriti u izvorniku.</p>

      <h2>Kritička provjera</h2>
      <ol class="checks">${c.checks.map((k) => `<li><b>${esc(k.label)}.</b> ${esc(k.q)}</li>`).join('')}</ol>

      <h2>Zašto je to važno</h2>
      <p>${why}</p>

      <h2>Što ovaj osvrt ne tvrdi</h2>
      <p>Ovo nije provjera istinitosti izvornog teksta i nije tvrdnja da su u njemu navedeni podaci netočni. Osvrt je sastavljen automatski iz naslova, sažetka i metapodataka izvora. Ako izvornik sadrži ispravak ili dopunu, ona ostaje na izvorniku. Ispravci ovog osvrta objavljuju se na stranici <a href="${root}metodologija/">Metodologija</a>.</p>

      <div class="origin">
        <div><span>Izvornik</span><a href="${esc(c.url)}" target="_blank" rel="noopener external">${esc(c.sourceName)} ↗</a></div>
        <div><span>Rubrika</span><a href="${root}izvori/${c.source}">${esc(c.sourceName)}</a></div>
        <div><span>Tema</span><a href="${root}kritike/">${esc(c.themeLabel)}</a></div>
      </div>

      <div class="share">Podijeli: <a href="https://x.com/intent/tweet?text=${encodeURIComponent(`Kritički osvrt: ${c.title}`)}&url=${encodeURIComponent(abs(`kritike/${c.slug}/`))}" target="_blank" rel="noopener">X</a> · <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(abs(`kritike/${c.slug}/`))}" target="_blank" rel="noopener">LinkedIn</a></div>
    </article>`,
    graph: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': abs('#izdavac'), name: PUBLISHER, url: 'https://gnk-asg.hr/' },
        {
          '@type': 'NewsArticle',
          '@id': abs(`kritike/${c.slug}/#clanak`),
          headline: `Kritički osvrt: ${c.title}`,
          description: `Kritički osvrt na tekst „${c.title}“ (${c.sourceName}).`,
          url: abs(`kritike/${c.slug}/`),
          datePublished: `${c.date}T08:00:00+02:00`,
          dateModified: c.addedAt,
          inLanguage: 'hr-HR',
          articleSection: c.themeLabel,
          author: { '@type': 'Organization', name: BRAND, url: BASE },
          publisher: { '@id': abs('#izdavac') },
          isBasedOn: c.url,
          isAccessibleForFree: true
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Naslovnica', item: BASE },
            { '@type': 'ListItem', position: 2, name: 'Kritike', item: abs('kritike/') },
            { '@type': 'ListItem', position: 3, name: c.title, item: abs(`kritike/${c.slug}/`) }
          ]
        }
      ]
    }
  }));
}

/* izvori */
page('izvori', layout({
  title: `Izvori: Lider, Jutarnji list, Poslovni dnevnik, Forbes | ${BRAND}`,
  description: 'Četiri poslovna izvora koje tjednik prati. Za svaki tekst objavljuje se kritički osvrt s poveznicom na izvornik.',
  canonical: 'izvori/',
  active: 'izvori',
  root: '../',
  content: `<section class="wrap page-head">
    <p class="kicker">Transparentnost</p>
    <h1>Izvori koje čitamo</h1>
    <p class="lead">Tjednik ne zamjenjuje izvore. On ih čita, povezuje i pita što u tekstu nedostaje. Svaki osvrt vodi na izvornik.</p>
  </section>
  <section class="wrap section">
    <div class="grid">${Object.entries(SOURCE_NAMES).map(([id, name]) => {
      const list = critiques.filter((c) => c.source === id);
      return `<article class="card"><div class="card-meta"><span class="src">${esc(name)}</span><span>${list.length} osvrta</span></div><h3><a href="${id}/">${esc(name)}</a></h3><p>Kritički osvrti na tekstove iz izvora ${esc(name)}.</p><div class="card-foot"><a href="${id}/">Otvori izvor →</a></div></article>`;
    }).join('')}</div>
  </section>`,
  graph: { '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs('izvori/'), name: 'Izvori', inLanguage: 'hr-HR' }
}));

for (const [id, name] of Object.entries(SOURCE_NAMES)) {
  const list = critiques.filter((c) => c.source === id);
  page(`izvori/${id}`, layout({
    title: `${name} — kritički osvrti | ${BRAND}`,
    description: `Kritički osvrti na poslovne tekstove iz izvora ${name}. ${list.length} osvrta, svaki s poveznicom na izvornik.`,
    canonical: `izvori/${id}/`,
    active: 'izvori',
    root: '../../',
    content: `<section class="wrap page-head">
      <p class="kicker">Izvor</p>
      <h1>${esc(name)}</h1>
      <p class="lead">${list.length} kritičkih osvrta. Osvrti se odnose na način izvještavanja, a izvornici su povezani.</p>
    </section>
    <section class="wrap section">${list.length ? `<ul class="rows">${list.slice(0, 200).map((c) => critiqueRow(c, '../../')).join('')}</ul>` : '<p class="empty">Još nema osvrta iz ovog izvora.</p>'}</section>`,
    graph: { '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs(`izvori/${id}/`), name: `Kritike — ${name}`, inLanguage: 'hr-HR' }
  }));
}

/* tjednik — arhiva */
const weeks = [...byWeek.keys()].sort().reverse();
page('tjednik', layout({
  title: `Tjedna promjena — arhiva | ${BRAND}`,
  description: 'Tjedne promjene u poslovnom izvještavanju: broj osvrta, dominante teme i udio naslova s brojkom, uz usporedbu s prethodnim tjednom.',
  canonical: 'tjednik/',
  active: 'tjednik',
  root: '../',
  content: `<section class="wrap page-head">
    <p class="kicker">Arhiva</p>
    <h1>Tjedna promjena</h1>
    <p class="lead">Jednom tjedno uspoređujemo što se promijenilo u izvještavanju: koliko je tekstova obrađeno, koje su teme dominirale i koliki je udio naslova s brojkom. Sve je izračunato iz naše arhive osvrta.</p>
  </section>
  <section class="wrap section">
    <div class="weeks">${weeks.map((w) => {
      const s = statsFor(byWeek.get(w));
      return `<a class="week" href="${w}/"><b>${esc(w)}</b><span>${weekRangeLabel(w)}</span><span>${s.total} osvrta · ${esc(s.topThemes[0]?.[0] || '—')}</span></a>`;
    }).join('') || '<p class="empty">Nema tjedana u arhivi.</p>'}</div>
  </section>`,
  graph: { '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs('tjednik/'), name: 'Tjedna promjena', inLanguage: 'hr-HR' }
}));

for (const w of weeks) {
  const list = byWeek.get(w).slice().sort((a, b) => a.date.localeCompare(b.date));
  const s = statsFor(list);
  const prev = prevWeekKey(w);
  const prevS = statsFor(byWeek.get(prev) || []);
  const root = '../../';
  const days = [...new Set(list.map((c) => c.date))];
  const delta = s.total - prevS.total;

  page(`tjednik/${w}`, layout({
    title: `Tjedna promjena ${w} (${weekRangeLabel(w)}) | ${BRAND}`,
    description: `Tjedna promjena ${w}: ${s.total} kritičkih osvrta, dominantna tema ${s.topThemes[0]?.[0] || '—'}, ${s.numericShare}% naslova s brojkom. Usporedba s tjednom ${prev}.`,
    canonical: `tjednik/${w}/`,
    active: 'tjednik',
    root,
    content: `<section class="wrap page-head">
      <p class="kicker">Tjedna promjena · ${esc(w)}</p>
      <h1>${weekRangeLabel(w)}</h1>
      <p class="lead">${s.total} obrađenih poslovnih tekstova. U prethodnom tjednu ${prevS.total}. ${delta === 0 ? 'Broj je isti.' : delta > 0 ? `To je ${delta} više.` : `To je ${Math.abs(delta)} manje.`}</p>
    </section>

    <section class="wrap section">
      ${statsStrip(s)}
      <div class="two-col">
        <div>
          <h2>Što se promijenilo</h2>
          <p>Dominantna tema ovog tjedna je <strong>${esc(s.topThemes[0]?.[0] || '—')}</strong>${s.topThemes[0] ? ` (${s.topThemes[0][1]} osvrta)` : ''}; prethodni tjedan završio je s temom <strong>${esc(prevS.topThemes[0]?.[0] || '—')}</strong>. Udio naslova koji sadrže brojku je ${s.numericShare}%${s.numericShare === prevS.numericShare ? ' — nepromijenjen' : s.numericShare > prevS.numericShare ? ` — više nego ${prevS.numericShare}% prošli tjedan` : ` — manje nego ${prevS.numericShare}% prošli tjedan`}.</p>
          <p>Po izvorima, najviše osvrta dolazi iz: ${Object.entries(s.perSource).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${esc(SOURCE_NAMES[id])} (${n})`).join(', ') || '—'}.</p>
          <p class="note">„Promjena“ je ovdje promjena u našem uzorku izvještavanja, ne tvrdnja o stanju gospodarstva. Uzorak čine tekstovi koje su izvori objavili i koje je stroj obradio u tom tjednu.</p>
        </div>
        <div>
          <h3>Po izvoru</h3>
          ${sourceTable(s, root)}
          <h3>Teme</h3>
          <ul class="bars">${s.topThemes.slice(0, 6).map(([t, n]) => `<li><span>${esc(t)}</span><b style="--w:${Math.round((n / Math.max(1, s.total)) * 100)}%"></b><i>${n}</i></li>`).join('') || '<li class="empty">Bez tema.</li>'}</ul>
        </div>
      </div>
    </section>

    <section class="wrap section">
      <div class="section-head"><h2>Svi osvrti u tjednu</h2><span>${list.length}</span></div>
      ${days.map((d) => `<div class="daygroup"><h3>${hrDate(`${d}T12:00:00Z`)} <a href="${root}dodaci/${d}/">dnevni dodatak →</a></h3><ul class="rows">${byWeek.get(w).filter((c) => c.date === d).map((c) => critiqueRow(c, root)).join('')}</ul></div>`).join('')}
    </section>`,
    graph: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      url: abs(`tjednik/${w}/`),
      name: `Tjedna promjena ${w}`,
      description: `Tjedna promjena ${w}: ${s.total} kritičkih osvrta.`,
      inLanguage: 'hr-HR'
    }
  }));
}

/* dnevni dodaci */
const days = [...byDate.keys()].sort().reverse();
page('dodaci', layout({
  title: `Dnevni dodaci | ${BRAND}`,
  description: 'Dnevni dodaci: svi kritički osvrti jednog dana, po izvorima i temama. Novi dodatak svakoga dana.',
  canonical: 'dodaci/',
  active: 'dodaci',
  root: '../',
  content: `<section class="wrap page-head">
    <p class="kicker">Arhiva</p>
    <h1>Dnevni dodaci</h1>
    <p class="lead">Svaki dan jedan dodatak: što su izvori objavili, koje su teme dominirale i koji su tekstovi dobili kritički osvrt.</p>
  </section>
  <section class="wrap section">
    <div class="weeks">${days.map((d) => {
      const s = statsFor(byDate.get(d));
      return `<a class="week" href="${d}/"><b>${hrDate(`${d}T12:00:00Z`)}</b><span>${s.total} osvrta</span><span>${esc(s.topThemes.slice(0, 2).map(([t, n]) => `${t} (${n})`).join(' · ') || '—')}</span></a>`;
    }).join('') || '<p class="empty">Nema dnevnih dodataka.</p>'}</div>
  </section>`,
  graph: { '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs('dodaci/'), name: 'Dnevni dodaci', inLanguage: 'hr-HR' }
}));

for (const d of days) {
  const list = byDate.get(d);
  const s = statsFor(list);
  const root = '../../';
  page(`dodaci/${d}`, layout({
    title: `Dnevni dodatak ${hrDate(`${d}T12:00:00Z`)} | ${BRAND}`,
    description: `Dnevni dodatak za ${hrDate(`${d}T12:00:00Z`)}: ${s.total} kritičkih osvrta na poslovne tekstove. Teme: ${s.topThemes.slice(0, 3).map(([t, n]) => `${t} (${n})`).join(', ') || '—'}.`,
    canonical: `dodaci/${d}/`,
    active: 'dodaci',
    root,
    content: `<section class="wrap page-head">
      <p class="kicker">Dnevni dodatak</p>
      <h1>${hrDate(`${d}T12:00:00Z`)}</h1>
      <p class="lead">${s.total} kritičkih osvrta iz ${Object.values(s.perSource).filter(Boolean).length} izvora. ${s.numericShare}% naslova sadrži brojku.</p>
    </section>
    <section class="wrap section">
      ${statsStrip(s)}
      <p class="note">Dodatak je sastavljen automatski iz izdanja toga dana. Redoslijed prati izvore, a ne uredničku procjenu važnosti.</p>
      ${Object.entries(SOURCE_NAMES).map(([id, name]) => {
        const sub = list.filter((c) => c.source === id);
        if (!sub.length) return '';
        return `<div class="daygroup"><h2>${esc(name)} <span class="count">${sub.length}</span></h2><ul class="rows">${sub.map((c) => critiqueRow(c, root)).join('')}</ul></div>`;
      }).join('')}
      <p class="more"><a href="${root}tjednik/${weekKey(`${d}T12:00:00Z`)}/">Tjedna promjena ovog tjedna →</a></p>
    </section>`,
    graph: { '@context': 'https://schema.org', '@type': 'CollectionPage', url: abs(`dodaci/${d}/`), name: `Dnevni dodatak ${d}`, inLanguage: 'hr-HR' }
  }));
}

/* metodologija */
page('metodologija', layout({
  title: `Metodologija | ${BRAND}`,
  description: 'Kako tjednik bira izvore, što kritički osvrt jest i što nije, kako se računa tjedna promjena i gdje se prijavljuju ispravci.',
  canonical: 'metodologija/',
  active: 'metodologija',
  root: '../',
  content: `<section class="wrap page-head">
    <p class="kicker">Metodologija i pravila</p>
    <h1>Kako nastaje ovaj tjednik</h1>
    <p class="lead">Bez prepisivanja, bez izmišljenih brojki i bez pripisivanja tuđih tvrdnji tjedniku.</p>
  </section>
  <section class="wrap article">
    <h2>1. Izvori</h2>
    <p>Tjednik čita javne popise i feedove četiriju izvora: <strong>Lider</strong> (lidermedia.hr), <strong>Jutarnji list</strong> (rubrika Novac), <strong>Poslovni dnevnik</strong> (poslovni.hr) i <strong>Forbes</strong> (business feed). Iz svakog izvora dnevno se obrađuje ograničen broj najnovijih tekstova; ograničenje je navedeno u <code>engine/sources.json</code> i ne skriva se.</p>

    <h2>2. Što je kritički osvrt</h2>
    <p>Osvrt je analiza <em>načina izvještavanja</em>: što naslov tvrdi, što sažetak otkriva, koje podatke treba provjeriti i zašto je to važno. Osvrt ne utvrđuje da je izvornik netočan. Ako u izvorniku postoji ispravak, on ostaje na izvorniku.</p>

    <h2>3. Što tjednik ne radi</h2>
    <ul>
      <li>Ne prenosi cjelovite tekstove izvora i ne zamjenjuje čitanje izvornika.</li>
      <li>Ne izmišlja brojke, citate ni izvore. Jedini podaci preuzeti iz izvornika su naslov, sažetak, kategorije, datum i poveznica.</li>
      <li>Ne pripisuje autorsko djelo izvora tjedniku, niti tjednik svoje osvrte autorima izvora.</li>
      <li>Ne tvrdi da je osvrt urednički pregledan pojedinačno — svaki nosi oznaku „Automatski osvrt“.</li>
    </ul>

    <h2>4. Tjedna promjena</h2>
    <p>„Tjedna promjena“ je izračun iz naše arhive: broj osvrta po izvoru, dominantne teme, udio naslova koji sadrže brojku i usporedba s prethodnim ISO tjednom. To je promjena u <em>uzorku izvještavanja</em>, ne mjera stanja gospodarstva.</p>

    <h2>5. Dnevni dodatak</h2>
    <p>Dnevni dodatak okuplja sve osvrte jednog dana i pokazuje koje su teme dominirale. Redoslijed prati izvore, ne uredničku procjenu važnosti.</p>

    <h2>6. Ispravci i kontakt</h2>
    <p>Ako je osvrt pogrešno prenio naslov, poveznicu ili podatak, javite na <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>. Ispravak se objavljuje na ovoj stranici i u zahvaćenom osvrtu, s datumom.</p>

    <h2>7. Tehnička sljedivost</h2>
    <p>Svaki osvrt ima vlastiti JSON zapis u repozitoriju, poveznicu na izvornik i datum. Dnevni stroj radi iz javnih izvora i zapisuje stanje obrade kako se isti tekst ne bi obrađivao više puta. Puni izvorni kod generatora je u <code>apps/tjednik/</code>.</p>

    <p class="note">Ova stranica opisuje pravila rada. Ne predstavlja pravni savjet ni garanciju dostupnosti izvora.</p>
  </section>`,
  graph: { '@context': 'https://schema.org', '@type': 'WebPage', url: abs('metodologija/'), name: 'Metodologija', inLanguage: 'hr-HR' }
}));

/* 404 */
writeFileSync(join(OUT, '404.html'), layout({
  title: `Stranica nije pronađena | ${BRAND}`,
  description: 'Tražena stranica ne postoji. Vratite se na naslovnicu ili otvorite arhivu kritika.',
  canonical: '404.html',
  root: '/',
  content: `<section class="wrap page-head"><p class="kicker">404</p><h1>Stranica nije pronađena</h1><p class="lead">Možda je poveznica stara ili je tekst premješten. Arhiva je otvorena.</p><p><a class="btn" href="/">Naslovnica</a> <a class="btn btn--ghost" href="/kritike/">Sve kritike</a></p></section>`
}), 'utf8');

/* feedovi */
const feedItems = critiques.slice(0, 50);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(BRAND)}</title>
<link>${BASE}</link>
<description>${esc(DESCRIPTION)}</description>
<language>hr</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link href="${abs('feed.xml')}" rel="self" type="application/rss+xml"/>
${feedItems.map((c) => `<item>
  <title>${esc(`Kritički osvrt: ${c.title}`)}</title>
  <link>${abs(`kritike/${c.slug}/`)}</link>
  <guid isPermaLink="true">${abs(`kritike/${c.slug}/`)}</guid>
  <pubDate>${new Date(`${c.date}T08:00:00+02:00`).toUTCString()}</pubDate>
  <dc:creator>${esc(BRAND)}</dc:creator>
  <category>${esc(c.sourceName)}</category>
  <description>${esc(c.summary || `Osvrt na način izvještavanja: ${c.title}`)}</description>
</item>`).join('\n')}
</channel>
</rss>`;
writeFileSync(join(OUT, 'feed.xml'), rss, 'utf8');

writeFileSync(join(OUT, 'feed.json'), JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1',
  title: BRAND,
  home_page_url: BASE,
  feed_url: abs('feed.json'),
  description: DESCRIPTION,
  language: 'hr-HR',
  _tjednik: {
    publisher: PUBLISHER,
    editorialStatus: 'auto-critique',
    disclosure: 'Kritike načina izvještavanja; izvornici su povezani, tekstovi nisu preuzeti.',
    sources: SOURCE_NAMES
  },
  items: feedItems.map((c) => ({
    id: abs(`kritike/${c.slug}/`),
    url: abs(`kritike/${c.slug}/`),
    title: `Kritički osvrt: ${c.title}`,
    summary: c.summary || `Osvrt na način izvještavanja: ${c.title}`,
    date_published: `${c.date}T08:00:00+02:00`,
    authors: [{ name: BRAND, url: BASE }],
    tags: [c.sourceName, c.themeLabel, 'kritika'],
    _tjednik: { source: c.source, sourceUrl: c.url, theme: c.themeLabel, status: 'auto-critique' }
  }))
}, null, 2) + '\n', 'utf8');

/* sitemap */
const urls = [
  { loc: BASE, priority: '1.0' },
  { loc: abs('kritike/'), priority: '0.9' },
  { loc: abs('tjednik/'), priority: '0.8' },
  { loc: abs('dodaci/'), priority: '0.8' },
  { loc: abs('izvori/'), priority: '0.6' },
  { loc: abs('metodologija/'), priority: '0.4' },
  ...Object.keys(SOURCE_NAMES).map((id) => ({ loc: abs(`izvori/${id}/`), priority: '0.5' })),
  ...weeks.map((w) => ({ loc: abs(`tjednik/${w}/`), priority: '0.7', lastmod: `${w}` })),
  ...days.map((d) => ({ loc: abs(`dodaci/${d}/`), priority: '0.7', lastmod: d })),
  ...critiques.map((c) => ({ loc: abs(`kritike/${c.slug}/`), priority: '0.8', lastmod: c.date }))
];
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`, 'utf8');

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /
Sitemap: ${abs('sitemap.xml')}
`, 'utf8');

writeFileSync(join(OUT, 'llms.txt'), `# ${BRAND}

> ${DESCRIPTION}

## Što je ovo
Kritički tjednik o poslovnom izvještavanju. Za svaki obrađeni tekst iz Lidera, Jutarnjeg lista,
Poslovnog dnevnika i Forbesa objavljuje se zasebna stranica s kritičkim osvrtom i poveznicom na izvornik.

## Što nije
Ovo nije arhiva izvornih tekstova i ne prenosi cjelovite članke. Kritika se odnosi na način
izvještavanja; tvrdnje izvornika nisu tvrdnje tjednika.

## Stranice
- ${BASE}
- ${abs('kritike/')}
- ${abs('tjednik/')}
- ${abs('dodaci/')}
- ${abs('izvori/')}
- ${abs('metodologija/')}

## Feed
- ${abs('feed.json')}
- ${abs('feed.xml')}

## Kontakt
${CONTACT}
`, 'utf8');

/* assets */
const ASSETS = join(SRC, 'assets');
const OUT_ASSETS = join(OUT, 'assets');
mkdirSync(OUT_ASSETS, { recursive: true });
for (const f of existsSync(ASSETS) ? readdirSync(ASSETS) : []) {
  const from = join(ASSETS, f);
  const to = join(OUT_ASSETS, f);
  if (f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.css') || f.endsWith('.webp') || f.endsWith('.jpg')) copyFileSync(from, to);
}

console.log(`Tjednik: ${critiques.length} osvrta, ${weeks.length} tjedana, ${days.length} dodataka → ${OUT}`);
console.log(`Base: ${BASE}`);
