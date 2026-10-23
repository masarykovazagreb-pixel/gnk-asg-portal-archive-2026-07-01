/**
 * RAZMJENA VIJESTI — mreža koja jedna drugoj nosi naslove.
 *
 * Zašto ovako: svaki web mreže već piše vlastiti `feed.json` (JSON Feed 1.1).
 * Umjesto novog središnjeg servisa, razmjena čita te iste feedove s diska i na
 * svakoj stranici pokaže najsvježiji naslov svakog drugog weba — s imenom
 * izvora, datumom i izravnom vezom na izvornu domenu. Tako:
 *
 *   - svaki naslov ima jednog, provjerljivog izdavača (nema prepisivanja bez
 *     atribucije);
 *   - veza je prava, vanjska i stabilna (backlink na izvornik, bez redirecta);
 *   - razmjena radi i kad se doda novi web: dovoljno je da napiše feed.json;
 *   - ništa se ne izmišlja: ako feed nema stavku, web se preskače.
 *
 * Redoslijed gradnje u CI-ju je region → world → sites, pa se u istom danu
 * svaki web osvježi u najviše jednom krugu. Modul nikad ne pada zbog tuđeg
 * feeda: neispravan JSON se preskače.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DAYS_HR = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Ime izdanja bez ponavljanja imena kuće: „AKTUAL MEDIA KANAL JAKARTA“ je
   za čitatelja jednostavno „KANAL JAKARTA“, a „… — World edition“ ostaje
   kakvo jest. Tako popis razmjene izgleda kao popis izdanja, ne kao popis
   naslova feedova. */
const titleCase = (value) => value
  .toLowerCase()
  .replace(/(^|[\s·–-])([\p{L}])/gu, (whole, sep, letter) => sep + letter.toLocaleUpperCase('hr-HR'));

const cleanName = (title) => {
  let name = String(title || '').replace(/\s+[—-]\s+.*$/, '').trim();
  name = name.replace(/^AKTUAL MEDIA\s+/i, '');
  name = name.replace(/^(KANAL|CANAL|CHANNEL)\s+/i, '');
  /* Naslovi izdanja pišu se velikim slovima; u popisu razmjene čitaju se
     imenom izdanja, pa se vičući zapis smiruje. */
  if (name && name === name.toLocaleUpperCase('hr-HR')) name = titleCase(name);
  return name || 'AKTUAL MEDIA';
};

const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
};

const dateLabel = (iso, lang) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (lang === 'en') {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return `${date.getUTCDate()}. ${date.getUTCMonth() + 1}. ${date.getUTCFullYear()}.`;
};

/** Svi feedovi koje mreža ima na disku, s najsvježijom stavkom svakoga. */
export function collectFeeds(root) {
  const found = [];
  const push = (file) => {
    const feed = readJson(file);
    if (!feed || !Array.isArray(feed.items) || !feed.items.length) return;
    const first = feed.items[0];
    if (!first || !first.url || !first.title) return;
    const home = String(feed.home_page_url || '').replace(/\/$/, '');
    if (!home) return;
    found.push({
      name: cleanName(feed.title),
      home,
      lang: String(feed.language || 'hr').slice(0, 2),
      title: String(first.title),
      url: String(first.url),
      date: String(first.date_published || first.date_modified || ''),
      summary: String(first.summary || '').slice(0, 200)
    });
  };

  for (const [dir, depth] of [
    [join(root, 'apps', 'portal', 'kanal'), 1],
    [join(root, 'apps', 'world', 'site'), 2],
    [join(root, 'apps', 'sites', 'site'), 3]
  ]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const feed = join(dir, entry.name, 'feed.json');
      if (existsSync(feed)) push(feed);
    }
    void depth;
  }
  return found;
}

/** Najsvježiji naslovi drugih webova, bez vlastitog. */
export function pickExchange(root, { selfHome = '', limit = 6, skipPaths = [] } = {}) {
  const self = String(selfHome).replace(/\/$/, '');
  const seen = new Set();
  return collectFeeds(root)
    .filter((feed) => feed.home !== self)
    .filter((feed) => !skipPaths.some((part) => feed.url.includes(part)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    /* Isto izdanje može imati gradsko izdanje i svjetski portal; u popisu se
       pojavljuje jednom — s najsvježijim naslovom i vezom na taj web. */
    .filter((feed) => {
      const key = String(feed.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** HTML blok razmjene: naslov, kratko objašnjenje i popis s atribucijom. */
export function exchangeBlock({ root, lang = 'hr', selfHome = '', limit = 6, headingId = 'razmjena', skipPaths = [] } = {}) {
  const picks = pickExchange(root, { selfHome, limit, skipPaths });
  if (!picks.length) return '';
  const en = lang === 'en';
  const heading = en ? 'News exchange across the network' : 'Razmjena vijesti s drugih webova mreže';
  const lead = en
    ? 'The newest headline from each other AKTUAL MEDIA edition. Every link opens the original domain; the edition and date are always stated.'
    : 'Najsvježi naslov svakog drugog izdanja AKTUAL MEDIA. Svaka veza vodi na izvornu domenu, uz navedeno izdanje i datum.';
  const items = picks.map((pick) => `<li>
      <a href="${esc(pick.url)}" rel="external noopener">${esc(pick.title)}</a>
      <span class="am-x-src">${esc(pick.name)}${pick.date ? ` · <time datetime="${esc(pick.date)}">${esc(dateLabel(pick.date, lang))}</time>` : ''}</span>
    </li>`).join('\n    ');
  return `<section class="am-exchange" aria-labelledby="${esc(headingId)}">
  <h2 id="${esc(headingId)}">${esc(heading)}</h2>
  <p class="am-x-lead">${esc(lead)}</p>
  <ul class="am-x-list">
    ${items}
  </ul>
</section>`;
}

/** Strojno čitljiv zapis razmjene: isti popis koji stranica prikazuje. */
export function writeExchangeJson(dir, { root, selfHome = '', limit = 6 }) {
  const picks = pickExchange(root, { selfHome, limit: Math.max(limit, 12) });
  if (!picks.length) return;
  const payload = {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    note: 'News exchange of the AKTUAL MEDIA network. Every record links to the publisher that wrote it.',
    items: picks.map((pick) => ({
      edition: pick.name,
      home: pick.home,
      url: pick.url,
      title: pick.title,
      lang: pick.lang,
      published: pick.date
    }))
  };
  writeFileSync(join(dir, 'exchange.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

export const EXCHANGE_CSS = `
.am-exchange{max-width:var(--am-measure);margin:clamp(2.6rem,4vw,4.2rem) auto;padding:clamp(1.4rem,2.4vw,2rem);
  border:1px solid var(--am-line);border-radius:var(--am-radius);background:color-mix(in srgb,currentColor 3%,transparent);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.am-exchange h2{margin:0 0 .35em;font-size:clamp(1.15rem,1.6vw,1.5rem);letter-spacing:-.01em}
.am-x-lead{margin:0 0 1.1em;color:var(--am-muted);font-size:.92rem;line-height:1.55;max-width:62ch}
.am-x-list{list-style:none;margin:0;padding:0;display:grid;gap:.85rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.am-x-list li{display:grid;gap:.3rem;padding-top:.85rem;border-top:1px solid var(--am-line-soft)}
.am-x-list a{font-weight:600;line-height:1.35;text-decoration:none}
.am-x-list a:hover{color:var(--accent2,var(--am-gold));text-decoration:underline;text-underline-offset:.18em}
.am-x-src{font-size:.72rem;letter-spacing:.09em;text-transform:uppercase;color:var(--am-muted)}
@media print{.am-exchange{display:none!important}}
`;
