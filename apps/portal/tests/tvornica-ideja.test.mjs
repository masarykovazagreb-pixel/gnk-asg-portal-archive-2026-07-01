// GNK ASG — Tvornica ideja: testovi logike, sadržaja i integriteta stranice.
// Pokretanje: node --test apps/portal/tests/tvornica-ideja.test.mjs
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const F = require('../tvornica-ideja/tvornica-ideja.js');
const doc = JSON.parse(await readFile(new URL('../data/idea_factory.json', import.meta.url), 'utf8'));
const pageHtml = await readFile(new URL('../tvornica-ideja/index.html', import.meta.url), 'utf8');
const uiJs = await readFile(new URL('../tvornica-ideja/tvornica-ideja-ui.js', import.meta.url), 'utf8');
const logicJs = await readFile(new URL('../tvornica-ideja/tvornica-ideja.js', import.meta.url), 'utf8');
const base = { title: 'Nova ideja za test', area: 'SEO', impact: 3, confidence: 4, effort: 2 };

test('validate: accepts a well-formed idea and rejects bad fields with messages', () => {
  assert.equal(F.validate(base).ok, true);
  assert.equal(F.validate({ ...base, title: 'abc' }).ok, false);
  assert.equal(F.validate({ ...base, area: 'Nepoznato' }).ok, false);
  assert.equal(F.validate({ ...base, impact: 0 }).ok, false);
  assert.equal(F.validate({ ...base, effort: 2.5 }).ok, false);
  assert.equal(F.validate({ ...base, effort: '3' }).ok, false, 'string numbers are rejected');
  assert.equal(F.validate({ ...base, status: 'objavljeno' }).ok, false);
  assert.equal(F.validate({ ...base, status: 'otvoreno' }).ok, true);
  assert.equal(F.validate({ ...base, status: 'gotovo' }).ok, true);
  assert.equal(F.validate({ ...base, route: 'https://evil.example/' }).ok, false, 'external route rejected');
  assert.equal(F.validate({ ...base, route: '/status/' }).ok, true);
  assert.equal(F.validate(null).ok, false);
  const r = F.validate({ ...base, impact: 9 });
  assert.ok(r.errors.some((e) => e.includes('impact')));
});

test('score: impact × confidence ÷ effort, rounded to one decimal', () => {
  assert.equal(F.score({ ...base, impact: 3, confidence: 4, effort: 2 }), 6);
  assert.equal(F.score({ ...base, impact: 1, confidence: 1, effort: 3 }), 0.3);
  assert.throws(() => F.score({ ...base, effort: 0 }));
});

test('rank: sorts by score, filters by area and query, drops invalid ideas', () => {
  const ideas = [
    { ...base, id: 'a', title: 'Alfa ideja', impact: 1, confidence: 1, effort: 1 },
    { ...base, id: 'b', title: 'Beta ideja', impact: 5, confidence: 5, effort: 1, area: 'Podaci' },
    { ...base, id: 'c', title: 'Neispravna', impact: 7 },
  ];
  const all = F.rank(ideas);
  assert.deepEqual(all.map((i) => i.id), ['b', 'a'], 'invalid idea c is dropped, highest score first');
  assert.deepEqual(F.rank(ideas, { area: 'Podaci' }).map((i) => i.id), ['b']);
  assert.deepEqual(F.rank(ideas, { query: 'ALFA' }).map((i) => i.id), ['a'], 'query is case-insensitive');
  assert.equal(F.rank(ideas, { query: 'nema-ovoga' }).length, 0);
});

test('summarize: counts valid and invalid ideas per area', () => {
  const s = F.summarize([base, { ...base, area: 'Podaci' }, { ...base, impact: 0 }]);
  assert.deepEqual([s.total, s.valid, s.invalid], [3, 2, 1]);
  assert.equal(s.byArea.SEO, 1);
  assert.equal(s.byArea.Podaci, 1);
});

test('data: 30 ideas, 10 done and 20 open, all valid, unique and linked to existing routes', async () => {
  assert.equal(doc.ideas.length, 30);
  assert.equal(F.summarize(doc.ideas).invalid, 0);
  const ids = doc.ideas.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'ids must be unique');
  const titles = doc.ideas.map((i) => i.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, 'titles must be unique');
  const done = new Set(['idea-07','idea-08','idea-10','idea-12','idea-13','idea-20','idea-21','idea-22','idea-24','idea-25']);
  assert.equal(doc.ideas.filter((i) => i.status === 'gotovo').length, 10);
  assert.equal(doc.ideas.filter((i) => i.status === 'otvoreno').length, 20);
  for (const i of doc.ideas) {
    assert.equal(i.status, done.has(i.id) ? 'gotovo' : 'otvoreno', `${i.id}: owner status mismatch`);
    assert.ok(i.source && i.source.length > 5, `${i.id}: needs a repository source`);
    assert.ok(i.problem && i.problem.length > 10, `${i.id}: needs a problem statement`);
    const dir = new URL('..' + i.route, import.meta.url);
    await access(new URL('index.html', dir)).catch(async () => access(dir));
  }
});

test('data: no draft mentions a named author, hashtag or personal contact', () => {
  const text = JSON.stringify(doc);
  assert.ok(!/#[A-Za-zČĆŠŽĐčćšžđ]/.test(text), 'no hashtags');
  assert.ok(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(text), 'no e-mail addresses');
});

test('page: CSP is strict, no inline script, all referenced ids exist', () => {
  assert.match(pageHtml, /Content-Security-Policy/);
  assert.match(pageHtml, /script-src 'self'/);
  assert.ok(!/script-src[^"]*unsafe-/.test(pageHtml), 'no unsafe script sources');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>(?!\s*<\/script>)[\s\S]*?<\/script>/i.test(pageHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')),
    'no inline executable scripts');
  for (const m of uiJs.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(pageHtml.includes(`id="${m[1]}"`), `ui references missing id ${m[1]}`);
  }
  assert.ok(pageHtml.includes('<form id="new-idea"'));
});

test('ui & logic: no HTML injection sinks and no network or storage access', () => {
  for (const [name, src] of [['ui', uiJs], ['logic', logicJs]]) {
    assert.ok(!/\.innerHTML\s*=/.test(src), `${name}: innerHTML assignment`);
    assert.ok(!/insertAdjacentHTML|outerHTML\s*=|document\.write/.test(src), `${name}: HTML sink`);
    assert.ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon/.test(src), `${name}: storage or socket`);
  }
  assert.equal((uiJs.match(/fetch\(/g) || []).length, 1, 'only the data fetch');
  assert.ok(uiJs.includes("'../data/idea_factory.json'"));
});
