import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PERSON_URL,
  PERSON_ID,
  ORGANIZATION_ID,
  articleAuthorFor,
  isProtectedEditorialItem,
  isVerifiedNerminAuthor,
} from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const ROOT = 'apps/portal';
const SITE = 'https://gnk-asg.hr';
const registry = JSON.parse(fs.readFileSync(`${ROOT}/data/editorial-registry.json`, 'utf8'));
const entries = registry.items || [];
const registryItemByRoute = new Map(entries.map((item) => [String(item.path || '').replace(/^\/+|\/+$/g, ''), item]));
const publishedArticles = entries.filter((item) => item.status === 'published'
  && ['objava', 'komentar', 'analiza', 'kolumna'].includes(item.type)
  && !isProtectedEditorialItem(item));
const verified = publishedArticles.find(isVerifiedNerminAuthor);
const organization = publishedArticles.find((item) => item.author === 'GNK ASG Intelligence Desk');
const unassigned = publishedArticles.find((item) => !item.author);
assert.ok(verified, 'registry must contain a verified personal author example');
assert.ok(organization, 'registry must contain an organizational author example');
assert.ok(unassigned, 'registry must contain an unattributed example');

function pageHtml(item) {
  const file = `${ROOT}/${String(item.path).replace(/^\/+|\/+$/g, '')}/index.html`;
  assert.ok(fs.existsSync(file), `missing page ${item.path}`);
  return fs.readFileSync(file, 'utf8');
}
function articleNode(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of scripts) {
    let schema;
    try { schema = JSON.parse(raw); } catch { continue; }
    const nodes = Array.isArray(schema) ? schema : Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
    const found = nodes.find((node) => {
      const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
      return types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type));
    });
    if (found) return found;
  }
  return null;
}
function metaValues(html, keyAttribute, key) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
    .filter((tag) => new RegExp(`\\b${keyAttribute}=[\"']${key}[\"']`, 'i').test(tag))
    .map((tag) => tag.match(/\bcontent=[\"']([^\"']*)[\"']/i)?.[1] || '');
}
function normalizedTag(value) {
  return String(value || '').replace(/^#+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}
const SKIP_PUBLIC_ROOTS = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'podijeli', 'api', 'assets', 'data', '__preview', 'bank', 'spt',
]);
function publicIndexFiles() {
  const files = [];
  const walk = (directory) => {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name);
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      const segments = relative.split('/');
      if (segments[0] && SKIP_PUBLIC_ROOTS.has(segments[0])) continue;
      if (segments[0] === 'en' && segments[1] && SKIP_PUBLIC_ROOTS.has(segments[1])) continue;
      const stat = fs.statSync(file);
      if (stat.isDirectory()) walk(file);
      else if (name === 'index.html') files.push(file);
    }
  };
  walk(ROOT);
  return files;
}
function visitSchema(value, visitor) {
  if (Array.isArray(value)) return value.forEach((entry) => visitSchema(entry, visitor));
  if (!value || typeof value !== 'object') return;
  visitor(value);
  for (const child of Object.values(value)) visitSchema(child, visitor);
}
function hasExplicitNerminByline(html) {
  return /<(?:aside|section|div|p)\b[^>]*class=[\"'][^\"']*\b(?:author-box|author-card|article-author|author-meta|article-meta|byline)\b[^\"']*[\"'][^>]*>[\s\S]{0,1600}?nermin\s+sefi[cć]/i.test(html)
    || /itemprop=[\"']author[\"'][^>]*>[\s\S]{0,1000}?nermin\s+sefi[cć]/i.test(html)
    || /(?:author|autor)\s*:[\s\S]{0,300}?nermin\s+sefi[cć]/i.test(html);
}
function rssItem(feed, url) {
  const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return items.find((item) => item.includes(`<guid isPermaLink="true">${url}</guid>`) || item.includes(`<link>${url}</link>`));
}
function atomEntry(feed, url) {
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
  return entries.find((entry) => entry.includes(`<id>${url}</id>`));
}

const coreSocialTokens = ['GNKASG', 'GNKDINAMOLtd', 'BusinessIntelligence'];
for (const item of publishedArticles) {
  const html = pageHtml(item);
  const schema = articleNode(html);
  assert.ok(schema, `${item.path} must expose Article JSON-LD`);
  assert.equal(schema.editor?.['@id'], PERSON_ID, `${item.path} must identify Nermin as editor, not infer authorship`);
  assert.equal(schema.publisher?.['@id'], ORGANIZATION_ID, `${item.path} must keep GNK ASG as publisher`);
  assert.ok(metaValues(html, 'name', 'editor').includes('Nermin Sefić'), `${item.path} must expose neutral editor metadata`);

  const author = articleAuthorFor(item);
  const metaAuthor = metaValues(html, 'name', 'author')[0] || '';
  const schemaAuthors = Array.isArray(schema.author) ? schema.author : [schema.author];
  if (author) assert.equal(metaAuthor, author.name, `${item.path} must use its registry-approved author`);
  else assert.doesNotMatch(metaAuthor, /nermin|sefi[cć]/i, `${item.path} must not infer Nermin as author`);
  if (!author || author['@type'] !== 'Person') {
    assert.ok(schemaAuthors.every((entry) => !/nermin|sefi[cć]/i.test(typeof entry === 'string' ? entry : `${entry?.name || ''} ${entry?.['@id'] || ''}`)), `${item.path} must not assign Nermin personal authorship`);
  } else {
    assert.equal(schema.author?.['@type'], 'Person');
    assert.equal(schema.author?.['@id'], PERSON_ID);
  }

  const socialTokens = new Set([...coreSocialTokens, ...(Array.isArray(item.hashtags) ? item.hashtags : [])].map(normalizedTag));
  const metaKeywords = [...metaValues(html, 'name', 'keywords'), ...metaValues(html, 'name', 'news_keywords')]
    .flatMap((value) => value.split(',').map((word) => word.trim()));
  assert.ok(metaKeywords.every((word) => word && !/^#/u.test(word) && !/nermin|sefi[cć]/i.test(word) && !socialTokens.has(normalizedTag(word))), `${item.path} must keep social hashtags and personal names out of SEO keywords`);
  assert.ok(metaValues(html, 'property', 'article:tag').every((tag) => !/^#/u.test(tag) && !/nermin|sefi[cć]/i.test(tag)), `${item.path} must not turn hashtags or personal names into article tags`);

  const schemaKeywords = Array.isArray(schema.keywords) ? schema.keywords : typeof schema.keywords === 'string' ? schema.keywords.split(',') : [];
  assert.ok(schemaKeywords.every((word) => !/^#/u.test(String(word).trim()) && !/nermin|sefi[cć]/i.test(String(word)) && !socialTokens.has(normalizedTag(word))), `${item.path} must not use social hashtags as schema.org keywords`);
  const about = Array.isArray(schema.about) ? schema.about : [schema.about];
  assert.ok(about.every((entry) => {
    const name = typeof entry === 'string' ? entry : entry?.name;
    return !name || (!String(name).trim().startsWith('#') && !socialTokens.has(normalizedTag(name)));
  }), `${item.path} must not leak social hashtag tokens into schema.org about metadata`);
}

let publicPagesAudited = 0;
const unregisteredVisibleBylines = new Set();
for (const file of publicIndexFiles()) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const directory = path.dirname(relative);
  const route = directory === '.' ? '/' : `/${directory}/`;
  if (isProtectedEditorialRoute(route)) continue;
  const routeItem = registryItemByRoute.get(route.replace(/^\/+|\/+$/g, '')) || null;
  const seoSocialTokens = new Set([...(routeItem ? coreSocialTokens : []), ...(Array.isArray(routeItem?.hashtags) ? routeItem.hashtags : [])].map(normalizedTag));
  const aboutSocialTokens = new Set([...coreSocialTokens, ...(Array.isArray(routeItem?.hashtags) ? routeItem.hashtags : [])].map(normalizedTag));
  const html = fs.readFileSync(file, 'utf8');
  if (/\bnoindex\b/i.test(html) || /http-equiv=["']refresh["']/i.test(html)) continue;
  publicPagesAudited++;
  for (const value of [...metaValues(html, 'name', 'keywords'), ...metaValues(html, 'name', 'news_keywords')]) {
    const terms = value.split(',').map((word) => word.trim());
    assert.ok(terms.every((word) => !/^#/u.test(word) && !/nermin|sefi[cć]/i.test(word) && !seoSocialTokens.has(normalizedTag(word))), `${route} must not use hashtags or personal names as SEO meta keywords`);
  }
  assert.ok(metaValues(html, 'property', 'article:tag').every((tag) => !/^#/u.test(tag) && !/nermin|sefi[cć]/i.test(tag)), `${route} must not put a personal name or literal hashtag in article tags`);
  for (const [, raw] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    visitSchema(data, (node) => {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      const isArticle = types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type));
      const authors = Array.isArray(node.author) ? node.author : [node.author];
      const hasNerminAuthor = authors.some((author) => /nermin|sefi[cć]/i.test(typeof author === 'string' ? author : `${author?.name || ''} ${author?.['@id'] || ''}`));
      if (isArticle && hasNerminAuthor && !routeItem) {
        assert.ok(hasExplicitNerminByline(html), `${route} has Nermin as schema author but no explicit visible byline`);
        unregisteredVisibleBylines.add(route);
      }
      if (types.includes('WebSite')) {
        assert.equal(node.name, 'GNK ASG', `${route} must keep the website entity separate from the personal editor`);
        assert.equal(node.keywords, undefined, `${route} must not repeat generic site-wide terms as WebSite keywords`);
      } else if ('keywords' in node) {
        const values = Array.isArray(node.keywords) ? node.keywords : typeof node.keywords === 'string' ? node.keywords.split(',') : [];
        assert.ok(values.every((word) => !/^#/u.test(String(word).trim()) && !/nermin|sefi[cć]/i.test(String(word)) && !seoSocialTokens.has(normalizedTag(word))), `${route} must keep social hashtags and personal names out of schema.org keywords`);
      }
      if ('about' in node) {
        const about = Array.isArray(node.about) ? node.about : [node.about];
        assert.ok(about.every((entry) => {
          const name = typeof entry === 'string' ? entry : entry?.name;
          return !name || (!String(name).trim().startsWith('#') && !aboutSocialTokens.has(normalizedTag(name)));
        }), `${route} must not leak social hashtag tokens into schema.org about metadata`);
      }
    });
  }
}

const verifiedLegacyBylinePath = `${ROOT}/aktual/gnk-asg-504-milijuna-eura-prihoda/index.html`;
const verifiedLegacyBylineHtml = fs.readFileSync(verifiedLegacyBylinePath, 'utf8');
const verifiedLegacyBylineSchema = articleNode(verifiedLegacyBylineHtml);
assert.ok(verifiedLegacyBylineSchema, 'legacy page with an explicit visible byline must retain its article schema');
assert.equal(verifiedLegacyBylineSchema.author?.name, 'Nermin Sefić', 'a visible, explicit byline supports personal authorship even outside the editorial registry');
assert.match(verifiedLegacyBylineHtml, /itemprop="author"/);
assert.match(verifiedLegacyBylineHtml, /itemprop="name">Nermin Sefić/);
assert.ok(metaValues(verifiedLegacyBylineHtml, 'property', 'article:author').includes('Nermin Sefić'));
assert.match(verifiedLegacyBylineHtml, /name="editor" content="Nermin Sefić"/);
assert.doesNotMatch(verifiedLegacyBylineHtml, /name="keywords" content="[^"]*(?:Nermin|#)/i);
assert.ok(metaValues(verifiedLegacyBylineHtml, 'property', 'article:tag').every((tag) => !/nermin|sefi[cć]/i.test(tag)));
assert.ok(!(Array.isArray(verifiedLegacyBylineSchema.keywords) ? verifiedLegacyBylineSchema.keywords : [verifiedLegacyBylineSchema.keywords]).some((word) => /nermin|sefi[cć]/i.test(String(word))));

const verifiedHtml = pageHtml(verified);
const verifiedSchema = articleNode(verifiedHtml);
assert.ok(verifiedSchema, 'verified page must expose Article JSON-LD');
assert.equal(verifiedSchema.author?.['@type'], 'Person');
assert.equal(verifiedSchema.author?.['@id'], PERSON_ID);
assert.equal(verifiedSchema.editor?.['@id'], PERSON_ID, 'same Person entity can hold distinct author and editor roles');
assert.match(verifiedHtml, /<meta name="author" content="Nermin Sefić">/);
assert.ok(verifiedHtml.includes(`property="article:author" content="${PERSON_URL}"`));
assert.match(verifiedHtml, /name="editor" content="Nermin Sefić"/);

const organizationHtml = pageHtml(organization);
const organizationSchema = articleNode(organizationHtml);
assert.ok(organizationSchema, 'organizationally authored page must expose Article JSON-LD');
assert.equal(organizationSchema.author?.['@type'], 'Organization');
assert.equal(organizationSchema.author?.['@id'], `${SITE}/#intelligence-desk`);
assert.equal(organizationSchema.editor?.['@id'], PERSON_ID);
assert.match(organizationHtml, /<meta name="author" content="GNK ASG Intelligence Desk">/);
assert.match(organizationHtml, /name="editor" content="Nermin Sefić"/);
assert.doesNotMatch(organizationHtml, /property="article:author" content="[^"]*nermin/i);
assert.doesNotMatch(organizationHtml, /<meta name="(?:news_)?keywords"[^>]*content="[^"]*(?:#|nermin|sefic)/i);
assert.doesNotMatch(organizationHtml, /property="article:tag" content="[^"]*(?:#|nermin|sefic)/i);
assert.doesNotMatch(organizationHtml, /class="(?:article-hashtags|article-tags|hashtag-list)"/i);
const organizationAbout = Array.isArray(organizationSchema.about) ? organizationSchema.about : [organizationSchema.about];
assert.ok(organizationAbout.every((entry) => !/#|GNKASG|GNKDINAMOLtd|BusinessIntelligence/i.test(typeof entry === 'string' ? entry : entry?.name || '')));

const unassignedHtml = pageHtml(unassigned);
const unassignedSchema = articleNode(unassignedHtml);
assert.ok(unassignedSchema, 'unassigned page must expose Article JSON-LD');
assert.equal(unassignedSchema.author, undefined, 'no author must be inferred from editor or publisher');
assert.equal(unassignedSchema.editor?.['@id'], PERSON_ID);
assert.doesNotMatch(unassignedHtml, /<meta name="author"[^>]*content="Nermin Sefić"|property="article:author" content="[^"]*nermin/i);

const rssHr = fs.readFileSync(`${ROOT}/feed.xml`, 'utf8');
const rssEn = fs.readFileSync(`${ROOT}/en/feed.xml`, 'utf8');
const atomHr = fs.readFileSync(`${ROOT}/atom.xml`, 'utf8');
const atomEn = fs.readFileSync(`${ROOT}/en/atom.xml`, 'utf8');
for (const item of [verified, organization, unassigned]) {
  const language = item.language === 'en' || item.path.startsWith('/en/') ? 'en' : 'hr';
  const rss = language === 'en' ? rssEn : rssHr;
  const atom = language === 'en' ? atomEn : atomHr;
  const rssEntry = rssItem(rss, item.url);
  const atomItem = atomEntry(atom, item.url);
  assert.ok(rssEntry, `RSS must include ${item.path}`);
  assert.ok(atomItem, `Atom must include ${item.path}`);
  const author = articleAuthorFor(item);
  if (author) {
    assert.ok(rssEntry.includes(`<dc:creator>${author.name}</dc:creator>`));
    assert.ok(atomItem.includes(`<author><name>${author.name}</name>`));
    if (author.url) assert.ok(atomItem.includes(`<uri>${author.url}</uri>`), 'Atom author entry should point to the attributed author entity');
  } else {
    assert.doesNotMatch(rssEntry, /<dc:creator>/);
    assert.doesNotMatch(atomItem, /<author>/);
  }
  assert.doesNotMatch(rssEntry, /#Nermin|#Sefic|#NerminSefic/i, 'RSS categories must not be hashtags or author keywords');
}

const llms = fs.readFileSync(`${ROOT}/llms-full.txt`, 'utf8');
assert.match(llms, /attribution=Nermin Sefić/);
assert.match(llms, /attribution=GNK ASG Intelligence Desk/);
assert.doesNotMatch(llms, /attribution=Nermin Sefić[^\n]*unassigned/);
const aiHtml = fs.readFileSync(`${ROOT}/ai/index.html`, 'utf8');
assert.match(aiHtml, /name="editor" content="Nermin Sefić"/);
assert.doesNotMatch(aiHtml, /<meta name="author"/);
assert.match(aiHtml, /editorial responsibility is distinct from authorship/i);
const entityGraph = JSON.parse(fs.readFileSync(`${ROOT}/nermin-sefic/entity.jsonld`, 'utf8'));
const graphNodes = entityGraph['@graph'] || [];
assert.ok(graphNodes.some((node) => node['@id'] === ORGANIZATION_ID && node['@type'] === 'Organization'));
assert.ok(graphNodes.some((node) => node['@id'] === PERSON_ID && node['@type'] === 'Person'));

console.log(JSON.stringify({
  ok: true,
  registry: entries.length,
  registryPagesAudited: publishedArticles.length,
  publicPagesAudited,
  unregisteredVisibleBylinesAudited: unregisteredVisibleBylines.size,
  registryAttributionCompliant: true,
  socialTagsSeparatedFromSeo: true,
  examples: { verified: verified.path, organization: organization.path, unassigned: unassigned.path },
  authorEditorPublisherDistinct: true,
  verifiedLegacyBylinePreserved: true,
  rssAtomUseRegistryBylines: true,
  hashtagsNotUsedAsFeedKeywords: true,
  llmsAndEntityGraphConsistent: true,
}, null, 2));
