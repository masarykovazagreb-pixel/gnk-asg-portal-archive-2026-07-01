import assert from 'node:assert/strict';
import { handlePublicAi, API_PATH, VERSION } from '../src/public-ai-v10.js';

const origin = 'https://www.gnk-asg.hr';
const request = (body, headers = {}) => new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin, ...headers },
  body: JSON.stringify(body)
});

assert.match(VERSION, /^GNK_ASG_PUBLIC_AI_V11_/);

const financeResponse = await handlePublicAi(request({ message: 'Prikaži financijske pokazatelje', language: 'hr' }), {});
assert.equal(financeResponse.status, 200);
const finance = await financeResponse.json();
assert.equal(finance.ok, true);
assert.equal(finance.version, VERSION);
assert.equal(finance.mode, 'fallback');
assert.ok(finance.links.some(link => link.url === '/finance/'));
assert.ok(finance.links.some(link => link.url === '/reports/'));
assert.match(finance.answer, /financijski|izvješća/i);
assert.equal(financeResponse.headers.get('cache-control'), 'no-store');
assert.equal(financeResponse.headers.get('x-content-type-options'), 'nosniff');
assert.match(financeResponse.headers.get('content-security-policy') || '', /default-src 'none'/);

const englishResponse = await handlePublicAi(request({ message: 'Show the Group network and locations', language: 'en' }), {});
assert.equal(englishResponse.status, 200);
const english = await englishResponse.json();
assert.ok(english.links.some(link => link.url === '/group-network/'));
assert.match(english.answer, /Group Network|locations|markets/i);

const roadmapResponse = await handlePublicAi(request({ message: 'Koji su sljedeći gateovi i rizici projekata?', language: 'hr' }), {});
assert.equal(roadmapResponse.status, 200);
const roadmap = await roadmapResponse.json();
assert.ok(roadmap.links.some(link => link.url === '/projects/'));
assert.ok(roadmap.links.some(link => link.url === '/projects/roadmap/'));
assert.match(roadmap.answer, /devet projekata|gateovima|rizika/i);

const codeResponse = await handlePublicAi(request({ message: 'When is THE CODE New York reveal?', language: 'en' }), {});
assert.equal(codeResponse.status, 200);
const code = await codeResponse.json();
assert.ok(code.links.some(link => link.url === '/the-code/'));
assert.match(code.answer, /7 October 2026|11:30 ET/i);

const emptyResponse = await handlePublicAi(request({ message: '   ', language: 'hr' }), {});
assert.equal(emptyResponse.status, 400);
assert.equal((await emptyResponse.json()).error, 'EMPTY_MESSAGE');

const longResponse = await handlePublicAi(request({ message: 'x'.repeat(2001), language: 'hr' }), {});
assert.equal(longResponse.status, 413);
const longPayload = await longResponse.json();
assert.equal(longPayload.error, 'MESSAGE_TOO_LONG');
assert.equal(longPayload.maxChars, 2000);

const wrongType = new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'text/plain', origin },
  body: 'test'
});
assert.equal((await handlePublicAi(wrongType, {})).status, 415);

const declaredTooLarge = new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin, 'content-length': '24001' },
  body: JSON.stringify({ message: 'test' })
});
assert.equal((await handlePublicAi(declaredTooLarge, {})).status, 413);

const actualTooLarge = new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin },
  body: JSON.stringify({ message: 'test', padding: 'x'.repeat(25000) })
});
assert.equal(actualTooLarge.headers.get('content-length'), null);
const actualTooLargeResponse = await handlePublicAi(actualTooLarge, {});
assert.equal(actualTooLargeResponse.status, 413);
assert.equal((await actualTooLargeResponse.json()).error, 'PAYLOAD_TOO_LARGE');

const methodResponse = await handlePublicAi(new Request(`${origin}${API_PATH}`, { method: 'GET' }), {});
assert.equal(methodResponse.status, 405);

const optionsResponse = await handlePublicAi(new Request(`${origin}${API_PATH}`, { method: 'OPTIONS' }), {});
assert.equal(optionsResponse.status, 204);
assert.equal(optionsResponse.headers.get('access-control-allow-methods'), 'POST, OPTIONS');

const foreignOrigin = new Request(`${origin}${API_PATH}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://example.com' },
  body: JSON.stringify({ message: 'test' })
});
assert.equal((await handlePublicAi(foreignOrigin, {})).status, 403);

console.log('public-ai-v11: routes, fallback, declared and actual body limits, headers and origin protection OK');
