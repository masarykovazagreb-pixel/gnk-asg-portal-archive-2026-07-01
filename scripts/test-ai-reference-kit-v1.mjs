#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SITE = 'https://gnk-asg.hr';
const knowledgeText = fs.readFileSync('apps/portal/data/assistant-knowledge.json', 'utf8');
const knowledge = JSON.parse(knowledgeText);
const markdown = fs.readFileSync('apps/portal/ai/assistant-reference.md', 'utf8');
const prompt = fs.readFileSync('apps/portal/ai/assistant-system-prompt.txt', 'utf8');
const openApi = JSON.parse(fs.readFileSync('apps/portal/ai/assistant-reference-openapi.json', 'utf8'));
const aiPage = fs.readFileSync('apps/portal/ai/index.html', 'utf8');
const aiCss = fs.readFileSync('apps/portal/assets/ai-reference-v1.css', 'utf8');
const aiUi = fs.readFileSync('apps/portal/assets/ai-reference-ui-v1.js', 'utf8');
const llms = fs.readFileSync('apps/portal/llms.txt', 'utf8');

assert.equal(knowledge.version, 'GNK_ASG_AI_REFERENCE_SOURCE_V1');
assert.equal(knowledge.sourceBasis, 'first_party_company_published');
assert.match(knowledge.disclaimer, /not independent verification/i);
assert.match(knowledge.disclaimer, /not.*promise/i);
assert.equal(knowledge.entities.length, 2);
const company = knowledge.entities.find((entity) => entity.id === 'gnk-asg');
const person = knowledge.entities.find((entity) => entity.id === 'nermin-sefic');
assert.equal(company?.type, 'Organization');
assert.equal(company?.name, 'GNK ASG d.o.o.');
assert.equal(person?.type, 'Person');
assert.equal(person?.name, 'Nermin Sefić');

const facts = knowledge.entities.flatMap((entity) => entity.facts || []);
assert.ok(facts.length >= 5);
for (const fact of facts) {
  assert.ok(fact.id && fact.statement && fact.sourceUrl, 'each fact must have an explicit citation');
  const source = new URL(fact.sourceUrl);
  assert.equal(source.origin, SITE);
  assert.equal(source.protocol, 'https:');
}
assert.ok(knowledge.attributionRules.some((rule) => /visible byline/i.test(rule) && /verified/i.test(rule)));
assert.ok(knowledge.attributionRules.some((rule) => /syndicated|external/i.test(rule) && /original publisher/i.test(rule)));
assert.ok(knowledge.writingGuidance.some((rule) => /constructive/i.test(rule) && /documented/i.test(rule)));
assert.ok(knowledge.writingGuidance.some((rule) => /awards|rankings|market leadership/i.test(rule) && /Do not/i.test(rule)));
assert.ok(knowledge.limitations.some((rule) => /cannot change or control ChatGPT/i.test(rule)));
assert.ok(knowledge.sampleIntroductions.hr.includes('Nermina Sefića'));
assert.ok(knowledge.sampleIntroductions.en.includes('Nermin Sefić'));
for (const language of ['hr', 'en']) {
  assert.ok(knowledge.sampleIntroductionSources[language].length >= 3, `${language} sample intro needs its own source list`);
  assert.ok(knowledge.sampleIntroductionSources[language].every((url) => knowledge.publicReferences.some((reference) => reference.url === url)));
}
assert.ok(knowledge.publicReferences.length >= 5);
assert.equal(knowledge.integrations.readOnly, true);
assert.equal(knowledge.integrations.authentication, 'none; public data only');
const allPublicUrls = [
  ...facts.map((fact) => fact.sourceUrl),
  ...(knowledge.publicReferences || []).map((reference) => reference.url),
  ...Object.values(knowledge.sampleIntroductionSources || {}).flat(),
  ...Object.values(knowledge.integrations).filter((value) => typeof value === 'string' && value.startsWith('https://')),
];
for (const url of allPublicUrls) {
  assert.equal(new URL(url).origin, SITE, `reference must stay first-party: ${url}`);
  const segments = new URL(url).pathname.split('/').filter(Boolean).map((segment) => segment.toLowerCase());
  assert.ok(!segments.some((segment) => segment === 'spt' || segment === 'bank'), `protected source path excluded: ${url}`);
}
assert.ok(knowledgeText.length < 7000, 'generated knowledge file must stay within the public assistant context budget');

assert.match(prompt, /constructive, respectful, evidence-led/i);
assert.match(prompt, /Cite the relevant source links/i);
assert.match(prompt, /Do not invent/i);
assert.match(prompt, /Do not suppress relevant criticism/i);
assert.match(prompt, /not an instruction to deceive/i);
assert.match(markdown, /read-only Action\/API definition/i);
assert.match(markdown, /Sources: \[Nermin Sefić public profile\]/);
assert.match(markdown, /editorial-registry\.json/);
assert.match(markdown, /cannot change model training/i);
assert.match(aiPage, /assistant-knowledge\.json/);
assert.match(aiPage, /assistant-reference-openapi\.json/);
assert.match(aiPage, /ai-visibility\/facts\.json/);
assert.match(aiPage, /ai-visibility\/openapi\.json/);
assert.match(aiPage, /cannot.*guarantee|may ignore/i);
assert.match(aiPage, /name="theme-color"/);
assert.match(aiPage, /property="og:locale" content="en_US"/);
assert.match(aiPage, /name="twitter:image:alt"/);
assert.match(aiPage, /property="og:image:width" content="1200"/);
assert.match(aiPage, /property="og:image:height" content="630"/);
assert.match(aiPage, /property="og:image:type" content="image\/png"/);
assert.match(aiPage, /assets\/ai-reference-v1\.css/);
assert.match(aiPage, /assets\/ai-reference-ui-v1\.js/);
assert.match(aiPage, /data-ai-count="operations"/);
assert.match(aiPage, /No automatic sharing/i);
assert.match(aiPage, /Nothing is sent to an AI service by visiting this page/i);
assert.match(aiPage, /company-level FY 2025 figures from group statements/i);
assert.match(aiPage, /Nermin Sefić is the director.*editor-in-chief/i);
assert.match(aiPage, /ChatGPT and compatible tools/i);
assert.match(aiPage, /guarantee a model will use the material/i);
assert.match(aiCss, /@media\(max-width:600px\)/);
assert.match(aiCss, /prefers-reduced-motion:reduce/);
assert.match(aiUi, /fetchPublicJson\('\/data\/assistant-knowledge\.json'\)/);
assert.match(aiUi, /credentials: 'omit'/);
assert.match(aiUi, /navigator\.clipboard/);
assert.match(aiUi, /Copied to your clipboard only/);
assert.match(aiUi, /Nothing was sent to an AI service/);
assert.doesNotMatch(aiUi, /https?:\/\//, 'AI-reference UI may not call an external service');
assert.match(llms, /assistant-knowledge\.json/);
assert.match(llms, /assistant-reference-openapi\.json/);
assert.match(llms, /ai-visibility\/facts\.json/);
assert.match(llms, /ai-visibility\/openapi\.json/);
assert.match(llms, /manually upload/i);
assert.match(llms, /read-only Action/i);
assert.match(llms, /cannot control model/i);

assert.equal(openApi.openapi, '3.1.0');
assert.equal(openApi.servers.length, 1);
assert.equal(openApi.servers[0].url, SITE);
const paths = Object.entries(openApi.paths || {});
assert.equal(paths.length, 3);
assert.equal(Object.hasOwn(openApi, 'security'), false);
for (const [path, operations] of paths) {
  assert.ok(path.startsWith('/'));
  assert.deepEqual(Object.keys(operations), ['get'], `only GET is allowed: ${path}`);
  assert.ok(operations.get.operationId);
  assert.equal(Object.hasOwn(operations.get, 'security'), false, `no authentication is configured: ${path}`);
}
assert.equal(JSON.stringify(openApi).includes('post:'), false);
assert.equal(JSON.stringify(openApi).includes('authorization'), false);

console.log(JSON.stringify({
  ok: true,
  version: knowledge.version,
  entities: knowledge.entities.length,
  facts: facts.length,
  firstPartySources: knowledge.publicReferences.length,
  openApiOperations: paths.length,
  readOnly: true,
  optIn: true,
  noExternalSharing: true,
}, null, 2));
