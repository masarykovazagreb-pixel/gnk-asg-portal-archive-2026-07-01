#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/portal');
const origin = 'https://gnk-asg.hr';
const errors = [];
const warnings = [];
const checked = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'test-results') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') out.push(p);
  }
  return out;
}

function routeForFile(file) {
  const rel = path.relative(root, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
}

function normalizeHref(href) {
  if (!href) return null;
  try {
    const u = new URL(href, origin);
    if (u.origin !== origin && u.origin !== 'https://www.gnk-asg.hr') return null;
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/') && !path.extname(p)) p += '/';
    return p || '/';
  } catch { return null; }
}

function fileForRoute(route) {
  if (!route || route.includes('/en/en/')) return null;
  const clean = route.replace(/^\/+|\/+$/g, '');
  if (!clean) return path.join(root, 'index.html');
  return path.join(root, clean, 'index.html');
}

function alternates(html) {
  const map = new Map();
  const re = /<link\b[^>]*rel=["']alternate["'][^>]*>/gi;
  for (const tag of html.match(re) || []) {
    const lang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (lang && href) map.set(lang, normalizeHref(href));
  }
  return map;
}

function canonical(html) {
  const tag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  const href = tag?.match(/href=["']([^"']+)["']/i)?.[1];
  return normalizeHref(href);
}

const files = walk(root);
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeForFile(file);
  const alts = alternates(html);
  if (!alts.has('hr') && !alts.has('en')) continue;

  checked.push(route);
  if (route.includes('/en/en/')) errors.push(`${route}: invalid /en/en/ route`);
  if (!alts.has('hr')) errors.push(`${route}: missing hreflang=hr`);
  if (!alts.has('en')) errors.push(`${route}: missing hreflang=en`);
  if (!alts.has('x-default')) errors.push(`${route}: missing hreflang=x-default`);

  const can = canonical(html);
  if (!can) errors.push(`${route}: missing/invalid canonical`);
  else if (can !== route) warnings.push(`${route}: canonical ${can} differs from physical route`);

  for (const lang of ['hr', 'en', 'x-default']) {
    const target = alts.get(lang);
    if (!target) continue;
    if (target.includes('/en/en/')) {
      errors.push(`${route}: ${lang} points to forbidden ${target}`);
      continue;
    }
    const targetFile = fileForRoute(target);
    if (!targetFile || !fs.existsSync(targetFile)) {
      errors.push(`${route}: ${lang} target missing on disk: ${target}`);
    }
  }

  const hr = alts.get('hr');
  const en = alts.get('en');
  if (hr && en) {
    for (const [lang, target, expectedBackLang, expectedBack] of [
      ['hr', hr, 'en', en], ['en', en, 'hr', hr],
    ]) {
      const tf = fileForRoute(target);
      if (!tf || !fs.existsSync(tf)) continue;
      const targetAlts = alternates(fs.readFileSync(tf, 'utf8'));
      if (targetAlts.get(expectedBackLang) !== expectedBack) {
        errors.push(`${route}: ${lang} target ${target} is not reciprocal (${expectedBackLang} should be ${expectedBack})`);
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  checkedPages: checked.length,
  errors,
  warnings,
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/hr-en-parity-audit.json', JSON.stringify(report, null, 2) + '\n');

console.log(`HR/EN parity pages checked: ${checked.length}`);
console.log(`Warnings: ${warnings.length}`);
if (warnings.length) console.log(warnings.slice(0, 50).join('\n'));
if (errors.length) {
  console.error(`HR/EN parity errors: ${errors.length}`);
  console.error(errors.slice(0, 200).join('\n'));
  process.exit(1);
}
console.log('HR/EN reciprocal parity gate: PASS');
