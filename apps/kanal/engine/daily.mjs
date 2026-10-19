#!/usr/bin/env node
/**
 * GNK ASG KANAL — dnevni stroj.
 *
 * Svaki dan sastavlja točno N (default 10) objava iz strukturiranih, provjerljivih
 * izvora podataka i sprema ih u apps/kanal/src/articles.
 *
 * Sastav izdanja (10):
 *   1 ×  pool.json        — cjeloviti tekst iz uredničkog reda (ljudski pripremljen)
 *   2 ×  rokovi           — odbrojavanje do stvarnih pravnih rokova (AI Act, GDPR)
 *   3 ×  brojke           — objavljene financijske činjenice + tumačenje
 *   2 ×  pojmovi          — pojmovnik (definicije bez izmišljenih podataka)
 *   1 ×  pitanja          — pitanja čitatelja
 *   1 ×  provjere         — provjera tvrdnje (što je provjerljivo, a što nije)
 *
 * Pokretanje:
 *   node apps/kanal/engine/daily.mjs                 # današnje izdanje
 *   node apps/kanal/engine/daily.mjs --date 2026-10-20 --force
 *   node apps/kanal/engine/daily.mjs --count 10 --dry-run
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const KANAL = join(HERE, '..');
const SRC = join(KANAL, 'src');
const ARTICLES = join(SRC, 'articles');
const STATE_PATH = join(HERE, 'state.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(name);

const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJSON = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');

const todayZagreb = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const DATE = arg('--date', todayZagreb());
const COUNT = Number(arg('--count', '10'));
const WINDOW = Number(arg('--window', '21'));
const FORCE = flag('--force');
const DRY = flag('--dry-run');

const site = readJSON(join(SRC, 'site.json'));
const terms = readJSON(join(HERE, 'data', 'terms.json')).terms;
const figures = readJSON(join(HERE, 'data', 'figures.json')).figures;
const deadlines = readJSON(join(HERE, 'data', 'deadlines.json')).deadlines;
const qa = readJSON(join(HERE, 'data', 'qa.json')).qa;
const poolPath = join(HERE, 'pool.json');
const pool = existsSync(poolPath) ? readJSON(poolPath).items : [];
const state = existsSync(STATE_PATH) ? readJSON(STATE_PATH) : { published: {}, days: {} };

/* ---------- pomoćnici ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hr = (iso) => new Date(`${iso}T09:00:00+02:00`).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const pad = (n) => String(n).padStart(2, '0');

const usedToday = new Set(state.days[DATE] || []);
const inPlan = new Set();
const lastUsed = state.lastUsed || {};
/* Ista stavka se ne ponavlja unutar WINDOW dana; nakon toga se vraća u rotaciju
   (dnevni desk je kontinuirani zapis, ne arhiv jedinstvenih tekstova). */
const recent = (id) => {
  const d = lastUsed[id];
  return Boolean(d) && daysBetween(d, DATE) < WINDOW;
};
const already = (id) => usedToday.has(id) || inPlan.has(id) || recent(id);
const markPlan = (id) => inPlan.add(id);

/* Idempotencija: jedno izdanje po datumu. Ponovni pokret bez --force ne piše ništa. */
if (!DRY && !FORCE && usedToday.size >= COUNT) {
  console.log(`[preskočeno] izdanje za ${DATE} već ima ${usedToday.size} objava. Za ponovno sastavljanje koristi --force.`);
  process.exit(0);
}

/* --force je determinističko ponovno sastavljanje: stari fajlovi i zapisi za taj
   datum se brišu prije nove kompozicije, da ne ostanu siročići u arhivi. */
if (FORCE && !DRY) {
  for (const f of readdirSync(ARTICLES)) {
    if (f.startsWith(`desk-dnevnik-${DATE}-`)) unlinkSync(join(ARTICLES, f));
  }
  delete state.days[DATE];
  usedToday.clear();
  for (const [k, d] of Object.entries(state.lastUsed || {})) if (d === DATE) delete state.lastUsed[k];
}

const pick = (list, n, idOf) => {
  const out = [];
  for (const item of list) {
    if (out.length >= n) break;
    if (already(idOf(item))) continue;
    out.push(item);
  }
  return out;
};

/* rotacija po danu da se isti pojmovi ne ponavljaju uzastopno */
const dayIndex = Math.floor(Date.parse(`${DATE}T00:00:00Z`) / 86400000);
const rotate = (list) => {
  if (!list.length) return list;
  const k = dayIndex % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
};

/* ---------- generatori ---------- */
const footerNote = (label) =>
  `<p class="note">Ovo je ${label} izdanja <strong>Dnevnog deska</strong>. Sastavljeno automatski iz strukturiranih podataka i objavljenih izvora; urednički pregled cjelovitih analiza provodi glavni urednik. Status provjere naveden je u zaglavlju teksta, a izvori ispod teksta.</p>`;

function deadlineItem(d) {
  const delta = daysBetween(DATE, d.date);
  const when = delta > 0 ? `do roka je ${delta} ${delta === 1 ? 'dan' : delta < 5 ? 'dana' : 'dana'}` : delta === 0 ? 'rok je danas' : `rok je prošao prije ${Math.abs(delta)} dana`;
  const body = `<p><strong>${esc(d.label)}</strong> — ${esc(when)}. Referentni datum je ${hr(d.date)}.</p>${d.body}
<p>Praktična provjera za tvrtku: postoji li zapis o tome koja je osoba odgovorna za ovaj rok, koja je dokumentacija pripremljena i gdje se čuva dokaz o pregledu? Ako odgovor nije zapisan, rok je informacija, a ne obveza.</p>
${footerNote('dnevna karta rokova')}`;
  return {
    slug: `dnevnik-${DATE}-rok-${d.id}`,
    section: 'regulacija',
    kind: 'desk',
    title: `${d.label}: ${delta > 0 ? `${delta} dana do roka` : delta === 0 ? 'rok je danas' : `rok je prošao`}`,
    shortTitle: d.label,
    seoTitle: `${d.label} — ${hr(d.date)} | Dnevni desk`,
    dek: `Odbrojavanje i praktična provjera: ${d.label.toLowerCase()}, referentni datum ${hr(d.date)}.`,
    description: `Rok ${d.label} (${hr(d.date)}). Što treba biti dokumentirano i kako provjeriti spremnost.`,
    date: DATE,
    updated: DATE,
    priority: 1,
    og: 'assets/og/naslovnica.png',
    imageAlt: `${d.label} — dnevni desk`,
    imageCaption: 'Ilustracija: GNK ASG KANAL · Dnevni desk',
    tags: [...(d.tags || []), 'rokovi', 'dnevni desk'],
    keyFacts: [
      `Referentni datum: <strong>${hr(d.date)}</strong>`,
      delta >= 0 ? `Do roka: <strong>${delta} dana</strong>` : `Rok prošao prije <strong>${Math.abs(delta)} dana</strong>`,
      'Izvor: službeni tekst uredbe (EUR-Lex)'
    ],
    body,
    sources: [{ label: d.source, url: d.source.startsWith('http') ? d.source : undefined }]
  };
}

function figureItem(f) {
  const body = `<p><strong>${esc(f.value)}</strong> — ${esc(f.label)}.</p>${f.body}
<p>Zašto ovo danas ponavljamo: brojka bez konteksta lako postane naslov, a naslov bez izvora lako postane mit. Zato uz svaku brojku na ovom kanalu stoji razdoblje, izvor i ono što se iz nje ne može zaključiti.</p>
${footerNote('dnevna brojka')}`;
  return {
    slug: `dnevnik-${DATE}-brojka-${f.id}`,
    section: 'analiza',
    kind: 'desk',
    title: `${f.value} — ${f.label}`,
    shortTitle: f.label,
    seoTitle: `${f.value} (${f.label}) — dnevna brojka`,
    dek: `Brojka dana uz izvor i ograničenje tumačenja: ${f.label}.`,
    description: `Brojka ${f.value} — ${f.label}. Izvor: ${f.source}`,
    date: DATE,
    updated: DATE,
    priority: 1,
    og: 'assets/og/naslovnica.png',
    imageAlt: `${f.value} — ${f.label}`,
    imageCaption: 'Ilustracija: GNK ASG KANAL · Dnevni desk',
    tags: [...(f.tags || []), 'brojka dana', 'dnevni desk'],
    keyFacts: [`Vrijednost: <strong>${f.value}</strong>`, `Što mjeri: ${esc(f.label)}`, `Izvor: ${esc(f.source)}`],
    body,
    sources: [{ label: f.source, url: f.source.startsWith('http') ? f.source : undefined }]
  };
}

function termItem(t) {
  const body = `<p><strong>${esc(t.short)}</strong></p>${t.body}
<p>Pojam je dio pojmovnika kanala. Definicija je namjerno kratka i provjerljiva: ne objašnjava kako konkretna tvrtka posluje, nego što pojam znači u financijskom izvještaju ili u propisu.</p>
${footerNote('dnevni pojam')}`;
  return {
    slug: `dnevnik-${DATE}-pojam-${t.id}`,
    section: 'vodic',
    kind: 'desk',
    title: `Pojam dana: ${t.term}`,
    shortTitle: t.term,
    seoTitle: `${t.term} — što znači | Dnevni desk`,
    dek: t.short,
    description: `${t.term}: ${t.short}`,
    date: DATE,
    updated: DATE,
    priority: 1,
    og: 'assets/og/naslovnica.png',
    imageAlt: t.term,
    imageCaption: 'Ilustracija: GNK ASG KANAL · Dnevni desk',
    tags: [...(t.tags || []), 'pojmovnik', 'dnevni desk'],
    keyFacts: [`Pojam: <strong>${esc(t.term)}</strong>`, esc(t.short)],
    body,
    sources: [{ label: 'Pojmovnik GNK ASG KANALA' }]
  };
}

function qaItem(q) {
  const isClaim = q.kind === 'claim';
  const body = `<p class="note">${isClaim ? 'Provjera tvrdnje' : 'Pitanje čitatelja'}: ${esc(q.q)}</p>${q.body}
<p>${isClaim ? 'Zaključak provjere: tvrdnja se ne odbacuje ni potvrđuje u cjelini — razlikujemo provjerljive dijelove od interpretacije.' : 'Ako imate dodatno pitanje, pošaljite ga na adresu uredništva. Pitanja koja se ponavljaju ulaze u pojašnjenja.'}</p>
${footerNote(isClaim ? 'dnevna provjera tvrdnje' : 'dnevni odgovor na pitanje')}`;
  return {
    slug: `dnevnik-${DATE}-${isClaim ? 'provjera' : 'pitanje'}-${q.id}`,
    section: isClaim ? 'komentar' : 'pojasnjenje',
    kind: 'desk',
    title: isClaim ? `Provjera: ${q.q.replace(/^Tvrdnja:\s*/, '').replace(/^„|”$/g, '')}` : q.q,
    shortTitle: q.q.slice(0, 60),
    seoTitle: `${q.q.slice(0, 70)} | Dnevni desk`,
    dek: isClaim ? 'Što je u tvrdnji provjerljivo, a što je interpretacija.' : 'Kratak odgovor uredništva na pitanje koje se ponavlja.',
    description: q.q,
    date: DATE,
    updated: DATE,
    priority: 1,
    og: 'assets/og/naslovnica.png',
    imageAlt: q.q,
    imageCaption: 'Ilustracija: GNK ASG KANAL · Dnevni desk',
    tags: [...(q.tags || []), isClaim ? 'provjera tvrdnje' : 'pitanja', 'dnevni desk'],
    keyFacts: [esc(q.q)],
    body,
    sources: [{ label: q.source }]
  };
}

function poolItem(p) {
  const body = `${p.body}${footerNote('tekst iz uredničkog reda')}`;
  return {
    slug: `dnevnik-${DATE}-${p.id}`,
    section: p.section || 'analiza',
    kind: 'desk',
    title: p.title,
    shortTitle: p.shortTitle || p.title,
    seoTitle: p.seoTitle || `${p.title} | Dnevni desk`,
    dek: p.dek,
    description: p.dek,
    date: DATE,
    updated: DATE,
    priority: 2,
    og: 'assets/og/naslovnica.png',
    imageAlt: p.title,
    imageCaption: 'Ilustracija: GNK ASG KANAL · Dnevni desk',
    tags: [...(p.tags || []), 'dnevni desk'],
    keyFacts: p.keyFacts || [],
    body,
    sources: p.sources || []
  };
}

/* ---------- sastavljanje izdanja ---------- */
const deadlinePool = rotate([...deadlines].sort((a, b) => a.date.localeCompare(b.date)));
const figurePool = rotate(figures);
const termPool = rotate(terms);
const questionPool = rotate(qa.filter((q) => q.kind !== 'claim'));
const claimPool = rotate(qa.filter((q) => q.kind === 'claim'));
const poolPool = pool.filter((p) => !already(p.id));

const plan = [];
const push = (item, key) => { if (item && plan.length < COUNT) { plan.push(item); if (key) markPlan(key); } };

poolPool.slice(0, 1).forEach((p) => push(poolItem(p), p.id));
pick(deadlinePool, 2, (d) => `rok-${d.id}`).forEach((d) => push(deadlineItem(d), `rok-${d.id}`));
pick(figurePool, 3, (f) => `brojka-${f.id}`).forEach((f) => push(figureItem(f), `brojka-${f.id}`));
pick(termPool, 2, (t) => `pojam-${t.id}`).forEach((t) => push(termItem(t), `pojam-${t.id}`));
const qItem = questionPool.find((q) => !already(`pitanje-${q.id}`));
if (qItem) push(qaItem(qItem), `pitanje-${qItem.id}`);
const cItem = claimPool.find((q) => !already(`provjera-${q.id}`));
if (cItem) push(qaItem(cItem), `provjera-${cItem.id}`);

/* dopuna do COUNT iz pojmovnika ako nešto nedostaje */
if (plan.length < COUNT) {
  for (const t of termPool) {
    if (plan.length >= COUNT) break;
    if (already(`pojam-${t.id}`)) continue;
    push(termItem(t), `pojam-${t.id}`);
  }
}
/* krajnja dopuna: ponovno iskoristi pojmove uz oznaku serije (nikad prazno izdanje) */
let seriesFallback = 1;
while (plan.length < COUNT) {
  const t = termPool[(dayIndex + seriesFallback) % termPool.length];
  const item = termItem(t);
  item.slug = `dnevnik-${DATE}-pojam-${t.id}-${seriesFallback}`;
  item.title = `${item.title} (ponovljeno izdanje)`;
  item.dek = `${item.dek} Ponovljeno izdanje radi dnevnog kontinuiteta.`;
  plan.push(item);
  seriesFallback += 1;
  if (seriesFallback > 40) break;
}

/* ---------- pisanje ---------- */
mkdirSync(ARTICLES, { recursive: true });
for (const a of plan) {
  const target = join(ARTICLES, `desk-${a.slug}.json`);
  if (DRY) { console.log('[dry]', a.slug, '|', a.title); continue; }
  writeJSON(target, a);
}

if (!DRY) {
  state.lastUsed = state.lastUsed || {};
  for (const a of plan) {
    const key = a.slug.replace(`dnevnik-${DATE}-`, '').replace(/-[0-9]+$/, '');
    state.published[key] = state.published[key] || DATE;
    state.lastUsed[key] = DATE;
  }
  state.days[DATE] = plan.map((a) => a.slug.replace(`dnevnik-${DATE}-`, '').replace(/-[0-9]+$/, ''));
  state.lastRun = new Date().toISOString();
  writeJSON(STATE_PATH, state);
}

/* ---------- dnevnik index stranica ---------- */
function buildDnevnikPage() {
  const files = readdirSync(ARTICLES).filter((f) => f.startsWith('desk-dnevnik-'));
  const items = files.map((f) => readJSON(join(ARTICLES, f)))
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
  const byDate = new Map();
  for (const it of items) {
    if (!byDate.has(it.date)) byDate.set(it.date, []);
    byDate.get(it.date).push(it);
  }
  const groups = [...byDate.entries()].slice(0, 30).map(([date, list]) => {
    const lis = list.map((it) => `<li><h3><a href="../${it.slug}/">${esc(it.title)}</a></h3><p>${esc(it.dek)}</p></li>`).join('');
    return `<section class="dayblock"><h2>${hr(date)} <span class="count-pill">${list.length} objava</span></h2><ul class="daylist">${lis}</ul></section>`;
  }).join('');
  return {
    slug: 'dnevnik',
    title: 'Dnevni desk',
    seoTitle: 'Dnevni desk — 10 objava dnevno | GNK ASG KANAL',
    dek: 'Svaki dan deset kratkih, izvorno dokumentiranih objava: rokovi, brojke, pojmovi, pitanja i provjere tvrdnji. Izdanje se sastavlja automatski, a cjelovite analize prolaze urednički pregled.',
    description: 'Dnevni desk GNK ASG KANALA: deset dnevnih objava o rokovima, financijskim brojkama, pojmovima i provjerama tvrdnji. Svaka objava ima izvor i datum.',
    updated: DATE,
    og: 'assets/og/naslovnica.png',
    body: `<p class="lead-in">Dnevni desk je dnevno izdanje kanala: deset kratkih objava koje se sastavljaju iz strukturiranih podataka i objavljenih izvora. Namjena je kontinuitet — da svaki dan postoji provjerljiv zapis o rokovima, brojkama i pojmovima, bez izmišljenih vijesti.</p><p><strong>Što desk jest:</strong> strukturirani dnevni zapis s izvorom uz svaku tvrdnju. <strong>Što desk nije:</strong> zamjena za istraživačko novinarstvo ni za cjelovite analize koje prolaze urednički pregled.</p><div class="desk-days">${groups}</div>`,
    faq: [
      { q: 'Koliko se objava dnevno objavljuje?', a: 'Deset. Sastav je: jedan cjeloviti tekst iz uredničkog reda, dvije karte rokova, tri brojke, pojmovi, pitanje i provjera tvrdnje.' },
      { q: 'Objavljuje li se sve automatski?', a: 'Dnevni desk sastavlja se automatski iz strukturiranih podataka. Svaka objava nosi oznaku da je dio dnevnog deska; cjelovite analize prolaze urednički pregled i imaju zaseban status.' }
    ]
  };
}
if (!DRY) writeJSON(join(SRC, 'pages', 'dnevnik.json'), buildDnevnikPage());

/* ---------- izvještaj ---------- */
const report = {
  date: DATE,
  count: plan.length,
  generatedAt: new Date().toISOString(),
  status: 'auto-assembled',
  disclosure: 'Dnevni desk: objave sastavljene iz strukturiranih podataka i objavljenih izvora. Nisu urednički pregledane pojedinačno.',
  items: plan.map((a) => ({ slug: a.slug, title: a.title, section: a.section, words: String(a.body || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length }))
};
if (!DRY) writeJSON(join(HERE, 'last-run.json'), report);

if (!DRY) {
  console.log(`Dnevni desk ${DATE}: ${plan.length} objava`);
  for (const a of plan) console.log(`  • ${a.slug} — ${a.title}`);
  if (!flag('--no-build')) {
    execFileSync(process.execPath, [join(KANAL, 'build.mjs'), '--base', process.env.KANAL_BASE || 'https://gnk-asg-kanal.pages.dev/'], { stdio: 'inherit' });
  }
} else {
  console.log(`[dry-run] ${plan.length} objava za ${DATE}`);
}
