#!/usr/bin/env node
// S+Chat — prijedlozi pitanja za stranicu s koje je razgovor otvoren.
//
// Agent već zna odakle je pitanje došlo (?ctx=). Ovaj generator iz iste
// baze znanja izvlači do tri pitanja koja su stvarno vezana uz tu rutu,
// pa razgovor ne počinje općenitim popisom nego stranicom na kojoj
// čitatelj jest.
//
// Izvor je isti modul koji koristi worker (chat-retrieval-v1.js), zato
// prijedlog ne može odlutati od onoga što agent doista može odgovoriti.
//
// Pokretanje:
//   node scripts/build-s-chat-context-suggest-v1.mjs
//   node scripts/build-s-chat-context-suggest-v1.mjs --check
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'apps', 'portal', 'data', 's-chat-context-suggest-v1.json');
const RETRIEVAL = path.join(ROOT, 'workers', 'gnk-asg-direct-operator', 'src', 'chat-retrieval-v1.js');
const VERSION = 'GNK_ASG_S_CHAT_CONTEXT_SUGGEST_V1_20261021';
const MAX_PER_ROUTE = 3;

const { contextRoutes, contextSuggestions } = await import(pathToFileURL(RETRIEVAL).href);

const routes = {};
const bank = [];
const bankIndex = new Map();
let withSuggestions = 0;

/* Pitanja se ponavljaju na više ruta, pa se drže u jednom polju i
   indeksiraju. Datoteka je tako manja od trećine onoga što bi bila s
   ponovljenim tekstom. */
const idOf = (question) => {
  if (!bankIndex.has(question)) {
    bankIndex.set(question, bank.length);
    bank.push(question);
  }
  return bankIndex.get(question);
};

for (const route of contextRoutes()) {
  const lang = route.startsWith('/en/') ? 'en' : 'hr';
  const questions = contextSuggestions(route, lang, MAX_PER_ROUTE);
  if (!questions.length) continue;
  routes[route] = questions.map(idOf);
  withSuggestions += 1;
}

const general = {
  hr: ['Što je GNK ASG d.o.o.?', 'Koji su financijski pokazatelji za 2025.?', 'Koje sve cjeline postoje na portalu?'],
  en: ['What is GNK ASG d.o.o.?', 'What are the 2025 financial results?', 'Which portal sections exist?'],
};

/* generatedFor mijenja se samo kad se sadržaj zaista promijeni. Inače bi svaki
   dan (ili svaki CI ciklus na drugi dan) pokvario provjeru "committed == generated". */
const contentOnly = { version: VERSION, maxPerRoute: MAX_PER_ROUTE, general, questions: bank, routes };
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
const unchanged = previous && JSON.stringify({ version: previous.version, maxPerRoute: previous.maxPerRoute, general: previous.general, questions: previous.questions, routes: previous.routes }) === JSON.stringify(contentOnly);
const payload = {
  version: VERSION,
  generatedFor: unchanged && previous.generatedFor ? previous.generatedFor : new Date().toISOString().slice(0, 10),
  maxPerRoute: MAX_PER_ROUTE,
  general,
  questions: bank,
  routes,
};
const serialized = `${JSON.stringify(payload, null, 0)}\n`;

if (process.argv.includes('--check')) {
  if (!existsSync(OUT)) {
    console.error('Nedostaje apps/portal/data/s-chat-context-suggest-v1.json — pokreni generator.');
    process.exit(1);
  }
  const current = JSON.parse(readFileSync(OUT, 'utf8'));
  const currentRoutes = Object.keys(current.routes || {});
  const drift = currentRoutes.filter((route) => {
    const lang = route.startsWith('/en/') ? 'en' : 'hr';
    const fresh = contextSuggestions(route, lang, MAX_PER_ROUTE).map((question) => (current.questions || []).indexOf(question));
    return JSON.stringify(current.routes[route]) !== JSON.stringify(fresh);
  });
  if (drift.length || currentRoutes.length !== withSuggestions) {
    console.error(`Prijedlozi su zastarjeli: ${drift.length} ruta se razlikuje, ${currentRoutes.length} u datoteci prema ${withSuggestions} u bazi.`);
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, version: VERSION, routes: withSuggestions, mode: 'check' }, null, 2));
  process.exit(0);
}

writeFileSync(OUT, serialized);
console.log(JSON.stringify({
  ok: true,
  version: VERSION,
  routes: withSuggestions,
  questions: bank.length,
  bytes: Buffer.byteLength(serialized),
  fromKnownRoutes: contextRoutes().length,
}, null, 2));
