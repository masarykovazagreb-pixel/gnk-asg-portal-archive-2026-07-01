#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/portal');
const origin = 'https://gnk-asg.hr';
let changed = 0;
let xDefaultAdded = 0;
let canonicalsFixed = 0;

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

function attr(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] || null;
}

function alternateTags(html) {
  const out = new Map();
  for (const tag of html.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi) || []) {
    const lang = attr(tag, 'hreflang')?.toLowerCase();
    const href = attr(tag, 'href');
    if (lang && href) out.set(lang, { tag, href });
  }
  return out;
}

function canonicalTag(html) {
  const tag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || null;
  return tag ? { tag, href: attr(tag, 'href') } : null;
}

function absolute(route) {
  return new URL(route, origin).href;
}

for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  const route = routeForFile(file);
  if (route.includes('/en/en/')) continue;

  const alts = alternateTags(html);
  const hr = alts.get('hr');
  const en = alts.get('en');
  if (!hr || !en) continue; // Never invent a translation target.

  let dirty = false;

  if (!alts.has('x-default')) {
    const anchor = hr.tag;
    const xDefault = `<link rel="alternate" hreflang="x-default" href="${hr.href}">`;
    html = html.replace(anchor, `${anchor}\n  ${xDefault}`);
    xDefaultAdded += 1;
    dirty = true;
  }

  // Paired EN pages must be self-canonical. Cross-language canonicalization
  // suppresses the English page and breaks the reciprocal parity contract.
  if (route.startsWith('/en/')) {
    const can = canonicalTag(html);
    const expected = absolute(route);
    if (can && can.href && new URL(can.href, origin).pathname !== route) {
      const replacement = can.tag.replace(can.href, expected);
      html = html.replace(can.tag, replacement);
      canonicalsFixed += 1;
      dirty = true;
    }
  }

  if (dirty) {
    fs.writeFileSync(file, html);
    changed += 1;
  }
}

console.log(`HR/EN head normalization changed pages: ${changed}`);
console.log(`x-default added: ${xDefaultAdded}`);
console.log(`EN self-canonicals fixed: ${canonicalsFixed}`);
