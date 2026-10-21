#!/usr/bin/env node
// S+Chat — prijedlozi pitanja s konkretne stranice.
//
// Tri stvari koje se tiho kvare:
//   1. datoteka prijedloga zastari kad se promijeni baza znanja,
//   2. prijedlog ponudi pitanje koje agent ne može odgovoriti,
//   3. klijent prestane čitati datoteku, a nitko ne primijeti.
// Zato test provjerava sadržaj, podrijetlo i sam klijent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const DATA = 'apps/portal/data/s-chat-context-suggest-v1.json';
check(fs.existsSync(path.join(ROOT, DATA)), `${DATA}: datoteka ne postoji`);
const data = JSON.parse(read(DATA));

/* ---------- 1. oblik ---------- */

check(typeof data.version === 'string' && data.version.includes('2026'), 'verzija nedostaje');
check(/^\d{4}-\d{2}-\d{2}$/.test(data.generatedFor || ''), 'generatedFor nije datum');
check(Array.isArray(data.questions) && data.questions.length > 0, 'polje questions je prazno');
check(data.maxPerRoute >= 1 && data.maxPerRoute <= 3, 'maxPerRoute izvan granica');
check(data.general?.hr?.length >= 3 && data.general?.en?.length >= 3, 'opći prijedlozi nisu potpuni');

const routes = Object.keys(data.routes || {});
check(routes.length >= 300, `premalo ruta s prijedlozima: ${routes.length}`);

for (const route of routes) {
  check(route.startsWith('/') && route.endsWith('/'), `${route}: ruta nije putanja sa završnom kosom`);
  check(/^\/[a-z0-9][a-z0-9\-_/]*$/i.test(route), `${route}: ruta sadrži nedopuštene znakove`);
  const ids = data.routes[route];
  check(Array.isArray(ids), `${route}: popis nije polje`);
  check(ids.length <= data.maxPerRoute, `${route}: ${ids.length} prijedloga, najviše ${data.maxPerRoute}`);
  const texts = ids.map((index) => data.questions[index]);
  for (const text of texts) {
    check(typeof text === 'string' && text.trim().length >= 8, `${route}: prazan prijedlog`);
    check(!/\bStranica:/i.test(text), `${route}: prijedlog nosi hrvatski sufiks "Stranica:"`);
  }
  check(new Set(texts).size === texts.length, `${route}: ponovljen prijedlog`);

  // Engleska ruta ne smije nuditi hrvatsko pitanje.
  if (route.startsWith('/en/')) {
    for (const text of texts) {
      check(
        /^(what|which|how|is|are|does|do|can|who|where|when|why|list|explain)\b/i.test(text),
        `${route}: engleska ruta nudi neengleski prijedlog: ${text}`
      );
    }
  }
}

/* ---------- 2. prijedlog postoji u indeksu agenta ---------- */

const retrieval = await import(
  pathToFileURL(path.join(ROOT, 'workers/gnk-asg-direct-operator/src/chat-retrieval-v1.js')).href
);
const known = new Set(retrieval.contextRoutes());
for (const route of routes) {
  check(known.has(route), `${route}: ruta nije u indeksu agenta (prijedlog bi bio mrtav)`);
}

for (const [route, ids] of Object.entries(data.routes).slice(0, 40)) {
  const lang = route.startsWith('/en/') ? 'en' : 'hr';
  const fresh = retrieval.contextSuggestions(route, lang, data.maxPerRoute);
  check(
    JSON.stringify(fresh) === JSON.stringify(ids.map((index) => data.questions[index])),
    `${route}: prijedlog se razlikuje od indeksa (pokreni generator)`
  );
}

// Ruta koja stvarno nosi prijedloge mora ih dati i kroz API modula.
const sample = routes.find((route) => route.startsWith('/gnk-aktual')) || routes[0];
check(retrieval.contextSuggestions(sample, sample.startsWith('/en/') ? 'en' : 'hr', 3).length > 0, `${sample}: modul ne vraća prijedloge`);

/* ---------- 3. klijent ih doista koristi ---------- */

const client = read('apps/portal/assets/s-chat-v2.js');
check(client.includes('/data/s-chat-context-suggest-v1.json'), 'klijent ne čita datoteku prijedloga');
check(/routes\?\.\[contextPath\]/.test(client), 'klijent ne traži prijedloge po ruti');
check(client.includes('sc-suggest-label'), 'klijent ne označava grupu prijedloga');
check(/enhanceSuggestions\(\)/.test(client), 'klijent ne poziva obogaćivanje prijedloga');

for (const page of ['apps/portal/s-chat/index.html', 'apps/portal/en/s-chat/index.html']) {
  const html = read(page);
  check(html.includes('s-chat-v2.js?v='), `${page}: skripta bez verzijskog tokena`);
  check(html.includes('s-chat-v2.css?v='), `${page}: stil bez verzijskog tokena`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, routes: routes.length, failures: failures.slice(0, 20) }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, routes: routes.length, questions: data.questions.length, failures: 0 }, null, 2));
}
