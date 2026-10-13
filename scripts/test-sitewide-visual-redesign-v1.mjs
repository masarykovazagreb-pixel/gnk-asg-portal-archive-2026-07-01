import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPortalVisualRedesign, portalTopicArt, portalVisualMode, VERSION } from '../workers/gnk-asg-direct-operator/src/sitewide-visual-redesign-v1.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portalRoot = path.join(repoRoot, 'apps/portal');
const GLOBAL_CSS = '/assets/portal-colorful-redesign-v1.css';
const AKTUAL_CSS = '/assets/aktual-media-polish-v1.css';
const PUBLISHING_CSS = '/assets/publishing-desk-refresh-v1.css';

function collectFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(fullPath));
    else output.push(fullPath);
  }
  return output;
}

function routeForFile(file) {
  const relative = path.relative(portalRoot, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'/index.html'.length)}/`;
  return `/${relative}`;
}

function references(html, pattern) {
  return [...html.matchAll(pattern)].map(match => match[1]);
}

function structuralSignature(html) {
  return {
    scripts: references(html, /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
    inlineScripts: [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]),
    links: references(html, /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
    ids: references(html, /\bid=["']([^"']+)["']/gi),
    forms: (html.match(/<form\b/gi) || []).length,
    controls: (html.match(/<(?:input|select|textarea|button)\b/gi) || []).length
  };
}

function stripInjectedVisualLayer(html) {
  return html
    .replace(/<link\b[^>]*data-gnk-visual-layer=["'][^"']+["'][^>]*>/gi, '')
    .replace(/\sdata-gnk-(?:site-design|topic-art|aktual-polish|publishing-design)=["'][^"']+["']/gi, '');
}

assert.match(VERSION, /ROUTE_ISOLATED_TOPIC_MEDIA/);
assert.equal(portalTopicArt('/'), 'corporate');
assert.equal(portalTopicArt('/en/markets/'), 'markets');
assert.equal(portalTopicArt('/analize/'), 'research');
assert.equal(portalTopicArt('/tehnologija/'), 'technology');
assert.equal(portalTopicArt('/projects/'), 'projects');
assert.equal(portalTopicArt('/newsroom/'), 'newsroom');
assert.equal(portalTopicArt('/teme/'), 'research');
assert.equal(portalTopicArt('/world-table/'), 'culinary');
assert.equal(portalTopicArt('/cibona/'), 'sports');
const activeEntrypoint = fs.readFileSync(path.join(repoRoot, 'workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js'), 'utf8');
assert.match(activeEntrypoint, /applyPortalVisualRedesign\(sourceHtml,new URL\(request\.url\)\.pathname\)/, 'the active Worker must apply the route-aware visual layer');

const indexFixture = `<!doctype html><html lang="hr"><head><title>Index</title><script src="/assets/app.js" defer></script></head><body><main id="top"><a href="#markets">Market</a><form id="search" action="/search/"><input id="query"><button type="submit">Search</button></form><section id="markets"></section></main></body></html>`;
const redesignedIndex = applyPortalVisualRedesign(indexFixture, '/');
assert.match(redesignedIndex, /data-gnk-site-design="colorful-v1"/);
assert.match(redesignedIndex, /data-gnk-topic-art="corporate"/);
assert.match(redesignedIndex, new RegExp(`${GLOBAL_CSS}\\?v=20261012-topic-media-v1`));
assert.deepEqual(structuralSignature(redesignedIndex), structuralSignature(indexFixture), 'index structure and behavior hooks must be preserved');
assert.equal(applyPortalVisualRedesign(redesignedIndex, '/'), redesignedIndex, 'the transform must be idempotent');
assert.equal(portalVisualMode('/en/?utm_source=test'), 'full-redesign');
assert.equal(portalVisualMode('/assets/seo-gallery/preview.html'), 'static-asset-untouched');
assert.equal(portalVisualMode('/google46686328e30c759f.html'), 'static-asset-untouched');

for (const route of [
  '/spt/', '/spt/en/', '/spt/uk/galerija/watch/',
  '/objave/spt-sports-performance-tracking-gnk-asg/', '/en/publications/spt-sports-performance-tracking-gnk-asg/',
  '/bank/', '/en/bank/', '/adria-bank-project/', '/en/adria-bank-project/',
  '/aktual/adria-bank-project-update/', '/en/publications/managing-exporter-bank-guarantees/'
]) {
  const source = '<!doctype html><html lang="hr"><head><title>Protected visual</title></head><body>Keep as is</body></html>';
  assert.equal(applyPortalVisualRedesign(source, route), source, `${route} must not receive injected design CSS`);
}

const aktualRoute = '/gnk-aktual/';
const aktualHtml = applyPortalVisualRedesign('<html lang="hr"><head></head><body data-aktual-view="home"></body></html>', aktualRoute);
assert.equal(portalVisualMode(aktualRoute), 'aktual-media-polish');
assert.match(aktualHtml, /data-gnk-aktual-polish="v1"/);
assert.match(aktualHtml, new RegExp(`${AKTUAL_CSS}\\?v=`));
assert.doesNotMatch(aktualHtml, new RegExp(GLOBAL_CSS));

for (const route of ['/admin-center/news-publication/', '/admin-center/editorial-approval/']) {
  const html = applyPortalVisualRedesign('<html lang="hr"><head></head><body><button id="refresh">Refresh</button></body></html>', route);
  assert.equal(portalVisualMode(route), 'publishing-desk-polish');
  assert.match(html, /data-gnk-publishing-design="v1"/);
  assert.match(html, new RegExp(`${PUBLISHING_CSS}\\?v=`));
  assert.doesNotMatch(html, new RegExp(GLOBAL_CSS));
  assert.match(html, /<button id="refresh">Refresh<\/button>/, 'publishing controls must remain unchanged');
}

const publishingInvariants = [
  {
    route: '/admin-center/news-publication/',
    file: 'admin-center/news-publication/index.html',
    markers: ['/api/news-auto-publication/list?cb=', "credentials:'same-origin'", 'id=\"refresh\"']
  },
  {
    route: '/admin-center/editorial-approval/',
    file: 'admin-center/editorial-approval/index.html',
    markers: ['id=\"statusFilter\"', 'id=\"exportDecisions\"', 'data-view=\"projects\"']
  }
];
for (const item of publishingInvariants) {
  const source = fs.readFileSync(path.join(portalRoot, item.file), 'utf8');
  const transformed = applyPortalVisualRedesign(source, item.route);
  assert.equal(stripInjectedVisualLayer(transformed), source, `${item.route} must only gain a CSS link and scope marker`);
  assert.deepEqual(structuralSignature(transformed), structuralSignature(source), `${item.route} field/button/script wiring changed`);
  for (const marker of item.markers) assert.ok(source.includes(marker), `${item.route} lost invariant ${marker}`);
}

const editorialClient = fs.readFileSync(path.join(portalRoot, 'assets/editorial-approval-v1.js'), 'utf8');
assert.ok(editorialClient.includes("const DATA_URL='/api/editorial-approval/queue'"));
assert.ok(editorialClient.includes("credentials:'same-origin'"));
assert.ok(editorialClient.includes('publicationAuthorized:false'));
const authRuntime = fs.readFileSync(path.join(repoRoot, 'workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js'), 'utf8');
assert.ok(authRuntime.includes("['/api/editorial-approval/queue','/data/editorial-approval-queue.json']"));
assert.ok(authRuntime.includes('Operator/admin session required.'));
assert.ok(authRuntime.includes("headers.set('x-gnk-editorial-approval-protected','v1-session-required')"));
const publicationRuntime = fs.readFileSync(path.join(repoRoot, 'workers/gnk-asg-direct-operator/src/index-unified-auth-v15.js'), 'utf8');
assert.ok(publicationRuntime.includes('isNewsAutoPublicationAuthenticated(request,env,ctx)'));
assert.ok(publicationRuntime.includes('valid service token required.'));

for (const route of [
  '/admin-center/', '/admin-center/contacts/', '/admin-center/operations/',
  '/admin/', '/mail-studio/', '/campaign-mailer/', '/media-application/',
  '/enterprise/', '/mission-control/', '/editorial-operations/', '/deployment/',
  '/seo/', '/language-review/', '/strategy-performance/', '/entities/', '/api/example/'
]) {
  assert.equal(portalVisualMode(route), 'protected-untouched', `${route} is a protected app outside this visual change`);
}

const htmlPages = collectFiles(portalRoot).filter(file => file.endsWith('.html'));
const indexPages = htmlPages.filter(file => path.basename(file).toLowerCase() === 'index.html');
const counts = { 'full-redesign': 0, 'aktual-media-polish': 0, 'publishing-desk-polish': 0, 'untouched-spt': 0, 'untouched-bank': 0, 'protected-untouched': 0, 'static-asset-untouched': 0 };
for (const file of htmlPages) {
  const route = routeForFile(file);
  const mode = portalVisualMode(route);
  counts[mode] = (counts[mode] || 0) + 1;
  const source = fs.readFileSync(file, 'utf8');
  const transformed = applyPortalVisualRedesign(source, route);
  const injectedMarkers = {
    'full-redesign': ['data-gnk-site-design="colorful-v1"', GLOBAL_CSS],
    'aktual-media-polish': ['data-gnk-aktual-polish="v1"', AKTUAL_CSS],
    'publishing-desk-polish': ['data-gnk-publishing-design="v1"', PUBLISHING_CSS]
  }[mode];
  if (injectedMarkers) {
    assert.ok(transformed.includes(injectedMarkers[0]), `${route} is missing its visual scope marker`);
    assert.ok(transformed.includes(injectedMarkers[1]), `${route} is missing its visual stylesheet`);
  }
  if (mode === 'untouched-spt' || mode === 'untouched-bank' || mode === 'protected-untouched' || mode === 'static-asset-untouched') {
    assert.equal(transformed, source, `${route} (${mode}) must remain byte-for-byte unchanged by the visual transformer`);
  } else {
    assert.equal(stripInjectedVisualLayer(transformed), source, `${route} must receive only the scoped marker and stylesheet link`);
  }
}

const sptPages = htmlPages.filter(file => path.relative(portalRoot, file).split(path.sep).includes('spt'));
assert.ok(sptPages.length >= 500, 'the complete SPT microsite should be scanned');
for (const file of sptPages) assert.equal(portalVisualMode(routeForFile(file)), 'untouched-spt');

for (const asset of [
  'portal-colorful-redesign-v1.css',
  'aktual-media-polish-v1.css',
  'publishing-desk-refresh-v1.css'
]) {
  assert.ok(fs.existsSync(path.join(portalRoot, 'assets', asset)), `missing design asset: ${asset}`);
}
const topicCss = fs.readFileSync(path.join(portalRoot, 'assets/portal-colorful-redesign-v1.css'), 'utf8');
for (const asset of [
  'corporate-network.jpg','markets-finance.jpg','technology-ai.jpg','projects-infrastructure.jpg',
  'newsroom-editorial.jpg','research-analysis.jpg','sports-community.jpg','culinary-world-table.jpg'
]) {
  assert.ok(fs.existsSync(path.join(portalRoot, 'assets/topic-media', asset)), `missing topic artwork: ${asset}`);
  assert.ok(topicCss.includes(asset), `topic artwork is not connected to the visual layer: ${asset}`);
}
assert.match(topicCss, /prefers-reduced-motion/);
assert.match(topicCss, /data-gnk-topic-art="culinary"\] \.food-hero/);
assert.match(topicCss, /data-gnk-topic-art\]:not\(\[data-gnk-topic-art="culinary"\]\)/, 'bespoke restaurant-city photography must not be replaced by generic food art');
assert.match(topicCss, /video:not\(\[data-gnk-video-unstyled\]\)/);

console.log(`PASS ${VERSION}`);
console.log(`Scanned ${htmlPages.length} HTML files (${indexPages.length} index routes): ${JSON.stringify(counts)}`);
console.log('Index links, forms, control counts, IDs and script sources remain unchanged.');
console.log('SPT/bank routes are untouched; AKTUAL and publishing surfaces use their isolated visual layers.');
