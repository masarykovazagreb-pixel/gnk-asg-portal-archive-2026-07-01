#!/usr/bin/env node
/**
 * AI KONTROLNI AGENT — odobrava ili odbija objave pisca.
 *
 * Objavu odobrava AI kontrolni agent (APPROVER_ID), ne čovjek. Svaka odluka
 * se bilježi s pravilima koja su prošla ili pala. Odbijeni tekst ostaje u
 * redu kao "rejected" i ne ulazi u objavu.
 *
 * Pravila (apps/agents/lib/policy-v1.mjs):
 *   svježina izvora · HTTPS izvor i izdavač · citat najviše 25 riječi ·
 *   tijelo najmanje 150 riječi na oba jezika (bez tankog sadržaja) ·
 *   opis 80–200 znakova · najmanje 6 internih linkova · obavezni hashtagovi ·
 *   nema zabranjenih obrazaca · svaki broj u tekstu potječe iz izvora ili datuma ·
 *   AI oznaka na oba jezika.
 *
 * Pokretanje:
 *   node apps/agents/control-agent-v1.mjs [putanja/do/queue-YYYY-MM-DD.json]
 * Env: AGENT_OUT (izlaz), AGENT_NOW (trenutak run-a)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_DISCLOSURE, APPROVER_ID, POLICY, SCHEMA, killSwitchState, words, zagrebDate } from './lib/policy-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(process.env.AGENT_OUT || join(ROOT, 'artifacts', 'agent-editorial'));
const NOW = new Date(process.env.AGENT_NOW || Date.now());
const DAY = 24 * 3600 * 1000;

// Udio slova u latiničnom pismu među svim slovima; brojevi i interpunkcija se ne broje.
export function latinShare(text) {
  const letters = String(text).match(/\p{L}/gu) || [];
  if (!letters.length) return 0;
  const latin = letters.filter((ch) => /\p{Script=Latin}/u.test(ch)).length;
  return latin / letters.length;
}
// Česte riječi hrvatskog i engleskog. Tekst mora imati udio takvih riječi iznad praga.
const HR_WORDS = new Set('i u je na se da su za koji koja koje što s sa od po ali ne kao to ili biti će bi nakon prema uz kod već samo također'.split(' '));
const EN_WORDS = new Set('the and of to in is that with for on as by from at are was it be has have not this will after'.split(' '));
export function isHrOrEn(text) {
  const tokens = String(text).toLowerCase().match(/\p{L}+/gu) || [];
  if (tokens.length < 4) return false;
  const hits = tokens.filter((t) => HR_WORDS.has(t) || EN_WORDS.has(t)).length;
  return hits >= 1 && hits / tokens.length >= 0.08;
}
// Pokvareni znakovi: zamjenski znak i obrasci poput "7?9" koji nastaju pogrešnim dekodiranjem.
const CORRUPT = /\uFFFD|\d\?\d|\?\?/;

const numbersIn = (text) => (String(text).match(/\d+/g) || []);

// Provjere jedne stavke (jezik izvora, pismo, izvadak, pokvareni znakovi).
// Pisac ih koristi za odabir; kontrola ih provjerava i nad cijelim pregledom.
export function itemIssues(item, sourceLang) {
  const issues = [];
  const text = `${item.title} ${item.excerpt}`;
  if (!['hr', 'en'].includes(sourceLang)) issues.push('language');
  else if (!isHrOrEn(item.excerpt)) issues.push('language');
  if (latinShare(text) < POLICY.latinMinShare) issues.push('script');
  if (CORRUPT.test(text)) issues.push('encoding');
  if (POLICY.offTopicPatterns.some((re) => re.test(text))) issues.push('off-topic');
  return issues;
}

function freshnessOk(item, runDate) {
  const days = (Date.parse(runDate + 'T12:00:00Z') - Date.parse(item.date + 'T12:00:00Z')) / DAY;
  return Number.isFinite(days) && days >= 0 && days <= POLICY.freshDays;
}

// Svi brojevi u tekstu moraju biti izvedeni iz izvora, datuma, broja stavki ili pravila.
function unsupportedNumbers(draft, texts) {
  const allowed = new Set([String(draft.items.length), String(POLICY.freshDays)]);
  const sourceCorpus = draft.items
    .flatMap((it) => [it.title, it.excerpt, it.url, it.publisher, it.date])
    .concat([draft.run_date]);
  for (const s of sourceCorpus) numbersIn(s).forEach((n) => allowed.add(n));
  // Brojevi iz identifikatora agenata i iz samog teksta AI oznake nisu tvrdnje o svijetu.
  const scrub = (t) => String(t).replace(/AGENT-[A-Z]+-\d+/g, '');
  const bad = new Set();
  for (const t of texts) for (const n of numbersIn(scrub(t))) if (!allowed.has(n)) bad.add(n);
  // Datumi u tekstu (dd.mm.yyyy.) su izvedeni iz izvornih datuma; provjerava ih sama brojka.
  return [...bad];
}

export function reviewDraft(draft, { now = NOW } = {}) {
  const runDate = draft.run_date || zagrebDate(now.toISOString());
  const reasons = [];
  const checks = {};
  const fail = (key, msg) => { checks[key] = 'fail'; reasons.push(msg); };
  const pass = (key) => { checks[key] = 'pass'; };

  if (draft.status !== 'draft') fail('state', `status nije draft (${draft.status})`);
  else pass('state');

  if (!Array.isArray(draft.items) || draft.items.length === 0) fail('sources', 'nema izvora');
  else {
    const stale = draft.items.filter((it) => !freshnessOk(it, runDate));
    if (stale.length) fail('freshness', `${stale.length} izvor(a) starije od ${POLICY.freshDays} dana`);
    else pass('freshness');
    const badSrc = draft.items.filter((it) => !/^https:\/\//i.test(it.url || '') || !it.publisher || !it.title);
    if (badSrc.length) fail('source-fields', `${badSrc.length} izvor(a) bez HTTPS linka, izdavača ili naslova`);
    else pass('source-fields');
    // Bez prijevoda (jezični model nije spojen) citat na nelatiničnom pismu ne ide čitatelju.
    const nonLatin = draft.items.filter((it) => latinShare(`${it.title} ${it.excerpt}`) < POLICY.latinMinShare);
    if (nonLatin.length) fail('script', `${nonLatin.length} izvor(a) nije na latiničnom pismu, a nema prijevoda`);
    else pass('script');
    // Jezik: kanal mora biti na hrvatskom ili engleskom (polje lang); izvadak se dodatno provjerava čestim riječima.
    if (!['hr', 'en'].includes(draft.source_lang)) fail('language', `izvori su na jeziku ${draft.source_lang || 'nepoznato'}, a nema prijevoda`);
    else {
      const foreign = draft.items.filter((it) => !isHrOrEn(it.excerpt));
      if (foreign.length) fail('language', `${foreign.length} izvadak(a) ne izgleda kao hrvatski ili engleski tekst`);
      else pass('language');
    }
    const corrupt = draft.items.filter((it) => CORRUPT.test(`${it.title} ${it.excerpt}`));
    if (corrupt.length) fail('encoding', `${corrupt.length} izvor(a) s pokvarenim znakovima`);
    else pass('encoding');
    const longQuote = draft.items.filter((it) => words(String(it.excerpt).replace(/…$/, '')) > POLICY.quoteMaxWords);
    if (longQuote.length) fail('quote-length', `${longQuote.length} izvadak(a) dulji od ${POLICY.quoteMaxWords} riječi`);
    else pass('quote-length');
  }

  for (const lang of ['hr', 'en']) {
    const block = draft[lang];
    if (!block || !Array.isArray(block.paragraphs)) { fail(`${lang}-body`, `${lang}: nema tijela teksta`); continue; }
    const body = block.paragraphs.join(' ');
    const n = words(body);
    if (n < POLICY.bodyMinWords) fail(`${lang}-thin`, `${lang}: tanak tekst (${n} < ${POLICY.bodyMinWords} riječi)`);
    else pass(`${lang}-thin`);
    const len = String(block.description || '').length;
    if (len < POLICY.descriptionMin || len > POLICY.descriptionMax) fail(`${lang}-description`, `${lang}: opis ${len} znakova, traži se ${POLICY.descriptionMin}–${POLICY.descriptionMax}`);
    else pass(`${lang}-description`);
    const disclosure = lang === 'hr' ? AI_DISCLOSURE.hr : AI_DISCLOSURE.en;
    if (!block.paragraphs.join('\n').includes(disclosure)) fail(`${lang}-disclosure`, `${lang}: nedostaje AI oznaka`);
    else pass(`${lang}-disclosure`);
  }

  const links = [...new Set(Array.isArray(draft.links) ? draft.links : [])];
  if (links.length < POLICY.linksMin || links.some((l) => typeof l !== 'string' || !l.startsWith('/'))) fail('links', `potrebno ${POLICY.linksMin}+ internih linkova (imam ${links.length})`);
  else pass('links');

  const tags = Array.isArray(draft.hashtags) ? draft.hashtags : [];
  const missingTags = POLICY.requiredHashtags.filter((t) => !tags.includes(t));
  if (missingTags.length || tags.some((t) => !String(t).startsWith('#'))) fail('hashtags', `nedostaju hashtagovi: ${missingTags.join(', ') || 'neispravan format'}`);
  else pass('hashtags');

  const allText = [draft.hr?.title, draft.hr?.description, ...(draft.hr?.paragraphs || []), draft.en?.title, draft.en?.description, ...(draft.en?.paragraphs || []), ...draft.items.map((it) => `${it.title} ${it.excerpt} ${it.publisher}`)].filter(Boolean).join('\n');
  const banned = POLICY.bannedPatterns.filter((re) => re.test(allText)).map(String);
  if (banned.length) fail('banned', `zabranjeni obrasci: ${banned.join(', ')}`);
  else pass('banned');

  const unsupported = unsupportedNumbers(draft, [draft.hr?.title, draft.hr?.description, ...(draft.hr?.paragraphs || []), draft.en?.title, draft.en?.description, ...(draft.en?.paragraphs || [])]);
  if (unsupported.length) fail('numbers', `brojevi bez izvora: ${unsupported.join(', ')}`);
  else pass('numbers');

  const decision = reasons.length ? 'rejected' : 'approved';
  return { id: draft.id, decision, reasons, checks, reviewed_by: APPROVER_ID, reviewed_at: now.toISOString() };
}

export function reviewQueue(queue, { now = NOW } = {}) {
  if (queue.schema !== SCHEMA) throw new Error(`neočekivana shema: ${queue.schema}`);
  const decisions = queue.items.map((d) => reviewDraft(d, { now }));
  for (const d of queue.items) {
    const dec = decisions.find((x) => x.id === d.id);
    d.status = dec.decision === 'approved' ? 'approved-by-agent' : 'rejected';
    d.review = { decision: dec.decision, reasons: dec.reasons, checks: dec.checks, reviewed_by: APPROVER_ID, reviewed_at: dec.reviewed_at };
  }
  return { queue, decisions };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ks = killSwitchState();
  if (!ks.enabled) { console.log(JSON.stringify({ ok: true, reviewer: APPROVER_ID, paused: true, reason: ks.reason }, null, 2)); process.exit(0); }
  const runDate = zagrebDate(NOW.toISOString());
  const file = resolve(process.argv[2] || join(OUT, `queue-${runDate}.json`));
  if (!existsSync(file)) throw new Error(`nema reda objava: ${file}`);
  const queue = JSON.parse(readFileSync(file, 'utf8'));
  const { queue: reviewed, decisions } = reviewQueue(queue, { now: NOW });
  writeFileSync(file, JSON.stringify(reviewed, null, 2) + '\n');
  mkdirSync(OUT, { recursive: true });
  const log = join(OUT, `decisions-${queue.run_date}.json`);
  writeFileSync(log, JSON.stringify({ reviewed_by: APPROVER_ID, reviewed_at: NOW.toISOString(), decisions }, null, 2) + '\n');
  const approved = decisions.filter((d) => d.decision === 'approved').length;
  console.log(JSON.stringify({ ok: true, reviewer: APPROVER_ID, approved, rejected: decisions.length - approved, log }, null, 2));
}
