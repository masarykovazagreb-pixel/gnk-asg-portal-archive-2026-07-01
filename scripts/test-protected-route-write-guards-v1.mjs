import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-protected-route-guards-'));
const site = 'https://gnk-asg.hr';
const routes = {
  spt: '/objave/spt-protected/',
  bank: '/en/publications/bank-account-protected/',
  safe: '/objave/safe-editorial-test/',
  existingWebsite: '/objave/website-jsonld-normalize-test/',
};
const content = 'A substantive paragraph that is intentionally longer than one hundred and twenty characters so the metadata-description enhancer has a valid, factual description to use for its safe editorial fixture.';
const existingJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: 'Nermin Sefić',
      keywords: 'Nermin Sefić, #business',
      author: { '@type': 'Person', name: 'Nermin Sefić', url: `${site}/nermin-sefic/` },
      publisher: { '@type': 'Person', name: 'Nermin Sefić' },
    },
    {
      '@type': 'Article', '@id': `${site}/objave/verified-fixture/#article`, headline: 'Verified byline fixture',
      author: { '@type': 'Person', name: 'Nermin Sefić', url: `${site}/nermin-sefic/` },
    },
  ],
});
const page = (route, jsonLd = '') => `<!doctype html><html lang="${route.startsWith('/en/') ? 'en' : 'hr'}"><head>
<meta name="description" content="Short description">
<meta name="keywords" content="Topic, Nermin Sefić, #Topic">
<meta property="og:description" content="Short description">
<meta name="twitter:description" content="Short description">
<link rel="canonical" href="${site}${route}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head><body><main><article class="article-body"><p class="byline">By Nermin Sefić</p><p>${content}</p></article></main></body></html>`;
const pageFile = (route) => `apps/portal${route}index.html`;
const write = (relative, value) => {
  const file = path.join(temp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
  return file;
};
const copy = (relative) => write(relative, fs.readFileSync(relative, 'utf8'));

try {
  for (const relative of [
    'scripts/add-share-buttons-v1.mjs',
    'scripts/rich-descriptions-v1.mjs',
    'scripts/add-breadcrumbs-v1.mjs',
    'scripts/add-feed-discovery-v1.mjs',
    'scripts/site-seo-guardian-v1.mjs',
    'scripts/ensure-website-jsonld-v1.mjs',
    'scripts/lib/editorial-attribution-v1.mjs',
    'scripts/lib/editorial-html-attribution-v1.mjs',
    'scripts/lib/social-hashtags-v1.mjs',
    'scripts/lib/seo-description-v1.mjs',
    'scripts/lib/editorial-route-protection-v1.mjs',
  ]) copy(relative);

  for (const [key, route] of Object.entries(routes)) {
    write(pageFile(route), page(route, key === 'existingWebsite' ? existingJsonLd : ''));
  }
  const standaloneHtml = 'apps/portal/standalone-fixture.html';
  write(standaloneHtml, page('/standalone-fixture.html'));
  write('apps/portal/data/editorial-registry.json', JSON.stringify({ items: Object.entries(routes).map(([key, route]) => ({
    path: route,
    url: `${site}${route}`,
    title: `${key} editorial fixture`,
    language: route.startsWith('/en/') ? 'en' : 'hr',
  })) }, null, 2));

  const protectedFiles = [routes.spt, routes.bank].map((route) => [pageFile(route), fs.readFileSync(path.join(temp, pageFile(route)), 'utf8')]);
  const safeFile = pageFile(routes.safe);
  const run = (script, args = []) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: temp, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  const verifyProtected = (step) => {
    for (const [relative, before] of protectedFiles) {
      assert.equal(fs.readFileSync(path.join(temp, relative), 'utf8'), before, `${relative} changed during ${step}`);
    }
  };
  const verifySafeChanged = (step, before) => {
    assert.notEqual(fs.readFileSync(path.join(temp, safeFile), 'utf8'), before, `safe editorial page was not updated by ${step}`);
  };

  let beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const shares = run('scripts/add-share-buttons-v1.mjs');
  assert.equal(shares.protectedSkipped, 2);
  verifyProtected('share-button insertion');
  verifySafeChanged('share-button insertion', beforeSafe);

  beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const descriptions = run('scripts/rich-descriptions-v1.mjs');
  assert.equal(descriptions.protectedSkipped, 2);
  verifyProtected('rich-description generation');
  verifySafeChanged('rich-description generation', beforeSafe);

  beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const breadcrumbs = run('scripts/add-breadcrumbs-v1.mjs');
  assert.equal(breadcrumbs.protectedSkipped, 2);
  verifyProtected('editorial breadcrumbs');
  verifySafeChanged('editorial breadcrumbs', beforeSafe);

  beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const feeds = run('scripts/add-feed-discovery-v1.mjs');
  assert.equal(feeds.protectedSkipped, 2);
  verifyProtected('feed-discovery insertion');
  verifySafeChanged('feed-discovery insertion', beforeSafe);

  beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const seo = run('scripts/site-seo-guardian-v1.mjs', ['--write']);
  assert.equal(seo.protectedSkipped, 2);
  verifyProtected('site-wide keyword hygiene');
  verifySafeChanged('site-wide keyword hygiene', beforeSafe);
  assert.match(fs.readFileSync(path.join(temp, safeFile), 'utf8'), /name="keywords" content="Topic"/);

  beforeSafe = fs.readFileSync(path.join(temp, safeFile), 'utf8');
  const website = run('scripts/ensure-website-jsonld-v1.mjs', ['--write']);
  assert.equal(website.protectedSkipped, 2);
  assert.equal(website.eligiblePublicPages, 3);
  assert.equal(website.added, 2);
  assert.equal(website.normalized, 1);
  verifyProtected('WebSite JSON-LD normalization');
  verifySafeChanged('WebSite JSON-LD insertion', beforeSafe);

  const readNodes = (relative) => {
    const html = fs.readFileSync(path.join(temp, relative), 'utf8');
    const nodes = [];
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
      if (types.includes('WebSite') || types.includes('Article')) nodes.push(value);
      Object.values(value).forEach(visit);
    };
    for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { visit(JSON.parse(match[1])); } catch { /* unrelated malformed fixture schema */ }
    }
    return nodes;
  };
  const safeWebsite = readNodes(safeFile).find((node) => node['@type'] === 'WebSite');
  assert.ok(safeWebsite, 'safe page should receive a WebSite node');
  assert.equal(safeWebsite.name, 'GNK ASG');
  assert.equal(safeWebsite.publisher['@id'], 'https://gnk-asg.hr/#gnk-asg');
  const existingNodes = readNodes(pageFile(routes.existingWebsite));
  const websiteNode = existingNodes.find((node) => node['@type'] === 'WebSite');
  const articleNode = existingNodes.find((node) => node['@type'] === 'Article');
  assert.equal(websiteNode.name, 'GNK ASG');
  assert.equal(websiteNode.keywords, undefined);
  assert.equal(websiteNode.author, undefined);
  assert.equal(articleNode.author.name, 'Nermin Sefić', 'verified Article author must remain unchanged');
  assert.match(fs.readFileSync(path.join(temp, pageFile(routes.existingWebsite)), 'utf8'), /class="byline">By Nermin Sefić<\/p>/);
  const standaloneWebsite = readNodes(standaloneHtml).find((node) => node['@type'] === 'WebSite');
  assert.ok(standaloneWebsite, 'standalone .html page should receive a WebSite node');
  assert.equal(standaloneWebsite.name, 'GNK ASG');

  console.log(JSON.stringify({
    ok: true,
    protectedRoutesByteIdentical: true,
    safeEditorialRoutesStillUpdated: true,
    guardedWriters: [
      'add-share-buttons-v1.mjs',
      'rich-descriptions-v1.mjs',
      'add-breadcrumbs-v1.mjs',
      'add-feed-discovery-v1.mjs',
      'site-seo-guardian-v1.mjs',
      'ensure-website-jsonld-v1.mjs',
    ],
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
