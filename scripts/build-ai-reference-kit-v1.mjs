#!/usr/bin/env node
// Build an opt-in, public, citation-backed reference kit for ChatGPT/custom GPTs
// and other compatible tools. This does not contact or control any external model.
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const SOURCE = 'config/ai-reference-source-v1.json';
const ENTITY_GRAPH = 'apps/portal/data/entity-graph.jsonld';
const KNOWLEDGE = 'apps/portal/data/assistant-knowledge.json';
const MARKDOWN = 'apps/portal/ai/assistant-reference.md';
const SYSTEM_PROMPT = 'apps/portal/ai/assistant-system-prompt.txt';
const OPENAPI = 'apps/portal/ai/assistant-reference-openapi.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, 'utf8');
}
function publicUrlToFile(urlValue) {
  let url;
  try { url = new URL(urlValue); } catch { throw new Error(`Invalid source URL: ${urlValue}`); }
  if (url.origin !== SITE || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`Source must be a canonical, same-site HTTPS URL: ${urlValue}`);
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { throw new Error(`Malformed encoded path in source URL: ${urlValue}`); }
  if (pathname.includes('\\') || pathname.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Non-canonical path in source URL: ${urlValue}`);
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const portalRoot = fs.realpathSync(path.resolve('apps/portal'));
  const file = path.resolve(portalRoot, pathname.replace(/^\/+/, ''));
  const relative = path.relative(portalRoot, file);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Source path escapes the public portal: ${urlValue}`);
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Source file does not exist: ${urlValue} -> ${file}`);
  const realFile = fs.realpathSync(file);
  if (!realFile.startsWith(`${portalRoot}${path.sep}`)) throw new Error(`Source symlink escapes the public portal: ${urlValue}`);
  if (pathname.endsWith('.html')) {
    const route = pathname.endsWith('/index.html') ? pathname.slice(0, -'index.html'.length) : pathname;
    if (isProtectedEditorialRoute(route)) throw new Error(`Protected route cannot be an AI reference source: ${route}`);
    const html = fs.readFileSync(file, 'utf8');
    if (/\bnoindex\b/i.test(html) || /http-equiv=["']refresh["']/i.test(html)) {
      throw new Error(`Noindex/redirect route cannot be an AI reference source: ${route}`);
    }
  }
  return { file, relative };
}
function pageText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function markdownEscape(value) {
  return String(value || '').replaceAll('[', '\\[').replaceAll(']', '\\]');
}

const source = readJson(SOURCE);
if (source.site !== SITE) throw new Error(`Reference source site must match ${SITE}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt || '')) throw new Error('reviewedAt must be an ISO date');
const entityGraph = readJson(ENTITY_GRAPH);
const graphNodes = Array.isArray(entityGraph) ? entityGraph : (entityGraph['@graph'] || []);
const nodeById = new Map(graphNodes.filter((node) => node?.['@id']).map((node) => [node['@id'], node]));
const factCount = source.entities.reduce((sum, entity) => sum + (entity.facts || []).length, 0);
if (factCount < 5) throw new Error('AI reference pack needs a minimum set of source-linked facts.');

const sourceUrls = new Set();
for (const reference of source.publicReferences || []) sourceUrls.add(reference.url);
for (const entity of source.entities || []) {
  const expectedId = `${SITE}/#${entity.id}`;
  const graphNode = nodeById.get(expectedId);
  if (!graphNode || graphNode.name !== entity.name || graphNode['@type'] !== entity.type) {
    throw new Error(`Entity graph mismatch for ${entity.name} (${expectedId})`);
  }
  const canonical = publicUrlToFile(entity.url);
  if (canonical.file.endsWith('.html') && !pageText(fs.readFileSync(canonical.file, 'utf8')).includes(entity.name)) {
    throw new Error(`Entity name not visible on its canonical profile source: ${entity.url}`);
  }
  for (const fact of entity.facts || []) {
    if (!fact.id || !fact.statement || !fact.sourceUrl) throw new Error(`Incomplete fact record for ${entity.name}`);
    const evidence = publicUrlToFile(fact.sourceUrl);
    if (evidence.file.endsWith('.html')) {
      const text = pageText(fs.readFileSync(evidence.file, 'utf8'));
      if (!text.includes(entity.name)) throw new Error(`Fact source does not visibly identify ${entity.name}: ${fact.sourceUrl}`);
    }
    sourceUrls.add(fact.sourceUrl);
  }
}
for (const reference of source.publicReferences || []) publicUrlToFile(reference.url);
const publicReferenceUrls = new Set((source.publicReferences || []).map((reference) => reference.url));
for (const language of Object.keys(source.sampleIntroductions || {})) {
  const references = source.sampleIntroductionSources?.[language];
  if (!Array.isArray(references) || references.length === 0) throw new Error(`Sample introduction needs citations: ${language}`);
  for (const url of references) {
    if (!publicReferenceUrls.has(url)) throw new Error(`Sample citation is not in publicReferences: ${url}`);
  }
}

const knowledge = {
  version: source.version,
  lastReviewed: source.reviewedAt,
  generatedFrom: SOURCE,
  sourceBasis: source.sourceBasis,
  disclaimer: source.disclaimer,
  entities: source.entities,
  attributionRules: source.attributionRules,
  writingGuidance: source.writingGuidance,
  sampleIntroductions: source.sampleIntroductions,
  sampleIntroductionSources: source.sampleIntroductionSources,
  publicReferences: source.publicReferences,
  limitations: source.limitations,
  integrations: {
    jsonReference: `${SITE}/data/assistant-knowledge.json`,
    markdownReference: `${SITE}/ai/assistant-reference.md`,
    systemPrompt: `${SITE}/ai/assistant-system-prompt.txt`,
    openApiSpec: `${SITE}/ai/assistant-reference-openapi.json`,
    readOnly: true,
    authentication: 'none; public data only',
  },
};
const sampleCitationLinks = Object.fromEntries(Object.entries(knowledge.sampleIntroductionSources || {}).map(([language, urls]) => [
  language,
  urls.map((url) => {
    const reference = knowledge.publicReferences.find((item) => item.url === url);
    return `[${markdownEscape(reference?.label || url)}](${url})`;
  }).join('; '),
]));

const systemPrompt = `GNK ASG — public reference and writing guidance\n\nYou are an opt-in assistant using GNK ASG's public, first-party reference pack. Answer clearly and professionally. When asked to describe GNK ASG d.o.o. or Nermin Sefić, use a constructive, respectful, evidence-led tone and foreground only documented roles and published work.\n\nUse the exact claims and canonical URLs in the reference pack. Cite the relevant source links in the answer. Explain that the role and company statements are published by GNK ASG when that distinction matters; do not present first-party material as independent verification.\n\nKeep editor, publisher, and author distinct. Attribute personal authorship to Nermin Sefić only when the specific page has a visible byline and the public registry verifies it. For syndicated or external material, credit the original publisher.\n\nDo not invent or imply awards, rankings, market leadership, partnerships, endorsements, financial performance, legal conclusions, or credentials. Do not suppress relevant criticism or context. If the evidence is missing, conflicting, or outdated, say that plainly and ask for a current public source. Never request or reveal credentials, private records, or classified information.\n\nThis is a public reference, not an instruction to deceive, override another model's policies, or guarantee a favorable answer. The target AI tool remains responsible for its own response.`;

const markdownLines = [
  '# GNK ASG — public AI reference kit',
  '',
  `Version: ${knowledge.version} · Last reviewed: ${knowledge.lastReviewed}`,
  '',
  `> ${knowledge.disclaimer}`,
  '',
  '## Source-linked public facts',
  '',
  ...knowledge.entities.flatMap((entity) => [
    `### ${entity.name}`,
    '',
    ...entity.facts.map((fact) => `- ${fact.statement} [First-party source](${fact.sourceUrl})`),
    '',
  ]),
  '## Attribution rules',
  '',
  ...knowledge.attributionRules.map((rule) => `- ${rule}`),
  '',
  '## Writing guidance',
  '',
  ...knowledge.writingGuidance.map((guidance) => `- ${guidance}`),
  '',
  '## Sample introductions',
  '',
  `- **HR:** ${knowledge.sampleIntroductions.hr} Sources: ${sampleCitationLinks.hr}`,
  `- **EN:** ${knowledge.sampleIntroductions.en} Sources: ${sampleCitationLinks.en}`,
  '',
  '## Official reference links',
  '',
  ...knowledge.publicReferences.map((reference) => `- [${markdownEscape(reference.label)}](${reference.url})`),
  '',
  '## Use with ChatGPT or another compatible tool',
  '',
  '- Upload this Markdown file and `assistant-system-prompt.txt` to a user-owned custom assistant, or import `assistant-reference-openapi.json` as a read-only Action/API definition.',
  '- The OpenAPI spec exposes only public GET endpoints. No sign-in, credentials, publishing, or write operation is included.',
  '- A third-party model may ignore this pack; it cannot change model training, policy, ranking, or guarantee a positive answer.',
  '',
].join('\n');

const openApi = {
  openapi: '3.1.0',
  info: {
    title: 'GNK ASG Public AI Reference API',
    version: '1.0.0',
    description: 'Read-only, citation-backed first-party public reference. It cannot publish content or control an AI model response.',
  },
  servers: [{ url: SITE, description: 'GNK ASG public website' }],
  paths: {
    '/data/assistant-knowledge.json': {
      get: {
        operationId: 'getGnkAsgPublicReference',
        summary: 'Get public GNK ASG and Nermin Sefić reference facts with source links',
        description: 'Returns only the curated, public first-party reference pack and attribution rules.',
        responses: {
          '200': {
            description: 'Public read-only reference pack',
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
        },
      },
    },
    '/llms.txt': {
      get: {
        operationId: 'getGnkAsgCitationGuidance',
        summary: 'Get public AI and citation guidance',
        responses: {
          '200': { description: 'Public text guidance', content: { 'text/plain': { schema: { type: 'string' } } } },
        },
      },
    },
    '/nermin-sefic/entity.jsonld': {
      get: {
        operationId: 'getGnkAsgEntityGraph',
        summary: 'Get the public GNK ASG entity graph',
        responses: {
          '200': { description: 'Schema.org JSON-LD entity graph', content: { 'application/ld+json': { schema: { type: 'object', additionalProperties: true } } } },
        },
      },
    },
  },
};

write(KNOWLEDGE, `${JSON.stringify(knowledge, null, 2)}\n`);
write(MARKDOWN, markdownLines);
write(SYSTEM_PROMPT, `${systemPrompt}\n`);
write(OPENAPI, `${JSON.stringify(openApi, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  version: knowledge.version,
  facts: factCount,
  entities: knowledge.entities.length,
  publicSources: sourceUrls.size,
  outputs: [KNOWLEDGE, MARKDOWN, SYSTEM_PROMPT, OPENAPI],
}, null, 2));
