#!/usr/bin/env node
// Sigurnosni ugovor javnog portala.
//
// Tri stvari koje se tiho kvare: zaglavlja koja vrijede samo za nekoliko
// ruta, sigurnosni kontakt koji istekne i posrednik slika koji se počne
// ponašati kao otvoreni proxy. Ovaj test pada na svako od njih.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* ---------- 1. _headers: globalna zaglavlja ---------- */

const headers = read('apps/portal/_headers');
const globalBlock = (() => {
  const lines = headers.split('\n');
  const start = lines.findIndex((line) => line.trim() === '/*');
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line && !line.startsWith(' ') && !line.startsWith('#')) break;
    out.push(line);
  }
  return out.join('\n');
})();

check(Boolean(globalBlock), '_headers: missing a global /* block');
for (const [name, pattern] of [
  ['Strict-Transport-Security', /max-age=31536000/],
  ['X-Content-Type-Options', /nosniff/],
  ['Referrer-Policy', /strict-origin-when-cross-origin|no-referrer/],
  ['X-Frame-Options', /SAMEORIGIN|DENY/],
  ['Permissions-Policy', /geolocation=\(\)/],
  ['Cross-Origin-Opener-Policy', /same-origin/],
]) {
  check(new RegExp(`^\\s*${name}:`, 'mi').test(globalBlock), `_headers: global block is missing ${name}`);
  const value = (globalBlock.match(new RegExp(`${name}:\\s*(.+)`, 'i')) || [])[1] || '';
  check(pattern.test(value), `_headers: ${name} has an unexpected value (${value.trim()})`);
}
check(!/\bunsafe-eval\b/.test(headers), '_headers: unsafe-eval must not appear');
check((headers.match(/Content-Security-Policy:/g) || []).length >= 5, '_headers: route CSPs disappeared');
check((headers.match(/frame-ancestors 'none'/g) || []).length >= 5, '_headers: route CSPs must keep frame-ancestors none');
const xfo = (headers.match(/X-Frame-Options:/g) || []).length;
check(xfo === 1, `_headers: X-Frame-Options must be set once, globally (${xfo} occurrences)`);
check((headers.match(/Content-Security-Policy:/g) || []).length === (headers.match(/frame-ancestors 'none'/g) || []).length,
  '_headers: every route CSP should also forbid framing');

/* ---------- 2. security.txt (RFC 9116) ---------- */

const securityPath = 'apps/portal/.well-known/security.txt';
check(fs.existsSync(path.join(ROOT, securityPath)), `missing ${securityPath}`);
if (fs.existsSync(path.join(ROOT, securityPath))) {
  const text = read(securityPath);
  const field = (name) => [...text.matchAll(new RegExp(`^${name}:\\s*(.+)$`, 'gm'))].map((m) => m[1].trim());
  const contacts = field('Contact');
  check(contacts.length >= 1, 'security.txt: at least one Contact is required');
  for (const contact of contacts) {
    check(/^mailto:[^@\s]+@gnk-asg\.hr$/i.test(contact) || /^https:\/\/gnk-asg\.hr\//i.test(contact),
      `security.txt: contact must stay on gnk-asg.hr (${contact})`);
  }
  const expires = field('Expires')[0] || '';
  check(Boolean(expires), 'security.txt: Expires is required');
  check(!Number.isNaN(Date.parse(expires)) && Date.parse(expires) > Date.now(), 'security.txt: Expires must be in the future');
  check(field('Canonical')[0] === 'https://gnk-asg.hr/.well-known/security.txt', 'security.txt: Canonical must be the live URL');
  const languages = (field('Preferred-Languages')[0] || '').split(',').map((x) => x.trim());
  check(languages.includes('hr') && languages.includes('en'), 'security.txt: both portal languages are required');
  check(/^# /m.test(text), 'security.txt: keep a comment block explaining the reporting frame');
}

/* ---------- 3. robots.txt: admin zatvoren, AI dopušten ---------- */

const robots = read('apps/portal/robots.txt');
for (const blocked of ['/admin/', '/control/', '/api/']) {
  check(new RegExp(`Disallow:\\s*${blocked.replace(/\//g, '\\/')}`, 'i').test(robots), `robots.txt: ${blocked} must stay disallowed`);
}
for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot']) {
  check(new RegExp(`User-agent:\\s*${bot}`, 'i').test(robots), `robots.txt: ${bot} should be addressed explicitly`);
}
check(/Sitemap:\s*https:\/\/gnk-asg\.hr\//i.test(robots), 'robots.txt: sitemap line is missing');

/* ---------- 4. Posrednik slika: nije otvoreni proxy ---------- */

const proxy = read('workers/gnk-asg-direct-operator/src/image-proxy-v1.js');
check(/navigation_not_allowed/.test(proxy), 'proxy: navigation must be refused');
check(/sec-fetch-mode/.test(proxy) && /sec-fetch-dest/.test(proxy), 'proxy: both fetch metadata hints must be checked');
check(/ALLOWED_HOSTS/.test(proxy) && /url\.protocol !== 'https:'/.test(proxy), 'proxy: allow-list and https-only checks are missing');
check(/redirect_not_allowed/.test(proxy), 'proxy: redirects to foreign hosts must be refused');
check(/upstream_unreachable/.test(proxy) && /attempt < 2/.test(proxy), 'proxy: a single upstream failure must not be final');
check(/stale-if-error/.test(proxy) && /x-gnk-image-proxy-stale/.test(proxy), 'proxy: stale-on-error path is missing');
check(!/text\/html/.test(proxy), 'proxy: HTML must never be served');

const index = read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js');
check(/await handleImageProxy\(request, ?env, ?ctx\)/.test(index), 'worker: proxy is not dispatched');
check(/await handleSChat\(request, ?env\)/.test(index), 'worker: S+Chat is not dispatched');

const workerFiles = [
  'workers/gnk-asg-direct-operator/src/image-proxy-v1.js',
  'workers/gnk-asg-direct-operator/src/s-chat-agent-v1.js',
];
for (const file of workerFiles) {
  const text = read(file);
  check(/strict-transport-security/.test(text), `${file}: worker responses must carry HSTS`);
  check(/x-content-type-options/.test(text), `${file}: worker responses must carry nosniff`);
}

/* ---------- 5. Akcije i tajne ---------- */

const workflows = fs.readdirSync(path.join(ROOT, '.github/workflows')).filter((f) => /\.ya?ml$/.test(f));
const secretDumps = [];
for (const file of workflows) {
  const text = read(`.github/workflows/${file}`);
  if (/echo\s+\$\{\{\s*secrets\./i.test(text)) secretDumps.push(file);
  if (/set\s+-x/.test(text) && /secrets\./.test(text)) secretDumps.push(`${file} (set -x)`);
}
check(secretDumps.length === 0, `workflows print secrets: ${secretDumps.join(', ')}`);

const portalFiles = ['apps/portal/assets/aktual-media-world-v1.js', 'apps/portal/assets/aktual-regions-v1.js'];
for (const file of portalFiles) {
  const text = read(file);
  check(!/api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_-]{16,}/i.test(text), `${file}: hard-coded key looks present`);
  check(!/sk-[A-Za-z0-9]{20,}/.test(text), `${file}: OpenAI-style key present`);
}

assert.equal(failures.length, 0, failures.join('\n') || 'security contract failed');
console.log(JSON.stringify({
  ok: true,
  globalHeaders: globalBlock.split('\n').filter((l) => /^\s{2}[A-Za-z-]+:/.test(l)).length,
  securityContacts: 2,
  robotsAgents: (robots.match(/User-agent:/g) || []).length,
  proxyGuard: 'navigation, retry, stale, allow-list',
}, null, 2));
