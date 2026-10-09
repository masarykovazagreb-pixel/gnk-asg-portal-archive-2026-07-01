// GNK ASG Developer Tools — testovi i integritetni guard.
// Pokretanje: node --test apps/portal/tests/developer-tools.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const dt = require('../developer-tools/developer-tools.js');
const base = new URL('../developer-tools/', import.meta.url);
const read = (name) => readFile(new URL(name, base), 'utf8');

const ids = (result) => result.findings.map((f) => f.id);

// 1. URL Safety Inspector ------------------------------------------------
test('URL: valid HTTPS link has no findings and full score', () => {
  const r = dt.inspectUrl('https://gnk-asg.hr/developer-tools/');
  assert.equal(r.ok, true);
  assert.equal(r.score, 100);
  assert.deepEqual(ids(r), []);
});

test('URL: HTTP, embedded credentials, IP host, punycode and executable target are detected', () => {
  assert.ok(ids(dt.inspectUrl('http://gnk-asg.hr/')).includes('not-https'));
  const creds = dt.inspectUrl('https://korisnik:Tajna123@gnk-asg.hr/');
  assert.ok(ids(creds).includes('embedded-credentials'));
  assert.ok(!JSON.stringify(creds).includes('Tajna123'), 'credentials must never be echoed');
  assert.ok(ids(dt.inspectUrl('https://192.168.10.5/login')).includes('ip-host'));
  assert.ok(ids(dt.inspectUrl('https://xn--mnchen-3ya.de/')).includes('punycode'));
  assert.ok(ids(dt.inspectUrl('https://gnk.example.com/setup.exe')).includes('executable-target'));
});

test('URL: invalid and empty input are handled without throwing', () => {
  assert.equal(dt.inspectUrl('gnk-asg.hr').error, 'invalid_url');
  assert.equal(dt.inspectUrl('   ').error, 'empty');
});

// 2. Security Header Studio ----------------------------------------------
test('Headers: a strong header set scores high', () => {
  const r = dt.analyzeHeaders([
    "Content-Security-Policy: default-src 'none'; script-src 'self'; frame-ancestors 'none'; object-src 'none'",
    'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=()',
    'X-Frame-Options: DENY'
  ].join('\n'));
  assert.ok(r.score >= 95, `expected >=95, got ${r.score}`);
});

test("Headers: 'unsafe-eval' is critical and missing headers are reported", () => {
  const r = dt.analyzeHeaders("Content-Security-Policy: script-src 'self' 'unsafe-eval'");
  assert.ok(ids(r).includes('csp-unsafe-eval'));
  assert.equal(r.findings.find((f) => f.id === 'csp-unsafe-eval').severity, 'critical');
  assert.ok(ids(r).includes('hsts-missing'));
});

test('Headers: empty input returns no_headers error', () => {
  assert.equal(dt.analyzeHeaders('to nije zaglavlje').error, 'no_headers');
});

// 3. CSP Policy Builder --------------------------------------------------
test('CSP: default policy blocks connections, forms, objects and base URL changes', () => {
  const { policy } = dt.buildCsp({});
  assert.match(policy, /connect-src 'none'/);
  assert.match(policy, /form-action 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(policy, /unsafe-inline/);
});

test("CSP: 'unsafe-eval' is never generated for any combination of options", () => {
  for (const inline of [false, true])
    for (const images of [false, true])
      for (const frames of [false, true]) {
        const { policy, metaTag } = dt.buildCsp({
          allowInlineScripts: inline,
          allowExternalHttpsImages: images,
          allowLocalFrames: frames
        });
        assert.doesNotMatch(policy, /unsafe-eval/);
        assert.doesNotMatch(metaTag, /unsafe-eval/);
        assert.equal(/unsafe-inline/.test(policy), inline);
        assert.equal(/https:/.test(policy), images);
      }
});

// 4. Log Privacy Scanner -------------------------------------------------
test('Log scanner: counts categories and never returns the matched values', () => {
  const sample = [
    'user=ana.horvat@example.com status=ok',
    'iban=DE89 3704 0044 0532 0130 00',
    'card=4111 1111 1111 1111',
    'api_key=sk_live_ABCDEFGHIJKLMNOP',
    'client 10.20.30.40 connected',
    'bad iban=DE00 0000 0000 0000 0000 00 and card 4111 1111 1111 1112'
  ].join('\n');
  const r = dt.scanLogPrivacy(sample);
  const count = (id) => r.categories.find((c) => c.id === id).count;
  assert.equal(count('email'), 1);
  assert.equal(count('iban'), 1, 'only the checksum-valid IBAN counts');
  assert.equal(count('card'), 1, 'only the Luhn-valid card counts');
  assert.equal(count('secret'), 1);
  assert.equal(count('ipv4'), 1);
  const serialized = JSON.stringify(r);
  for (const value of ['ana.horvat', 'DE89', '4111 1111', 'sk_live', '10.20.30.40']) {
    assert.ok(!serialized.includes(value), `leaked value: ${value}`);
  }
});

test('Log scanner: Luhn and IBAN validators behave correctly', () => {
  assert.equal(dt.passesLuhn('4111111111111111'), true);
  assert.equal(dt.passesLuhn('4111111111111112'), false);
  assert.equal(dt.isValidIban('DE89370400440532013000'), true);
  assert.equal(dt.isValidIban('DE00370400440532013000'), false);
});

// 5. JSON Schema Drift Detector -----------------------------------------
test('JSON drift: detects added, removed, number-to-string and null transitions', () => {
  const r = dt.compareJsonSchemas(
    '{"id": 1, "cijena": 10, "opis": null, "stari": "x"}',
    '{"id": "1", "cijena": 10, "opis": "tekst", "novo": true}'
  );
  assert.equal(r.ok, true);
  const kinds = r.changes.map((c) => c.kind);
  assert.ok(kinds.includes('number-to-string'));
  assert.ok(kinds.includes('null-value-transition'));
  assert.ok(kinds.includes('field-added'));
  assert.ok(kinds.includes('field-removed'));
});

test('JSON drift: object-to-array is detected and identical structures produce no changes', () => {
  const r = dt.compareJsonSchemas('{"a": {"b": 1}}', '{"a": [1]}');
  assert.ok(r.changes.some((c) => c.kind === 'object-to-array'));
  const same = dt.compareJsonSchemas('{"a": [{"b": 1}]}', '{"a": [{"b": 2}]}');
  assert.equal(same.changes.length, 0, 'value changes alone are not schema drift');
});

test('JSON drift: invalid JSON reports the side without echoing the input', () => {
  const r = dt.compareJsonSchemas('{"lozinka": "x"', '{}');
  assert.equal(r.ok, false);
  assert.equal(r.side, 'A');
  assert.ok(!JSON.stringify(r).includes('lozinka'));
});

// 6. Integritetni guard --------------------------------------------------
test('developer-tools-integrity-guard-v1: all five tools, strict page policy, no network or storage use', async () => {
  for (const fn of ['inspectUrl', 'analyzeHeaders', 'buildCsp', 'scanLogPrivacy', 'compareJsonSchemas']) {
    assert.equal(typeof dt[fn], 'function', `missing tool ${fn}`);
  }

  const html = await read('index.html');
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  const cspMeta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html);
  assert.ok(cspMeta, 'CSP meta tag required');
  assert.doesNotMatch(cspMeta[1], /unsafe-eval|unsafe-inline/, 'page CSP must not weaken script policy');
  // JSON-LD blokovi nisu izvršivi; zabranjene su samo izvršive inline skripte.
  const executableInline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  assert.equal(executableInline.length, 0, 'no executable inline scripts allowed');
  assert.doesNotMatch(html, /<form[\s>]/i, 'no forms: nothing is submitted');
  assert.match(html, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/developer-tools\/">/);
  assert.match(html, /class="dt-skip"/);

  const css = await read('developer-tools.css');
  assert.match(css, /:focus-visible/);

  for (const file of ['developer-tools.js', 'developer-tools-ui.js']) {
    const src = await read(file);
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket/, `${file}: network call`);
    assert.doesNotMatch(src, /localStorage|sessionStorage|document\.cookie/, `${file}: storage use`);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/, `${file}: HTML injection sink`);
  }
});
