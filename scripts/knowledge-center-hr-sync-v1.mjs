#!/usr/bin/env node
/**
 * HR Knowledge Center prati bazu znanja.
 *
 * Stranica /knowledge-center/ nastala je ručno i s vremenom je zaostala za
 * apps/portal/data/knowledge-base.json — nedostajala je cijela skupina, a
 * broj na vrhu stranice tvrdio je manje pitanja nego što ih baza ima.
 * Ova skripta uspoređuje stranicu s bazom i dopisuje samo ono što fali:
 * novu skupinu, nova pitanja, brojače u kazalu i FAQPage strukturne podatke.
 * Ništa postojeće ne prepisuje.
 *
 *   node scripts/knowledge-center-hr-sync-v1.mjs           # provjeri
 *   node scripts/knowledge-center-hr-sync-v1.mjs --apply    # upiši
 *   node scripts/knowledge-center-hr-sync-v1.mjs --check    # izađi s 1 ako fali
 */
import fs from 'node:fs';

const PAGE = 'apps/portal/knowledge-center/index.html';
const KB = 'apps/portal/data/knowledge-base.json';
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const plain = (value) => String(value ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const kb = JSON.parse(fs.readFileSync(KB, 'utf8'));
const groups = (kb.skupine || [])
  .map((group) => ({
    title: String(group.naslov || '').trim(),
    questions: (group.pitanja || [])
      .map((item) => ({ q: String(item.p || '').trim(), a: String(item.o || '').trim() }))
      .filter((item) => item.q && item.a),
  }))
  .filter((group) => group.title && group.questions.length);

let page = fs.readFileSync(PAGE, 'utf8');
const original = page;
const changes = [];
let reportLd = 0;

/* ---------- 1. sekcije ---------- */

const sectionPattern = /<section class="faq-group" id="(faq-\d+)"><h2>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/g;
const sections = [...page.matchAll(sectionPattern)].map((match) => ({
  id: match[1],
  title: match[2].trim(),
  start: match.index,
  end: match.index + match[0].length,
  body: match[3],
  questions: [...match[3].matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) => plain(m[1])),
}));
if (!sections.length) throw new Error('nijedna faq-group sekcija nije pronađena');

const byTitle = new Map(sections.map((section) => [section.title, section]));
let nextId = Math.max(...sections.map((section) => Number(section.id.replace('faq-', '')))) + 1;
const added = [];

for (const group of groups) {
  const existing = byTitle.get(group.title);
  if (!existing) {
    added.push({ group, kind: 'section' });
    continue;
  }
  const known = new Set(existing.questions);
  const missing = group.questions.filter((item) => !known.has(plain(item.q)));
  if (missing.length) added.push({ group, kind: 'questions', missing, section: existing });
}

/* ---------- 1b. odgovori koji su se u bazi promijenili ---------- */

const answers = new Map();
for (const group of groups) for (const item of group.questions) answers.set(plain(item.q), item.a);

let updatedAnswers = 0;
page = page.replace(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g, (match, summary, body) => {
  const question = plain(summary);
  const source = answers.get(question);
  if (!source) return match;
  if (plain(source) === plain(body)) return match;
  updatedAnswers += 1;
  return `<details><summary>${summary}</summary><p>${esc(source)}</p></details>`;
});

/* ---------- 2. primjena ---------- */

function insertBeforeSectionEnd(section, html) {
  // Sekcije se mijenjaju od kraja prema početku da indeksi ostanu valjani.
  page = `${page.slice(0, section.end - '</section>'.length)}${html}${page.slice(section.end - '</section>'.length)}`;
}

const sectionAdds = added.filter((item) => item.kind === 'section');
const questionAdds = added.filter((item) => item.kind === 'questions');

for (const item of [...questionAdds].sort((a, b) => b.section.start - a.section.start)) {
  insertBeforeSectionEnd(item.section, item.missing.map((q) => `<details><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join(''));
}

const newSections = sectionAdds.map((item, index) => {
  const id = `faq-${nextId + index}`;
  return `<section class="faq-group" id="${id}"><h2>${esc(item.group.title)}</h2>${item.group.questions.map((q) => `<details><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join('')}</section>`;
});
if (newSections.length) {
  const close = page.indexOf('</main>');
  if (close < 0) throw new Error('nema </main>');
  page = `${page.slice(0, close)}${newSections.join('')}${page.slice(close)}`;
}

/* ---------- 3. kazalo i brojači ---------- */

const total = groups.reduce((n, group) => n + group.questions.length, 0);
page = page.replace(/(\d+)\s+pitanja u (\d+)\s+skupina/, `${total} pitanja u ${groups.length} skupina`);

for (const group of groups) {
  const id = byTitle.get(group.title)?.id || `faq-${nextId + sectionAdds.findIndex((item) => item.group === group)}`;
  const entry = new RegExp(`<li><a href="#${id}">[\\s\\S]*?</a><span>\\d+</span></li>`);
  const fresh = `<li><a href="#${id}">${esc(group.title)}</a><span>${group.questions.length}</span></li>`;
  if (entry.test(page)) {
    page = page.replace(entry, fresh);
  } else if (id && !page.includes(`href="#${id}"`)) {
    page = page.replace('</ul></nav>', `${fresh}</ul></nav>`);
  }
}

/* ---------- 4. FAQPage ---------- */

const faqMatch = page.match(/<script type="application\/ld\+json">(\{"@context": ?"https:\/\/schema\.org", ?"@type": ?"FAQPage"[\s\S]*?)<\/script>/);
if (faqMatch) {
  let data;
  try {
    data = JSON.parse(faqMatch[1]);
  } catch (error) {
    throw new Error(`FAQPage JSON-LD nije valjan: ${error.message}`);
  }
  const known = new Set((data.mainEntity || []).map((item) => String(item?.name || '').trim()));
  // Postojeći zapisi se ne osvježavaju sami: tekst u bazi se mijenja, a
  // strukturne podatke treba dovesti na isto. Inače Google čita staru
  // tvrdnju iako stranica pokazuje novu.
  let refreshedLd = 0;
  for (const item of data.mainEntity || []) {
    const name = String(item?.name || '').trim();
    const source = answers.get(name);
    if (!source) continue;
    if (String(item?.acceptedAnswer?.text || '') === source) continue;
    item.acceptedAnswer = { '@type': 'Answer', text: source };
    refreshedLd += 1;
  }
  if (refreshedLd) reportLd = refreshedLd;
  const missing = [];
  for (const group of groups) {
    for (const item of group.questions) {
      if (known.has(item.q)) continue;
      missing.push({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } });
      known.add(item.q);
    }
  }
  if (missing.length) data.mainEntity = [...(data.mainEntity || []), ...missing];
  if (missing.length || refreshedLd) {
    page = page.replace(faqMatch[0], `<script type="application/ld+json">${JSON.stringify(data)}</script>`);
  }
}

/* ---------- 5. ispis ---------- */

const drifted = page !== original;
const report = {
  ok: !drifted,
  mode: APPLY ? 'apply' : (CHECK ? 'check' : 'dry-run'),
  knowledgeQuestions: total,
  knowledgeGroups: groups.length,
  newSections: sectionAdds.length,
  updatedAnswers,
  updatedStructuredData: reportLd,
  newQuestions: questionAdds.reduce((n, item) => n + item.missing.length, 0),
  changed: drifted,
};

if (APPLY && drifted) {
  fs.writeFileSync(PAGE, page);
  changes.push(PAGE);
} else if (!APPLY && drifted) {
  report.preview = { sections: sectionAdds.map((item) => item.group.title), questions: questionAdds.map((item) => `${item.group.title}: ${item.missing.length}`) };
}

console.log(JSON.stringify(report, null, 2));
if (CHECK && drifted) process.exitCode = 1;
