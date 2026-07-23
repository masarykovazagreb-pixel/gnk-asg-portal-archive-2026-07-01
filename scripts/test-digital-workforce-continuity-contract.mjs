import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const continuity=fs.readFileSync('apps/portal/assets/digital-workforce-continuity-v1.js','utf8');
const gate=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-workforce-staging-gate-v1.js','utf8');

assert.match(html,/objavljena baza 1\.536/i);
assert.match(html,/katalog 1\.573/i);
assert.match(html,/digital-workforce-continuity-v1\.js/);
assert.match(html,/digital-workforce-continuity-v1\.css/);
assert.match(html,/>SIMULACIJA</);
assert.match(continuity,/publishedBaselineWorkers:1536/);
assert.match(continuity,/currentCatalogueWorkers:1573/);
assert.match(continuity,/catalogueExpansion:37/);
assert.match(continuity,/publishedProjectAreas:9/);
assert.match(continuity,/mode:'append-only'/);
assert.match(continuity,/continueBulletinIssueNumbers:true/);
assert.match(continuity,/continueNewsroomChronology:true/);
assert.match(continuity,/neverRewritePublishedHistory:true/);
assert.match(continuity,/deduplicateByStableId:true/);

// Private staging security contract: every response path must remain non-cacheable,
// non-indexable, non-embeddable and must not expose browser capabilities.
assert.match(gate,/GNK_DINAMO_WORKFORCE_STAGING_GATE_V14/);
assert.match(gate,/function harden\(headers\)/);
assert.match(gate,/cache-control','no-store, private/);
assert.match(gate,/x-robots-tag/);
assert.match(gate,/noindex/);
assert.match(gate,/nofollow/);
assert.match(gate,/noarchive/);
assert.match(gate,/nosnippet/);
assert.match(gate,/x-content-type-options','nosniff/);
assert.match(gate,/x-frame-options','DENY/);
assert.match(gate,/referrer-policy','no-referrer/);
assert.match(gate,/permissions-policy','camera=\(\), microphone=\(\), geolocation=\(\)/);
assert.match(gate,/frame-ancestors 'none'/);
assert.match(gate,/form-action 'self'/);
assert.match(gate,/object-src 'none'/);
assert.match(gate,/script-src 'self'/);
assert.match(gate,/style-src 'self' 'unsafe-inline'/);
assert.match(gate,/img-src 'self' data:/);
assert.match(gate,/connect-src 'self'/);
assert.match(gate,/const headers=harden\(new Headers\(/);
assert.match(gate,/const headers=harden\(new Headers\(response\.headers\)\)/);

// Authentication contract: any explicit Authorization header is authoritative.
// Invalid or malformed Bearer data must never fall back to a valid browser cookie.
assert.match(gate,/const header=String\(request\.headers\.get\('authorization'\)\|\|''\)/);
assert.match(gate,/if\(header\)\{/);
assert.match(gate,/const match=header\.match\(\/\^Bearer\\s\+\(\.\+\)\$\/i\)/);
assert.match(gate,/return Boolean\(match&&await tokenValid\(match\[1\],env\)\)/);
assert.match(gate,/return sessionValid\(cookieValue\(request\),env\)/);
assert.match(gate,/contentType\.startsWith\('application\/x-www-form-urlencoded'\)/);
assert.match(gate,/contentType\.startsWith\('multipart\/form-data'\)/);
assert.match(gate,/return page\('Zahtjev za prijavu nije valjan\.',400\)/);
assert.match(gate,/return page\('Token nije ispravan\.',401\)/);

console.log(JSON.stringify({
  ok:true,
  contract:'published-digital-workforce-continuity',
  baseline:1536,
  current:1573,
  projectAreas:9,
  stagingGate:'V14',
  stagingSecurity:'no-store-noindex-nosniff-frame-deny-no-referrer-restricted-permissions-csp-controlled-login-errors-bearer-authoritative'
},null,2));