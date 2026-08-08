import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const validator = path.resolve('scripts/validate-direct-static-editorial-v1.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-direct-editorial-'));
const relative = 'apps/portal/objave/testna-objava/index.html';
const absolute = path.join(temp, relative);
fs.mkdirSync(path.dirname(absolute), { recursive: true });

function html({ words = 3000, omitTwitterImage = false, exception = false } = {}) {
  const body = Array.from({ length: words }, (_, index) => `riječ${index + 1}`).join(' ');
  const links = ['/objave/', '/komentari/', '/nermin-sefic/', '/about/', '/contact/']
    .map(href => `<a href="${href}">Poveznica</a>`).join('');
  return `<!doctype html><html lang="hr"><head>
<title>Testna autorska objava za izravni urednički validator</title>
<meta name="description" content="Ovo je dovoljno dug i jedinstven meta opis testne autorske objave koji provjerava urednički ugovor, indeksabilnost i tehničku SEO cjelovitost stranice.">
<meta name="author" content="Nermin Sefić">
${exception ? '<meta name="editorial-policy-exception" content="digital-workforce-worker">' : ''}
<link rel="canonical" href="https://gnk-asg.hr/objave/testna-objava/">
<meta property="og:title" content="Testna autorska objava">
<meta property="og:description" content="Testni opis">
<meta property="og:image" content="https://gnk-asg.hr/assets/test.svg">
<meta property="og:url" content="https://gnk-asg.hr/objave/testna-objava/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Testna autorska objava">
<meta name="twitter:description" content="Testni opis">
${omitTwitterImage ? '' : '<meta name="twitter:image" content="https://gnk-asg.hr/assets/test.svg">'}
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Testna autorska objava',
    mainEntityOfPage: 'https://gnk-asg.hr/objave/testna-objava/',
    author: { '@type': 'Person', name: 'Nermin Sefić' },
    publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  })}</script></head><body><main><article><h1>Testna autorska objava</h1><p>Autor: Nermin Sefić</p><img src="/assets/test.svg" alt="Test">${links}<p>${body}</p></article></main></body></html>`;
}

function run(source) {
  fs.writeFileSync(absolute, source);
  return spawnSync(process.execPath, [validator, relative], {
    cwd: temp,
    encoding: 'utf8',
    env: { ...process.env, DIRECT_EDITORIAL_MIN_WORDS: '3000', DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5' },
  });
}

let result = run(html());
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /DIRECT_STATIC_EDITORIAL_POLICY_OK/u);

// The validator counts every visible word inside article/main, including the
// H1, byline and link labels. Use a fixture safely below the threshold so the
// negative test is deterministic instead of relying on body words alone.
result = run(html({ words: 2500 }));
assert.notEqual(result.status, 0);
assert.match(result.stderr, /minimum is 3000/u);

result = run(html({ omitTwitterImage: true }));
assert.notEqual(result.status, 0);
assert.match(result.stderr, /missing twitter:image/u);

result = run(html({ words: 10, exception: true }));
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /digital-workforce-worker-exception/u);


// A specifically enumerated, previously published authored statement may remain
// text-locked even when it predates the later 3,000-word direct-static rule.
const lockedRelative = 'apps/portal/objave/osvrt-na-2013-omega-factoring-nermin-sefic/index.html';
const lockedAbsolute = path.join(temp, lockedRelative);
fs.mkdirSync(path.dirname(lockedAbsolute), { recursive: true });
fs.writeFileSync(lockedAbsolute, html({ words: 10 }));
result = spawnSync(process.execPath, [validator, lockedRelative], {
  cwd: temp, encoding: 'utf8',
  env: { ...process.env, DIRECT_EDITORIAL_MIN_WORDS: '3000', DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5' },
});
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /locked-authored-statement-exception/u);

fs.rmSync(temp, { recursive: true, force: true });
console.log('DIRECT_STATIC_EDITORIAL_POLICY_TESTS_OK');
