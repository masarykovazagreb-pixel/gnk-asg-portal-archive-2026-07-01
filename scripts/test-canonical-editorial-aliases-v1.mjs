#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const site = 'https://gnk-asg.hr';
const target = `${site}/autorske-objave/hrvatski-softver-izvoz-nevidljivi-lider.html`;
const aliases = [
  {
    file: 'apps/portal/komentari/hrvatski-softver-izvoz-nevidljivi-lider/index.html',
    route: '/komentari/hrvatski-softver-izvoz-nevidljivi-lider/',
  },
  {
    file: 'apps/portal/objave/hrvatski-softver-izvoz-nevidljivi-lider/index.html',
    route: '/objave/hrvatski-softver-izvoz-nevidljivi-lider/',
  },
  {
    file: 'apps/portal/gnk-aktual/kolumne/hrvatski-softver-izvoz-nevidljivi-lider/index.html',
    route: '/gnk-aktual/kolumne/hrvatski-softver-izvoz-nevidljivi-lider/',
  },
];

function attribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match?.[2]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() || '';
}
function tagValue(html, tagName, keyName, keyValue, valueName) {
  for (const match of html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))) {
    const tag = match[0];
    if (attribute(tag, keyName).toLowerCase() === keyValue.toLowerCase()) return attribute(tag, valueName);
  }
  return '';
}
function schemaUrl(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value['@id'] || value.url || '').trim();
  return '';
}
function types(node) {
  return (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]).filter(Boolean);
}
function visit(value, callback) {
  if (Array.isArray(value)) return value.forEach((entry) => visit(entry, callback));
  if (!value || typeof value !== 'object') return;
  callback(value);
  Object.values(value).forEach((entry) => visit(entry, callback));
}

const registry = JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json', 'utf8'));
const registryRoutes = new Set((registry.items || []).map((item) => item.path));
const targetFile = 'apps/portal/autorske-objave/hrvatski-softver-izvoz-nevidljivi-lider.html';
const targetHtml = fs.readFileSync(targetFile, 'utf8');
assert.equal(tagValue(targetHtml, 'link', 'rel', 'canonical', 'href'), target,
  'the existing authored page must remain the canonical owner');

for (const alias of aliases) {
  const html = fs.readFileSync(alias.file, 'utf8');
  assert.equal(tagValue(html, 'link', 'rel', 'canonical', 'href'), target, `${alias.route} canonical`);
  assert.equal(tagValue(html, 'meta', 'property', 'og:url', 'content'), target, `${alias.route} og:url`);
  assert.equal(registryRoutes.has(alias.route), false, `${alias.route} must not become a separate registry article`);

  const schemas = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    schemas.push(JSON.parse(match[1]));
  }
  const articles = [];
  const webpages = [];
  const breadcrumbs = [];
  for (const schema of schemas) visit(schema, (node) => {
    const nodeTypes = types(node);
    if (nodeTypes.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) articles.push(node);
    if (nodeTypes.includes('WebPage')) webpages.push(node);
    if (nodeTypes.includes('BreadcrumbList')) breadcrumbs.push(node);
  });
  assert.ok(articles.length, `${alias.route} must retain Article schema`);
  for (const article of articles) {
    if (article.url) assert.equal(schemaUrl(article.url), target, `${alias.route} Article.url`);
    assert.equal(schemaUrl(article.mainEntityOfPage), target, `${alias.route} Article.mainEntityOfPage`);
  }
  for (const page of webpages) {
    if (page.url) assert.equal(schemaUrl(page.url), target, `${alias.route} WebPage.url`);
    if (page['@id']) {
      assert.ok(page['@id'] === target || page['@id'] === `${target}#webpage`,
        `${alias.route} WebPage @id must resolve to its canonical page, found ${page['@id']}`);
    }
  }
  for (const breadcrumb of breadcrumbs) {
    const elements = breadcrumb.itemListElement || [];
    const finalItem = elements.at(-1)?.item;
    assert.equal(schemaUrl(finalItem), target, `${alias.route} final breadcrumb item`);
  }
}

console.log(JSON.stringify({
  ok: true,
  canonicalTarget: target,
  aliases: aliases.length,
  aliasRoutesExcludedFromRegistry: true,
  canonicalOgAndSchemaAligned: true,
}, null, 2));
