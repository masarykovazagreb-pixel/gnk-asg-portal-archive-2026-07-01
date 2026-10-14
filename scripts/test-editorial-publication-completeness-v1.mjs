import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-editorial-completeness-'));
const site = 'https://gnk-asg.hr';
const targetRoute = '/objave/world-topic-test/';
const sptRoute = '/objave/spt-protected/';
const bankRoute = '/objave/bank-account-protected/';
const otherRoute = '/objave/unrelated-item/';
const description = 'A focused fixture description long enough to exercise canonical publication metadata and social preview updates.';
const write = (relative, content) => {
  const file = path.join(temp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
};
const routeFile = 'apps/portal/data/world-topics-registry.json';
const pageFile = (route) => `apps/portal${route}index.html`;
const imageFile = (slug) => `/assets/editorial/generated/${slug}.webp`;
const imageUrl = (slug) => `${site}${imageFile(slug)}`;
const page = (route, title) => `<!doctype html><html lang="hr"><head>
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="author" content="Nermin Sefić">
<meta name="keywords" content="topic, Nermin Sefić">
<meta property="article:author" content="Nermin Sefić">
<meta property="og:image" content="${site}/assets/people/nermin-sefic/old-cover.jpg">
<meta name="twitter:image" content="${site}/assets/people/nermin-sefic/old-cover.jpg">
<link rel="canonical" href="${site}${route}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  datePublished: '2026-08-10T12:00:00+02:00',
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${site}${route}` },
  image: `${site}/assets/people/nermin-sefic/old-cover.jpg`,
  author: { '@type': 'Person', name: 'Nermin Sefić' },
  editor: { '@type': 'Person', name: 'Nermin Sefić' },
  about: [{ '@type': 'Person', name: 'Nermin Sefić' }, { '@type': 'Thing', name: 'Global topic' }],
  publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
})}</script>
</head><body><main><header class="article-header"><h1>${title}</h1><p class="lead">${description}</p></header>
<section class="author-card"><img src="/assets/people/nermin-sefic/portrait.webp" alt="Nermin Sefić">Author: Nermin Sefić</section>
<p class="editorial-approval"><strong>Editorial responsibility: Nermin Sefić.</strong></p>
<figure class="world-chart"><img src="/assets/editorial/world-topics/chart.webp" alt="Chart showing the topic" width="1120" height="700"></figure>
<article class="article-body"><p>Editorial content.</p><p class="article-hashtags">#GlobalTopic #NerminSefić</p></article></main></body></html>`;
const registryItem = (route, title) => ({
  path: route,
  url: `${site}${route}`,
  title,
  seoTitle: title,
  description,
  image: `${site}/assets/people/nermin-sefic/old-cover.jpg`,
  publishedAt: '2026-08-10T12:00:00+02:00',
  published_at: '2026-08-10T12:00:00+02:00',
  modifiedAt: null,
  type: 'objava',
  status: 'published',
  language: 'hr',
  author: null,
  authorSchemaVerified: false,
});
const manifestItem = (route, title, slug) => ({
  path: route,
  type: 'objava',
  language: 'hr',
  title,
  kicker: 'Objava · AKTUAL MEDIA',
  image: imageFile(slug),
  url: imageUrl(slug),
  alt: `Original GNK ASG editorial illustration for ${title}`,
  width: 1200,
  height: 630,
});

try {
  for (const relative of [
    'scripts/apply-editorial-publication-completeness-v1.mjs',
    'scripts/lib/editorial-route-protection-v1.mjs',
    'scripts/lib/seo-description-v1.mjs',
  ]) {
    write(relative, fs.readFileSync(relative, 'utf8'));
  }

  const titles = new Map([
    [targetRoute, 'World Topic Example'],
    [sptRoute, 'Protected SPT Example'],
    [bankRoute, 'Protected Bank Example'],
    [otherRoute, 'Unrelated Example'],
  ]);
  for (const [route, title] of titles) write(pageFile(route), page(route, title));

  const listing = `<!doctype html><html><body><main>
<article data-editorial-route="${targetRoute}"><a href="${targetRoute}"><img src="/legacy/target.jpg" alt="old target"></a></article>
<article data-editorial-route="${sptRoute}"><a href="${sptRoute}"><img src="/legacy/spt.jpg" alt="protected SPT"></a></article>
<article data-editorial-route="${bankRoute}"><a href="${bankRoute}"><img src="/legacy/bank.jpg" alt="protected bank"></a></article>
<article data-editorial-route="${otherRoute}"><a href="${otherRoute}"><img src="/legacy/other.jpg" alt="unrelated"></a></article>
</main></body></html>`;
  write('apps/portal/objave/index.html', listing);
  write(routeFile, JSON.stringify({ items: [
    { path: targetRoute },
    { path: sptRoute },
    { path: bankRoute },
  ] }, null, 2));
  write('apps/portal/data/editorial-registry.json', JSON.stringify({ items: [...titles].map(([route, title]) => registryItem(route, title)) }, null, 2));
  write('apps/portal/data/editorial-image-manifest.json', JSON.stringify({ items: [
    manifestItem(targetRoute, titles.get(targetRoute), 'target-cover'),
    manifestItem(sptRoute, titles.get(sptRoute), 'spt-cover'),
    manifestItem(bankRoute, titles.get(bankRoute), 'bank-cover'),
    manifestItem(otherRoute, titles.get(otherRoute), 'other-cover'),
  ] }, null, 2));

  const protectedBefore = new Map([sptRoute, bankRoute].map((route) => [route, fs.readFileSync(path.join(temp, pageFile(route)), 'utf8')]));
  const otherBefore = fs.readFileSync(path.join(temp, pageFile(otherRoute)), 'utf8');
  const targetBefore = fs.readFileSync(path.join(temp, pageFile(targetRoute)), 'utf8');
  const listingBefore = fs.readFileSync(path.join(temp, 'apps/portal/objave/index.html'), 'utf8');
  const run = (extraArgs = []) => spawnSync(process.execPath, [
    'scripts/apply-editorial-publication-completeness-v1.mjs',
    '--routes-file', routeFile,
    ...extraArgs,
  ], { cwd: temp, encoding: 'utf8' });

  const dryRun = run();
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const drySummary = JSON.parse(dryRun.stdout);
  assert.equal(drySummary.write, false);
  assert.equal(drySummary.scanned, 1, 'only the non-protected requested article should be processed');
  assert.equal(drySummary.changed, 1);
  assert.equal(drySummary.protectedRoutesSkipped, 2);
  assert.deepEqual(drySummary.failures, []);
  assert.equal(fs.readFileSync(path.join(temp, pageFile(targetRoute)), 'utf8'), targetBefore, 'dry-run must not write article HTML');
  assert.equal(fs.readFileSync(path.join(temp, 'apps/portal/objave/index.html'), 'utf8'), listingBefore, 'dry-run must not write listing HTML');

  const writeRun = run(['--write']);
  assert.equal(writeRun.status, 0, writeRun.stderr || writeRun.stdout);
  const writeSummary = JSON.parse(writeRun.stdout);
  assert.equal(writeSummary.scanned, 1);
  assert.equal(writeSummary.changed, 1);
  assert.equal(writeSummary.protectedRoutesSkipped, 2);

  const target = fs.readFileSync(path.join(temp, pageFile(targetRoute)), 'utf8');
  assert.notEqual(target, targetBefore, 'selected article should be normalized');
  assert.match(target, /class="article-cover"/);
  assert.match(target, /src="\/assets\/editorial\/world-topics\/chart\.webp"/, 'content chart must be preserved when adding the cover');
  assert.match(target, /aria-label="Krušne mrvice"/);
  assert.match(target, /data-editorial-crosslinks/);
  assert.doesNotMatch(target, /Nermin Sefić|NerminSefic|#Nermin/i, 'unverified author attribution and name tags must be removed');
  assert.doesNotMatch(target, /class="author-card"|class="editorial-approval"/);
  assert.match(target, new RegExp(`property="og:image" content="${imageUrl('target-cover').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"`));
  assert.doesNotMatch(target, /<meta name="author"|property="article:author"/);
  assert.doesNotMatch(target, /name="keywords" content="[^"]*Nermin/i);

  const articleSchema = [...target.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .find((schema) => schema['@type'] === 'Article');
  assert.ok(articleSchema, 'article schema must remain valid');
  assert.equal(articleSchema.author, undefined);
  assert.equal(articleSchema.editor, undefined);
  assert.ok(!articleSchema.about?.some((entity) => entity['@type'] === 'Person' && /nermin/i.test(entity.name || '')));

  const updatedListing = fs.readFileSync(path.join(temp, 'apps/portal/objave/index.html'), 'utf8');
  assert.match(updatedListing, /src="\/assets\/editorial\/generated\/target-cover\.webp"/);
  assert.match(updatedListing, /src="\/legacy\/spt\.jpg"/);
  assert.match(updatedListing, /src="\/legacy\/bank\.jpg"/);
  assert.match(updatedListing, /src="\/legacy\/other\.jpg"/);
  for (const [route, before] of protectedBefore) assert.equal(fs.readFileSync(path.join(temp, pageFile(route)), 'utf8'), before, `${route} must remain byte-identical`);
  assert.equal(fs.readFileSync(path.join(temp, pageFile(otherRoute)), 'utf8'), otherBefore, 'unselected article must remain byte-identical');

  write(routeFile, JSON.stringify({ items: [{ path: '/objave/missing-route/' }] }, null, 2));
  const missingRoute = run();
  assert.equal(missingRoute.status, 1, 'unknown requested routes must fail closed');
  assert.match(missingRoute.stdout, /requested route is missing from the canonical editorial registry/);

  console.log(JSON.stringify({
    ok: true,
    routeScopedDryRun: true,
    onlyRequestedContentWritten: true,
    protectedSptAndBankPagesUnchanged: true,
    existingWorldChartPreserved: true,
    unsupportedPersonAttributionRemoved: true,
    unknownRoutesFailClosed: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
