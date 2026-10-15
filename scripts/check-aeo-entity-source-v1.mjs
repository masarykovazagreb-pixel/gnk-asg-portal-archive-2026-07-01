import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const source = JSON.parse(read('scripts/aeo-entity-source.jsonld'));
const entity = JSON.parse(read('apps/portal/nermin-sefic/entity.jsonld'));
const data = JSON.parse(read('apps/portal/data/entity-graph.jsonld'));
assert.deepEqual(entity, source, 'Personal entity endpoint must match canonical source');
assert.deepEqual(data, source, 'Corporate graph endpoint must match canonical source');

const ids = source['@graph'].map(x => x['@id']);
for (const id of [
  'https://gnk-asg.hr/#nermin-sefic',
  'https://gnk-asg.hr/#gnk-asg',
  'https://gnk-asg.hr/#website'
]) assert(ids.includes(id), 'Missing canonical entity: ' + id);
const all = JSON.stringify(source);
for (const legacy of ['/nermin-sefic/#person', '/#organization', '/#group', '"NN"']) {
  assert(!all.includes(legacy), 'Legacy entity returned: ' + legacy);
}
const page = read('apps/portal/ai/index.html');
const ldScripts = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const hasMatchingGraph = ldScripts.some(([,raw]) => {
  try { return JSON.stringify(JSON.parse(raw)) === JSON.stringify(source); }
  catch { return false; }
});
assert(hasMatchingGraph, '/ai/ embedded JSON-LD must match the entity source');

const generator = read('scripts/generate-aeo-artifacts-v1.mjs');
assert(generator.includes("read('scripts/aeo-entity-source.jsonld',null)"),
  'AEO generator must import the canonical source');
for (const path of ['apps/portal/llms.txt', 'apps/portal/llms-full.txt']) {
  const content = read(path);
  assert(!/All entries below are authored\/published by Nermin/i.test(content),
    'Do not infer universal individual authorship: ' + path);
  assert(!/Any content on https:\/\/gnk-asg\.hr is written and published by Nermin/i.test(content),
    'Do not infer universal individual authorship: ' + path);
}
console.log('AEO entity source / public JSON-LD / AI page / attribution contract: PASS');
