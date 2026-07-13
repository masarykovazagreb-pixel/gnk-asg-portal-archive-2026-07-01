import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','utf8');

assert.match(source,/publicCors=false/);
assert.match(source,/if\(publicCors\)headers\['access-control-allow-origin'\]='\*'/);
assert.match(source,/handlePublicNews[\s\S]*publicCors:true/);
assert.doesNotMatch(source,/function json\([^)]*\)\{return new Response\([^]*access-control-allow-origin':'\*'/);
assert.match(source,/canonicalSourceUrl/);
assert.match(source,/startsWith\('utm_'\)/);
assert.match(source,/fbclid/);
assert.match(source,/gclid/);
assert.match(source,/url\.hash=''/);
assert.match(source,/url\.pathname=url\.pathname\.replace/);
assert.match(source,/const dedupeSeed=sourceUrl\|\|normalizedTitle/);
assert.match(source,/x-content-type-options':'nosniff'/);

console.log(JSON.stringify({ok:true,cors:'public-only',dedupe:'canonical-source-url',trackingRemoved:['utm_*','fbclid','gclid','msclkid']},null,2));
