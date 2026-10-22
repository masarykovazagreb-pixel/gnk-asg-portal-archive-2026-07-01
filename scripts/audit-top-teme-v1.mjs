#!/usr/bin/env node
/* Brana protiv izmišljanja na stranici /top-teme/.
   Provjerava da je svaka rečenica vezana na dokaz:
   - q:ID  → citat mora biti doslovan naslov iz feeda,
   - s:KEY → brojevi moraju odgovarati podacima iz data/top-teme.json,
   - ask   → smije biti samo pitanje, bez brojki.
   Zabranjuje i tvrdnje koje nemaju pokriće u arhivi. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const errors = [];

const data = JSON.parse(readFileSync(join(PORTAL, 'data', 'top-teme.json'), 'utf8'));

const titles = new Set();
for (const ch of readdirSync(join(PORTAL, 'kanal'), { withFileTypes: true })) {
  if (!ch.isDirectory()) continue;
  const f = join(PORTAL, 'kanal', ch.name, 'feed.json');
  if (!existsSync(f)) continue;
  for (const it of JSON.parse(readFileSync(f, 'utf8')).items || []) {
    /* Naslov u feedu nosi lokaliziranu oznaku vrste teksta (Osvrt:, Elemzés:,
       Analiză:, Анализ:, Analisi:). Citat je naslov bez te oznake, pa se u
       skup titula dodaje i čisti oblik — inače svaki ne-hrvatski kanal pada. */
    const title = String(it.title || '').replace(/\s+/g, ' ').trim();
    titles.add(title);
    titles.add(title.replace(/^(Osvrt|Elemzés|Analiză|Анализ|Analisi)\s*:\s*/i, '').trim());
  }
}

const BANNED = [
  'prema saznanjima', 'izvori tvrde', 'neslužbeno', 'nesluzbeno', 'sigurno je', 'zasigurno',
  'dokazano je', 'pokazuje da', 'očito je', 'ocito je', 'vjerojatno je', 'procjenjuje se',
  'nesumnjivo', 'bez sumnje', 'prema neslužbenim'
];

const strip = (html) => html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

for (const lang of ['hr', 'en']) {
  const file = lang === 'en' ? join(PORTAL, 'top-teme', 'en', 'index.html') : join(PORTAL, 'top-teme', 'index.html');
  if (!existsSync(file)) { errors.push(`${file}: missing`); continue; }
  const html = readFileSync(file, 'utf8');

  const lower = strip(html).toLowerCase();
  for (const bad of BANNED) if (lower.includes(bad)) errors.push(`${lang}: banned claim phrase "${bad}"`);

  const themes = [...html.matchAll(/<article class="tt-theme"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  if (themes.length !== data.themes.length) errors.push(`${lang}: ${themes.length} themes rendered, expected ${data.themes.length}`);

  themes.forEach((art, i) => {
    const t = data.themes[i];
    if (!t) { errors.push(`${lang}: extra theme block ${i + 1}`); return; }

    // citati: svi q:ID unutar teme
    const quotes = [...art.matchAll(/data-quote="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)];
    if (quotes.length < 2) errors.push(`${lang}: theme ${i + 1} has ${quotes.length} quotes (min 2)`);
    for (const [, id, body] of quotes) {
      const text = strip(body).replace(/^„/, '').replace(/"$/, '').trim();
      const q = t.quotes.find((x) => x.id === id);
      if (!q) { errors.push(`${lang}: unknown quote ${id}`); continue; }
      if (text !== q.text) errors.push(`${lang}: quote ${id} is not verbatim (${JSON.stringify(text.slice(0, 50))})`);
      if (!titles.has(q.text.replace(/\s+/g, ' ').trim())) errors.push(`${lang}: quote ${id} not found in any feed title`);
    }

    // brojevi
    const allowed = new Set([t.count, t.channels, t.sources, t.digits, t.questions, t.unnamed, data.dayItems]);
    const dateText = new Date(`${t.date}T12:00:00Z`).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zagreb' });
    for (const n of dateText.match(/\d+/g) || []) allowed.add(Number(n));
    for (const n of `${t.timeFrom} ${t.timeTo}`.match(/\d+/g) || []) allowed.add(Number(n));

    const countEl = art.match(new RegExp('data-stat="t' + (i + 1) + '-count"[^>]*>([\\s\\S]*?)</p>'));
    const shapeEl = art.match(new RegExp('data-stat="t' + (i + 1) + '-shape"[^>]*>([\\s\\S]*?)</p>'));
    if (!countEl) errors.push(`${lang}: theme ${i + 1} missing count evidence`);
    if (!shapeEl) errors.push(`${lang}: theme ${i + 1} missing shape evidence`);
    for (const [name, el] of [['count', countEl], ['shape', shapeEl]]) {
      if (!el) continue;
      const nums = (strip(el[1]).match(/\d+/g) || []).map(Number);
      for (const n of nums) if (!allowed.has(n)) errors.push(`${lang}: theme ${i + 1} ${name} uses unexplained number ${n}`);
      if (name === 'count') {
        for (const need of [t.count, t.channels, t.sources]) {
          if (!nums.includes(need)) errors.push(`${lang}: theme ${i + 1} count evidence lacks ${need}`);
        }
      } else {
        for (const need of [t.count, t.digits, t.questions, t.unnamed]) {
          if (!nums.includes(need)) errors.push(`${lang}: theme ${i + 1} shape evidence lacks ${need}`);
        }
      }
    }

    const ask = art.match(/data-ev="ask"[^>]*>([\s\S]*?)<\/p>/);
    if (!ask) errors.push(`${lang}: theme ${i + 1} missing question`);
    else {
      const text = strip(ask[1]);
      if (!text.endsWith('?')) errors.push(`${lang}: theme ${i + 1} ask is not a question`);
      if (/\d/.test(text)) errors.push(`${lang}: theme ${i + 1} ask contains a number`);
    }
  });
}

const out = { version: 'TOP_TEME_EVIDENCE_V1', day: data.generatedFor, themes: data.themes.length, quotes: data.themes.reduce((n, t) => n + t.quotes.length, 0), errors };
console.log(JSON.stringify(out, null, 2));
if (errors.length) process.exit(1);
