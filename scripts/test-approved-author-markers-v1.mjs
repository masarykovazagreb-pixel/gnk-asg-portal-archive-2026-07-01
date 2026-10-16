import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { socialHashtagsFor } from './lib/social-hashtags-v1.mjs';
import { normalizeEditorialAttributionHtml, extractSocialHashtags } from './lib/editorial-html-attribution-v1.mjs';

const verifiedSocialTags = socialHashtagsFor({ author: 'Nermin Sefić', authorSchemaVerified: true }, ['NerminSefic', 'GNKASG', 'QuantumComputing']);
const syndicatedSocialTags = socialHashtagsFor({ author: null, authorSchemaVerified: false }, ['NerminSefic', 'GNKASG', 'QuantumComputing']);
const site = 'https://gnk-asg.hr';
assert.deepEqual(verifiedSocialTags, ['NerminSefic', 'GNKASG', 'QuantumComputing'], 'verified personal authorship may use a matching social hashtag');
assert.deepEqual(syndicatedSocialTags, ['GNKASG', 'QuantumComputing'], 'syndicated or unassigned content must not receive a personal-author hashtag');
const queuedHtml = `<!doctype html><html lang="en"><head><meta name="author" content="Nermin Sefić"><meta name="keywords" content="Topic, Nermin Sefić, #GNKASG"><meta property="article:tag" content="#NerminSefic"><meta property="article:tag" content="NerminSefic"><meta property="article:tag" content="Topic"><meta property="article:author" content="${site}/nermin-sefic/"><script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org','@type':'Article',author:{'@type':'Person',name:'Nermin Sefić'},keywords:['Topic','Nermin Sefić','GNKASG','BusinessIntelligence'],about:['#GNKASG','GNKDINAMOLtd','BusinessIntelligence','Editorial integrity'] })}</script><script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org','@type':'WebSite',name:'GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić',keywords:['GNK ASG','Nermin Sefic','Site profile'] })}</script></head><body><div class="article-meta"><span>Nermin Sefić</span></div><p class="article-hashtags">#QuantumComputing #GNKASG #NerminSefic</p><p class="editorial-approval">Editor-in-Chief: Nermin Sefić</p></body></html>`;
const unassignedQueueItem = { author: null, authorSchemaVerified: false, language: 'en' };
const queuedSocialTags = extractSocialHashtags(queuedHtml, unassignedQueueItem, ['GNKASG']);
assert.deepEqual(queuedSocialTags, ['QuantumComputing', 'GNKASG'], 'queue preserves topical social tags while stripping an unverified person tag');
const normalizedQueue = normalizeEditorialAttributionHtml(queuedHtml, unassignedQueueItem).html;
assert.doesNotMatch(normalizedQueue, /<meta name="author"[^>]*Nermin|property="article:author"/);
assert.match(normalizedQueue, /<meta name="editor" content="Nermin Sefić">/);
assert.doesNotMatch(normalizedQueue, /class="article-meta"|class="article-hashtags"/);
assert.match(normalizedQueue, /class="editorial-approval"/, 'neutral editor role must not be stripped with the personal byline');
const queuedSchema = JSON.parse(normalizedQueue.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)[1]);
assert.equal(queuedSchema.author, undefined);
assert.equal(queuedSchema.editor.name, 'Nermin Sefić');
assert.deepEqual(queuedSchema.keywords, ['Topic']);
assert.deepEqual(queuedSchema.about, ['Editorial integrity']);
const queueLdJsonBodies = normalizedQueue.split('<script type="application/ld+json">').slice(1).map((part) => part.split('</script>')[0]);
const queuedWebsiteSchema = JSON.parse(queueLdJsonBodies[1]);
assert.equal(queuedWebsiteSchema.name, 'GNK ASG');
assert.equal(queuedWebsiteSchema.keywords, undefined);
const verifiedQueueItem = { author: 'Nermin Sefić', authorSchemaVerified: true, language: 'en' };
const verifiedQueue = normalizeEditorialAttributionHtml(queuedHtml, verifiedQueueItem).html;
assert.match(verifiedQueue, /<meta name="author" content="Nermin Sefić">/);
assert.match(verifiedQueue, new RegExp(`property="article:author" content="${site}\\/nermin-sefic\\/"`));
assert.match(verifiedQueue, /<meta name="keywords" content="Topic">/);
assert.doesNotMatch(verifiedQueue, /<meta name="keywords"[^>]*(?:Nermin|#|GNKASG)/i);
assert.doesNotMatch(verifiedQueue, /property="article:tag" content="[^"]*(?:#|nermin|sefic)/i);
assert.match(verifiedQueue, /property="article:tag" content="Topic"/);
const verifiedQueueSchema = JSON.parse(verifiedQueue.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)[1]);
assert.equal(verifiedQueueSchema.author?.['@type'], 'Person');
assert.equal(verifiedQueueSchema.editor?.name, 'Nermin Sefić');
assert.deepEqual(verifiedQueueSchema.about, ['Editorial integrity']);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-editorial-attribution-'));
const route = (slug) => `${site}/objave/${slug}/`;
const write = (relative, content) => {
  const file = path.join(temp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
};
const page = (slug) => `<!doctype html><html lang="en"><head>
<link rel="canonical" href="${route(slug)}">
<meta name="author" content="Nermin Sefić">
<meta name="keywords" content="Topic, Nermin Sefić, #GNKASG, GNKASG, BusinessIntelligence">
<meta name="news_keywords" content="#GNKASG, BusinessIntelligence, Nermin Sefic, Editorial integrity">
<meta property="article:author" content="Nermin Sefić">
<meta property="article:tag" content="#NerminSefic">
<meta property="article:tag" content="NerminSefic">
<meta property="article:tag" content="Topic">
<link rel="author" href="${site}/nermin-sefic/#person">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Editorial attribution regression',
  author: { '@type': 'Person', '@id': `${site}/nermin-sefic/#person`, name: 'Nermin Sefić' },
  editor: { '@type': 'Person', name: 'Nermin Sefić' },
  publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  keywords: ['Topic', '#NerminSefic', 'Nermin Sefić', 'GNKASG', 'BusinessIntelligence'],
  about: ['#GNKASG', 'GNKDINAMOLtd', 'BusinessIntelligence', 'Editorial integrity'],
})}</script>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GNK ASG d.o.o. | GNK DINAMO Ltd. | Nermin Sefić',
  keywords: ['GNK ASG', 'Nermin Sefic', 'Site profile'],
})}</script>
</head><body><main>
<aside class="article-author"><strong>Author: Nermin Sefić</strong></aside>
<p class="editorial-author-inline"><strong>Author:</strong> Nermin Sefić</p>
<p class="editorial-approval"><strong>Editorial responsibility:</strong> Nermin Sefić, editor-in-chief.</p>
<p class="article-hashtags">#GNKASG #Topic #NerminSefić</p>
</main></body></html>`;

try {
  const paths = {
    verified: 'apps/portal/objave/verified-author/index.html',
    syndicated: 'apps/portal/objave/syndicated-report/index.html',
    spt: 'apps/portal/objave/spt-protected/index.html',
    bank: 'apps/portal/objave/bank-account-protected/index.html',
  };
  const originalProtected = {
    spt: page('spt-protected'),
    bank: page('bank-account-protected'),
  };
  write(paths.verified, page('verified-author'));
  write(paths.syndicated, page('syndicated-report'));
  write(paths.spt, originalProtected.spt);
  write(paths.bank, originalProtected.bank);
  write('apps/portal/data/editorial-registry.json', JSON.stringify({ items: [
    {
      path: '/objave/verified-author/', status: 'published', type: 'objava',
      author: 'Nermin Sefić', authorSchemaVerified: true,
    },
    {
      path: '/objave/syndicated-report/', status: 'published', type: 'objava',
      author: null, authorSchemaVerified: false,
    },
    {
      path: '/objave/spt-protected/', status: 'published', type: 'objava',
      author: 'Nermin Sefić', authorSchemaVerified: true,
    },
    {
      path: '/objave/bank-account-protected/', status: 'published', type: 'objava',
      author: 'Nermin Sefić', authorSchemaVerified: true,
    },
  ] }, null, 2));
  for (const relative of [
    'scripts/enforce-approved-author-markers-v1.mjs',
    'scripts/lib/editorial-attribution-v1.mjs',
    'scripts/lib/editorial-html-attribution-v1.mjs',
    'scripts/lib/social-hashtags-v1.mjs',
    'scripts/lib/editorial-route-protection-v1.mjs',
  ]) write(relative, fs.readFileSync(relative, 'utf8'));

  const protectedBefore = new Map([
    [paths.spt, originalProtected.spt],
    [paths.bank, originalProtected.bank],
  ]);
  const run = (args = []) => spawnSync(process.execPath, ['scripts/enforce-approved-author-markers-v1.mjs', ...args], {
    cwd: temp,
    encoding: 'utf8',
  });
  const dryRun = run();
  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const drySummary = JSON.parse(dryRun.stdout);
  assert.equal(drySummary.mode, 'check');
  assert.equal(drySummary.eligible, 2);
  assert.equal(drySummary.protectedSkipped, 2);
  assert.equal(drySummary.changed, 2);
  assert.equal(fs.readFileSync(path.join(temp, paths.verified), 'utf8'), page('verified-author'), 'dry-run must not write HTML');

  const result = run(['--write']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.personalAuthorsVerified, 1);
  assert.equal(summary.personalAuthorsRemoved, 1);
  assert.equal(summary.protectedSkipped, 2);

  const verified = fs.readFileSync(path.join(temp, paths.verified), 'utf8');
  assert.match(verified, /<meta name="author" content="Nermin Sefić">/);
  assert.match(verified, new RegExp(`property="article:author" content="${site}\\/nermin-sefic\\/"`));
  assert.match(verified, /<meta name="editor" content="Nermin Sefić">/);
  assert.match(verified, /rel="author" href="https:\/\/gnk-asg\.hr\/nermin-sefic\/"/);
  assert.match(verified, /class="article-author"/, 'verified personal byline must remain');
  assert.doesNotMatch(verified, /#(?:NerminSefic|NerminSefić|SeficNermin|SefićNermin|Topic)|class="article-hashtags"/i, 'hashtags belong to social distribution, not article body content');
  assert.match(verified, /name="keywords" content="Topic"/);
  assert.doesNotMatch(verified, /name="keywords" content="[^"]*(?:Nermin|#|GNKASG|BusinessIntelligence)/i);
  assert.match(verified, /name="news_keywords" content="Editorial integrity"/);
  assert.doesNotMatch(verified, /name="news_keywords" content="[^"]*(?:Nermin|#|BusinessIntelligence)/i);
  assert.doesNotMatch(verified, /property="article:tag" content="(?:#?Nermin|#?Sefic)/i, 'personal author tags stay in social distribution and out of SEO metadata');
  assert.match(verified, /property="article:tag" content="Topic"/);
  const verifiedSchema = JSON.parse(verified.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)[1]);
  assert.equal(verifiedSchema.author?.['@type'], 'Person');
  assert.equal(verifiedSchema.editor?.name, 'Nermin Sefić');
  assert.equal(verifiedSchema.author?.name, 'Nermin Sefić');
  assert.deepEqual(verifiedSchema.keywords, ['Topic']);
  assert.deepEqual(verifiedSchema.about, ['Editorial integrity'], 'social hashtag tokens must not leak into schema.org about metadata');
  const verifiedLdJsonBodies = verified.split('<script type="application/ld+json">').slice(1).map((part) => part.split('</script>')[0]);
  const verifiedWebsiteSchema = JSON.parse(verifiedLdJsonBodies[1]);
  assert.equal(verifiedWebsiteSchema.name, 'GNK ASG');
  assert.equal(verifiedWebsiteSchema.keywords, undefined);

  const syndicated = fs.readFileSync(path.join(temp, paths.syndicated), 'utf8');
  assert.doesNotMatch(syndicated, /<meta name="author"[^>]*content="Nermin Sefić"|property="article:author"/);
  assert.match(syndicated, /<meta name="editor" content="Nermin Sefić">/);
  assert.match(syndicated, /name="keywords" content="Topic"/);
  assert.match(syndicated, /name="news_keywords" content="Editorial integrity"/);
  assert.doesNotMatch(syndicated, /name="news_keywords" content="[^"]*(?:Nermin|#|BusinessIntelligence)/i);
  assert.doesNotMatch(syndicated, /class="article-author"|class="editorial-author-inline"[^>]*>\s*<strong>Author:<\/strong>\s*Nermin/i);
  assert.match(syndicated, /class="editorial-approval"/, 'neutral editor-in-chief responsibility must remain visible');
  assert.doesNotMatch(syndicated, /#(?:NerminSefic|NerminSefić|SeficNermin|SefićNermin|Topic)|class="article-hashtags"/i);
  const syndicatedSchema = JSON.parse(syndicated.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)[1]);
  assert.equal(syndicatedSchema.author, undefined);
  assert.equal(syndicatedSchema.editor?.name, 'Nermin Sefić');
  assert.deepEqual(syndicatedSchema.keywords, ['Topic']);
  assert.deepEqual(syndicatedSchema.about, ['Editorial integrity']);
  const syndicatedLdJsonBodies = syndicated.split('<script type="application/ld+json">').slice(1).map((part) => part.split('</script>')[0]);
  const syndicatedWebsiteSchema = JSON.parse(syndicatedLdJsonBodies[1]);
  assert.equal(syndicatedWebsiteSchema.name, 'GNK ASG');
  assert.equal(syndicatedWebsiteSchema.keywords, undefined);

  for (const [relative, before] of protectedBefore) {
    assert.equal(fs.readFileSync(path.join(temp, relative), 'utf8'), before, `${relative} must remain byte-identical`);
  }
  console.log(JSON.stringify({
    ok: true,
    verifiedAuthorshipSeparatedFromEditor: true,
    syndicatedItemHasNoPersonalAuthor: true,
    socialHashtagsNotInjectedIntoArticleBodies: true,
    protectedRoutesUntouched: true,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
