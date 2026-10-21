#!/usr/bin/env node
// Statički AKTUAL feed: blok mora postojati na HR i EN stranici, mora biti
// svjež u odnosu na data/news.json i ne smije unositi kadencijske rečenice
// koje normalize-aktual-hourly-contract.mjs prepisuje.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const news = JSON.parse(read('apps/portal/data/news.json'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const PAGES = { hr: 'apps/portal/gnk-aktual/index.html', en: 'apps/portal/en/gnk-aktual/index.html' };
const CADENCE = [
  /svaka dva sata/i, /svaka 2 sata/i, /svaki sat/i,
  /every two hours/i, /every hour/i, /svakih 6 h/i, /every 6 h/i,
];
const CROATIAN_UI = ['Najnovije', 'Sve vijesti', 'Sve analize', 'Izdanja', 'Tjednik', 'Komentari', 'Više iz', 'Statična verzija'];

const top = news.filter((item) => item && item.title && /^https:\/\//.test(item.url || '')).slice(0, 8);
check(top.length === 8, `news.json must expose at least 8 linkable stories (${top.length})`);

const blocks = {};
for (const [lang, file] of Object.entries(PAGES)) {
  const page = read(file);
  const start = page.indexOf('<!-- NEWS-NOSCRIPT:START -->');
  const end = page.indexOf('<!-- NEWS-NOSCRIPT:END -->');
  check(start > 0 && end > start, `${file}: NEWS-NOSCRIPT markers missing`);
  check(page.indexOf('<noscript>', start) > 0 && page.indexOf('<noscript>', start) < end, `${file}: <noscript> must wrap the block`);
  check(!/<script/i.test(page.slice(start, end)), `${file}: static block must not ship script`);
  check(page.slice(start, end).includes('<style') === false, `${file}: style must live in head, not in the body block`);
  check(/NEWS-NOSCRIPT:CSS:START/.test(page), `${file}: static block CSS is missing from head`);
  check(page.indexOf('NEWS-NOSCRIPT:CSS:START') < page.indexOf('</head>'), `${file}: static CSS must be inside head`);

  const blockText = page.slice(start, end);
  blocks[lang] = blockText;

  const links = [...blockText.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const internal = links.filter((href) => href.startsWith('/'));
  const external = links.filter((href) => href.startsWith('https://'));
  check(internal.length >= 6, `${file}: static block needs at least 6 internal links (${internal.length})`);
  check(external.length >= 8, `${file}: static block needs the full lead + list (${external.length})`);
  check(blockText.includes('rel="external noopener noreferrer nofollow"'), `${file}: external links need the rel contract`);
  check((blockText.match(/<time datetime="/g) || []).length >= 7, `${file}: each story needs a machine-readable time`);
  check((blockText.match(/referrerpolicy="no-referrer"/g) || []).length >= 1, `${file}: proxy image must not leak the referrer`);
  check(blockText.includes('loading="eager" fetchpriority="high"'), `${file}: the lead image must load first`);
  check((blockText.match(/loading="lazy"/g) || []).length === 0, `${file}: the static block has a single image and it is the lead`);
  check(/aria-labelledby="amn-heading"/.test(blockText), `${file}: block needs an accessible name`);

  for (const pattern of CADENCE) {
    check(!pattern.test(blockText), `${file}: cadence phrase leaked (${pattern.source})`);
  }
  // Svježina: prvi naslov u bloku mora biti prvi naslov u feedu.
  const firstTitle = top[0].title.replace(/\s+/g, ' ').trim().slice(0, 40);
  const normalizedBlock = blockText.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  check(normalizedBlock.includes(firstTitle), `${file}: static block is stale (lead story differs from feed)`);
  check((normalizedBlock.match(/href="https:\/\//g) || []).length >= 8, `${file}: story links got lost in escaping`);
}

for (const word of CROATIAN_UI) {
  check(!blocks.en.includes(word), `English static block contains Croatian UI text: ${word}`);
}
check(blocks.en.includes('Latest right now'), 'English static block is missing its heading');
check(blocks.hr.includes('Najnovije u ovom trenutku'), 'Croatian static block is missing its heading');

/* ---------- ulaz u asistenta s kontekstom stranice ---------- */

const ASK = {
  hr: { href: '/s-chat/?ctx=%2Fgnk-aktual%2F', label: 'Pitaj asistenta o AKTUAL MEDIA' },
  en: { href: '/en/s-chat/?ctx=%2Fen%2Fgnk-aktual%2F', label: 'Ask the assistant about AKTUAL MEDIA' },
};
for (const [lang, file] of Object.entries(PAGES)) {
  const page = read(file);
  const start = page.indexOf('<!-- ASK-AGENT:START -->');
  const end = page.indexOf('<!-- ASK-AGENT:END -->');
  check(start > 0 && end > start, `${file}: ASK-AGENT markers missing`);
  const block = page.slice(start, end);
  check(!/<noscript/i.test(block), `${file}: the assistant link must be visible with JavaScript too`);
  check(block.includes(`href="${ASK[lang].href}"`), `${file}: assistant link must carry the right page context`);
  check(block.includes(ASK[lang].label), `${file}: assistant link label is missing`);
  check(block.includes('class="am-ask-link"'), `${file}: assistant link must use the shared style`);
  check(start < page.indexOf('<!-- NEWS-NOSCRIPT:START -->'), `${file}: the assistant link belongs above the static feed`);
}

// Blok mora stajati prije interaktivnog leada, ne unutar njega.
const hr = read(PAGES.hr);
check(hr.indexOf('NEWS-NOSCRIPT:START') < hr.indexOf('<article class="am-lead" id="amLead">'), 'HR: static block must precede the interactive lead');
const en = read(PAGES.en);
check(en.indexOf('NEWS-NOSCRIPT:START') < en.indexOf('<article class="am-lead" id="amLead">'), 'EN: static block must precede the interactive lead');

assert.equal(failures.length, 0, failures.join('\n') || 'static AKTUAL feed failed');
console.log(JSON.stringify({ ok: true, stories: 8, pages: Object.keys(PAGES), internalLinks: 6, freshLead: true }, null, 2));
