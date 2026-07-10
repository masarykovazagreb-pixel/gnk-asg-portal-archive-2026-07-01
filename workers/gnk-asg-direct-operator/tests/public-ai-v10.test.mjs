import assert from 'node:assert/strict';
import { handlePublicAi, API_PATH, VERSION } from '../src/public-ai-v10.js';

const origin = 'https://www.gnk-asg.hr';
const request = body => new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin },
  body: JSON.stringify(body)
});

const financeResponse = await handlePublicAi(request({ message: 'Prikaži financijske pokazatelje', language: 'hr' }), {});
assert.equal(financeResponse.status, 200);
const finance = await financeResponse.json();
assert.equal(finance.ok, true);
assert.equal(finance.version, VERSION);
assert.equal(finance.mode, 'fallback');
assert.ok(finance.links.some(link => /financ/i.test(link.label)));
assert.match(finance.answer, /financijski/i);

const englishResponse = await handlePublicAi(request({ message: 'Show markets and locations', language: 'en' }), {});
assert.equal(englishResponse.status, 200);
const english = await englishResponse.json();
assert.ok(english.links.some(link => /market/i.test(link.label)));
assert.match(english.answer, /Markets|network|geographic/i);

const emptyResponse = await handlePublicAi(request({ message: '   ', language: 'hr' }), {});
assert.equal(emptyResponse.status, 400);
assert.equal((await emptyResponse.json()).error, 'EMPTY_MESSAGE');

const methodResponse = await handlePublicAi(new Request(`${origin}${API_PATH}`, { method: 'GET' }), {});
assert.equal(methodResponse.status, 405);

const foreignOrigin = new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://example.com' },
  body: JSON.stringify({ message: 'test' })
});
assert.equal((await handlePublicAi(foreignOrigin, {})).status, 403);

console.log('public-ai-v10: fallback, routing, validation and origin protection OK');
