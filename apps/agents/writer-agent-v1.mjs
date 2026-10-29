#!/usr/bin/env node
/**
 * AGENT PISAC — aktualni pregledi iz javnih izvora.
 *
 * Čita svježe stavke iz izvornih snimki (apps/region/data/<kanal>.json), za svaki
 * kanal sastavlja HR i EN pregled s atribucijom: izdavač, datum, naslov, kratki
 * izvadak (najviše POLICY.quoteMaxWords riječi) i poveznica na izvornik.
 *
 * Ne preuzima cijele članke i ne izmišlja činjenice, brojeve ni citate.
 * Bez jezičnog modela pisac radi kao sažetak s atribucijom; tekst koji nema dovoljno
 * stvarnog materijala ostaje tanak i kontrolni agent ga odbija.
 *
 * Pokretanje:
 *   node apps/agents/writer-agent-v1.mjs
 * Env (za testove i ručno pokretanje):
 *   AGENT_SOURCES  direktorij izvornih snimki   (zadano: apps/region/data)
 *   AGENT_OUT      izlazni direktorij           (zadano: artifacts/agent-editorial)
 *   AGENT_NOW      trenutak run-a, ISO          (zadano: sada)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_DISCLOSURE, POLICY, SCHEMA, WRITER_ID, APPROVER_ID, killSwitchState, words, zagrebDate } from './lib/policy-v1.mjs';
import { itemIssues } from './control-agent-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCES = resolve(process.env.AGENT_SOURCES || join(ROOT, 'apps', 'region', 'data'));
const OUT = resolve(process.env.AGENT_OUT || join(ROOT, 'artifacts', 'agent-editorial'));
const NOW = new Date(process.env.AGENT_NOW || Date.now());
if (!Number.isFinite(NOW.getTime())) throw new Error('AGENT_NOW nije valjan datum');
const MAX_ITEMS = 8;

const clean = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// Izvadak: prva rečenica, skraćena na POLICY.quoteMaxWords riječi.
export function excerptOf(summary) {
  const text = clean(summary);
  const first = text.split(/(?<=[.!?])\s+/)[0] || text;
  const parts = first.split(' ');
  if (parts.length <= POLICY.quoteMaxWords) return first;
  return parts.slice(0, POLICY.quoteMaxWords).join(' ') + '…';
}

function hrDate(iso) {
  const [y, m, d] = zagrebDate(iso).split('-');
  return `${Number(d)}.${Number(m)}.${y}.`;
}

export function selectItems(channel, now = NOW) {
  const lang = String(channel.lang || '').toLowerCase();
  const cutoff = now.getTime() - POLICY.freshDays * 24 * 3600 * 1000;
  const seen = new Set();
  const out = [];
  for (const it of channel.items || []) {
    const t = Date.parse(it.date);
    if (!Number.isFinite(t) || t < cutoff || t > now.getTime() + 36e5) continue;
    if (!/^https:\/\//i.test(it.url || '')) continue;
    const title = clean(it.title);
    const excerpt = excerptOf(it.summary);
    if (!title || excerpt.length < 40) continue;
    if (seen.has(it.url)) continue;
    const candidate = { title: title.slice(0, 200), publisher: clean(it.sourceName || it.source), url: it.url, date: zagrebDate(it.date), excerpt };
    // Stavka koja ne prolazi jezik, pismo ili kodiranje ne ulazi u pregled.
    if (itemIssues(candidate, lang).length) continue;
    seen.add(it.url);
    out.push(candidate);
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_ITEMS);
}

function linksFor(slug) {
  return [`/kanal/${slug}/`, '/gnk-aktual/', '/izdanja/', '/gnk-aktual/mreza/', '/status/', '/agenti/', '/nermin-sefic/'];
}

export function buildDraft(channel, slug, items, runDate) {
  const city = clean(channel.city) || slug;
  const n = items.length;
  const hashtags = [...POLICY.requiredHashtags, `#${city.replace(/[^\p{L}\p{N}]/gu, '')}`];
  const hr = {
    title: `Pregled: ${city}, ${hrDate(runDate + 'T12:00:00Z')}`,
    description: `Pregled za ${city} s ${n} naslova iz javnih izvora, datum ${hrDate(runDate + 'T12:00:00Z')}, s poveznicama na izvornike i AI oznakom.`,
    paragraphs: [
      `Pregled za ${city} za ${hrDate(runDate + 'T12:00:00Z')}: ${n} naslova iz javnih izvora objavljenih u zadnja ${POLICY.freshDays} dana. Svaki naslov vodi na izvornik; GNK ASG ne preuzima cijele tekstove.`,
      ...items.map((it) => `${it.publisher}, ${hrDate(it.date + 'T12:00:00Z')}: „${it.title}“. Izvadak: „${it.excerpt}“ Izvor: ${it.url}`),
      'Svi izvori su navedeni uz svaki naslov.',
      AI_DISCLOSURE.hr,
    ],
  };
  const en = {
    title: `Overview: ${city}, ${runDate}`,
    description: `Overview for ${city} with ${n} headlines from public sources, ${runDate}, linked to the originals and marked as AI-prepared.`,
    paragraphs: [
      `Overview for ${city} on ${runDate}: ${n} headlines from public sources published in the last ${POLICY.freshDays} days. Headlines are in their original language. Each one links to the original; GNK ASG does not reproduce full articles.`,
      ...items.map((it) => `${it.publisher}, ${it.date}: "${it.title}". Excerpt: "${it.excerpt}" Source: ${it.url}`),
      'All sources are named beside each headline.',
      AI_DISCLOSURE.en,
    ],
  };
  return {
    id: `pregled-${slug}-${runDate}`,
    channel: slug,
    city,
    run_date: runDate,
    source_lang: String(channel.lang || '').toLowerCase(),
    status: 'draft',
    writer: WRITER_ID,
    items,
    hr,
    en,
    hashtags,
    links: linksFor(slug),
    disclosure: AI_DISCLOSURE,
  };
}

export function runWriter({ sources = SOURCES, now = NOW } = {}) {
  const runDate = zagrebDate(now.toISOString());
  const drafts = [];
  for (const file of readdirSync(sources).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
    const channel = JSON.parse(readFileSync(join(sources, file), 'utf8'));
    const slug = basename(file, '.json');
    const items = selectItems(channel, now);
    if (!items.length) continue;
    drafts.push(buildDraft(channel, slug, items, runDate));
  }
  return {
    schema: SCHEMA,
    generated_at: now.toISOString(),
    run_date: runDate,
    writer: WRITER_ID,
    governance: {
      approver: APPROVER_ID,
      own_site_only: true,
      no_scraping: true,
      no_full_text_copy: true,
      thin_content_min_words: POLICY.bodyMinWords,
    },
    items: drafts,
  };
}

// Pokretanje iz CLI-ja.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ks = killSwitchState();
  if (!ks.enabled) { console.log(JSON.stringify({ ok: true, writer: WRITER_ID, paused: true, reason: ks.reason }, null, 2)); process.exit(0); }
  const queue = runWriter();
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `queue-${queue.run_date}.json`);
  writeFileSync(file, JSON.stringify(queue, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, writer: WRITER_ID, drafts: queue.items.length, words: queue.items.map((d) => words(d.hr.paragraphs.join(' '))), file }, null, 2));
}
