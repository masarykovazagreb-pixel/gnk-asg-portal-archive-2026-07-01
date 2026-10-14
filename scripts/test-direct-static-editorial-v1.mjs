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

function html({ words = 500, omitTwitterImage = false, exception = false, omitAuthor = false } = {}) {
  const body = Array.from({ length: words }, (_, index) => `riječ${index + 1}`).join(' ');
  const links = ['/objave/', '/komentari/', '/nermin-sefic/', '/about/', '/contact/']
    .map(href => `<a href="${href}">Poveznica</a>`).join('');
  return `<!doctype html><html lang="hr"><head>
<title>Testna autorska objava za izravni urednički validator</title>
<meta name="description" content="Ovaj opis provjerava urednički ugovor i SEO cjelovitost; izraz 'bez iznimke' mora ostati cijeli, uz dovoljno konteksta za pretraživanje.">
${omitAuthor ? '' : '<meta name="author" content="Nermin Sefić">'}
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
    ...(omitAuthor ? {} : { author: { '@type': 'Person', name: 'Nermin Sefić' } }),
    publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  })}</script></head><body><main><article><h1>Testna autorska objava</h1>${omitAuthor ? '' : '<p>Autor: Nermin Sefić</p>'}<img src="/assets/test.svg" alt="Test">${links}<p>${body}</p></article></main></body></html>`;
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

// Publication pages use the 500-word format floor. The validator counts
// visible H1/byline/link labels too, so keep the negative fixture safely below it.
result = run(html({ words: 400 }));
assert.notEqual(result.status, 0);
assert.match(result.stderr, /minimum is 500/u);

result = run(html({ omitTwitterImage: true }));
assert.notEqual(result.status, 0);
assert.match(result.stderr, /missing twitter:image/u);

result = run(html({ words: 10, exception: true }));
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /digital-workforce-worker-exception/u);

// A specifically enumerated, previously published authored statement may remain
// text-locked even when it predates the later format-specific direct-static rule.
// This test prevents the narrow exception from being lost in future refactors.
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

// Existing legacy pages may receive a policy-only hashtag normalization without
// being forced through a retroactive content rewrite. Any substantive HTML change
// must still trigger the full current direct-static standard.
const gitTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-direct-editorial-git-'));
const gitRelative = 'apps/portal/objave/legacy-tag-only/index.html';
const gitAbsolute = path.join(gitTemp, gitRelative);
fs.mkdirSync(path.dirname(gitAbsolute), { recursive: true });
const legacyBase = html({ words: 400, omitTwitterImage: true })
  .replace('</article>', '<p class="article-hashtags">#GNKASG #LegacyTag</p></article>');
fs.writeFileSync(gitAbsolute, legacyBase);
const git = (...args) => spawnSync('git', args, { cwd: gitTemp, encoding: 'utf8' });
assert.equal(git('init').status, 0);
assert.equal(git('config','user.name','Policy Test').status, 0);
assert.equal(git('config','user.email','policy@example.invalid').status, 0);
assert.equal(git('add','.').status, 0);
assert.equal(git('commit','-m','legacy baseline').status, 0);
const baseSha = git('rev-parse','HEAD').stdout.trim();

fs.writeFileSync(gitAbsolute, legacyBase.replace('#GNKASG #LegacyTag','#GNKASG #NerminSefić #NerminSefic'));
assert.equal(git('add','.').status, 0);
assert.equal(git('commit','-m','normalize tags').status, 0);
let headSha = git('rev-parse','HEAD').stdout.trim();
result = spawnSync(process.execPath, [validator], {
  cwd: gitTemp,
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_BASE_SHA: baseSha,
    GITHUB_SHA: headSha,
    DIRECT_EDITORIAL_MIN_WORDS: '3000',
    DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5',
  },
});
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /non-substantive-tag-normalization/u);

const tagOnlyHead = headSha;
fs.writeFileSync(gitAbsolute, fs.readFileSync(gitAbsolute,'utf8').replace('<h1>Testna autorska objava</h1>','<h1>Testna autorska objava</h1><p>Stvarna promjena sadržaja.</p>'));
assert.equal(git('add','.').status, 0);
assert.equal(git('commit','-m','change article body').status, 0);
headSha = git('rev-parse','HEAD').stdout.trim();
result = spawnSync(process.execPath, [validator], {
  cwd: gitTemp,
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_BASE_SHA: tagOnlyHead,
    GITHUB_SHA: headSha,
    DIRECT_EDITORIAL_MIN_WORDS: '3000',
    DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5',
  },
});
assert.notEqual(result.status, 0,'substantive change must not inherit tag-only exception');
assert.match(result.stderr, /minimum is 500|missing twitter:image/u);
fs.rmSync(gitTemp, { recursive: true, force: true });

// A presentation-only publication refresh may add a cover, breadcrumbs,
// crosslinks and share controls without forcing a retroactive copy rewrite or
// inventing an author for an unchanged legacy page. SEO/technical checks still run.
const presentationTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-direct-editorial-presentation-'));
const presentationRelative = 'apps/portal/objave/presentation-only/index.html';
const presentationAbsolute = path.join(presentationTemp, presentationRelative);
fs.mkdirSync(path.dirname(presentationAbsolute), { recursive: true });
const presentationBase = html({ words: 400, omitAuthor: true }).replaceAll('testna-objava', 'presentation-only');
fs.writeFileSync(presentationAbsolute, presentationBase);
const presentationGit = (...args) => spawnSync('git', args, { cwd: presentationTemp, encoding: 'utf8' });
assert.equal(presentationGit('init').status, 0);
assert.equal(presentationGit('config','user.name','Policy Test').status, 0);
assert.equal(presentationGit('config','user.email','policy@example.invalid').status, 0);
assert.equal(presentationGit('add','.').status, 0);
assert.equal(presentationGit('commit','-m','legacy presentation baseline').status, 0);
const presentationBaseSha = presentationGit('rev-parse','HEAD').stdout.trim();
const presentationRefresh = presentationBase
  .replace('<img src="/assets/test.svg" alt="Test">', '<figure class="editorial-cover-figure"><img src="/assets/test.svg" alt="Test"></figure>')
  .replace('</article>', '<nav class="editorial-breadcrumb"><a href="/">Naslovnica</a></nav><nav data-editorial-crosslinks><a href="/objave/">Objave</a></nav><aside data-editorial-share>Share</aside></article>');
fs.writeFileSync(presentationAbsolute, presentationRefresh);
assert.equal(presentationGit('add','.').status, 0);
assert.equal(presentationGit('commit','-m','add publication presentation metadata').status, 0);
let presentationHeadSha = presentationGit('rev-parse','HEAD').stdout.trim();
result = spawnSync(process.execPath, [validator], {
  cwd: presentationTemp,
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_BASE_SHA: presentationBaseSha,
    GITHUB_SHA: presentationHeadSha,
    DIRECT_EDITORIAL_MIN_WORDS: '3000',
    DIRECT_EDITORIAL_MIN_WORDS_PUBLICATION: '500',
    DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5',
  },
});
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /"editorialCopyUnchanged": true/u);
assert.match(result.stdout, /unchanged-copy-legacy-floor-not-reapplied/u);

fs.writeFileSync(presentationAbsolute, fs.readFileSync(presentationAbsolute, 'utf8').replace('</article>', '<p>Stvarna urednička promjena teksta.</p></article>'));
assert.equal(presentationGit('add','.').status, 0);
assert.equal(presentationGit('commit','-m','edit publication copy').status, 0);
presentationHeadSha = presentationGit('rev-parse','HEAD').stdout.trim();
result = spawnSync(process.execPath, [validator], {
  cwd: presentationTemp,
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_BASE_SHA: presentationBaseSha,
    GITHUB_SHA: presentationHeadSha,
    DIRECT_EDITORIAL_MIN_WORDS: '3000',
    DIRECT_EDITORIAL_MIN_WORDS_PUBLICATION: '500',
    DIRECT_EDITORIAL_MIN_INTERNAL_LINKS: '5',
  },
});
assert.notEqual(result.status, 0, 'an editorial copy change must trigger the full content floor');
assert.match(result.stderr, /minimum is 500/u);
fs.rmSync(presentationTemp, { recursive: true, force: true });

fs.rmSync(temp, { recursive: true, force: true });
console.log('DIRECT_STATIC_EDITORIAL_POLICY_TESTS_OK');
