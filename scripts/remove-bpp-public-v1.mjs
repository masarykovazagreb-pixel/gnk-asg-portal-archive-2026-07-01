#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const PORTAL = resolve(ROOT, 'apps/portal');
const WRITE = process.argv.includes('--write');
const protectedPrefixes = [
  'admin-center/', 'admin-login/', 'mail-studio/', 'webmail/',
  'campaign-mailer/', 'email-status/', 'worker-ops/',
  'operator-dashboard/', 'digital-headquarters/'
];
const banned = /bpp\.is|bitcoin payment processor|bitcoin-payment-processor|https:\/\/bpp\.is/i;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (name === 'index.html') files.push(p);
  }
  return files;
}

function cleanText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\s+and the Bitcoin Payment Processor/gi, '')
    .replace(/\s+i Bitcoin Payment Processor/gi, '')
    .replace(/Bitcoin Payment Processor/gi, '')
    .replace(/BPP\.IS/gi, '')
    .replace(/https:\/\/bpp\.is\/?/gi, '')
    .replace(/#bitcoin-payment-processor/gi, '')
    .replace(/share-bpp\.png/gi, 'gnk-asg-social-card.png')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*(["'])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function scrubJson(value) {
  if (Array.isArray(value)) {
    return value.map(scrubJson).filter((v) => v !== undefined && v !== null && v !== '');
  }
  if (value && typeof value === 'object') {
    const id = String(value['@id'] || '');
    const name = String(value.name || '');
    const alt = String(value.alternateName || '');
    if (/bitcoin-payment-processor/i.test(id) || /bitcoin payment processor/i.test(name) || /^bpp\.is$/i.test(alt)) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = scrubJson(v);
      if (cleaned !== undefined && cleaned !== null && cleaned !== '') out[k] = cleaned;
    }
    return out;
  }
  if (typeof value === 'string') {
    if (/^https:\/\/gnk-asg\.hr\/#bitcoin-payment-processor$/i.test(value)) return undefined;
    return cleanText(value);
  }
  return value;
}

function sanitize(html) {
  let out = html;

  // Remove direct public anchors to the retired BPP surface.
  out = out.replace(/<a\b[^>]*href=["'][^"']*bpp\.is[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');

  // Parse and sanitize structured data instead of regex-editing JSON syntax.
  out = out.replace(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi, (full, payload) => {
    try {
      const parsed = JSON.parse(payload.trim());
      const cleaned = scrubJson(parsed);
      return `<script type="application/ld+json">${JSON.stringify(cleaned)}</script>`;
    } catch {
      return full;
    }
  });

  // Clean remaining public metadata / prose references without changing executable identifiers.
  out = out
    .replace(/\s+and the Bitcoin Payment Processor/gi, '')
    .replace(/\s+i Bitcoin Payment Processor/gi, '')
    .replace(/Bitcoin Payment Processor/gi, '')
    .replace(/BPP\.IS/gi, '')
    .replace(/https:\/\/bpp\.is\/?/gi, '')
    .replace(/#bitcoin-payment-processor/gi, '')
    .replace(/share-bpp\.png/gi, 'gnk-asg-social-card.png');

  // Normalize comma-separated meta keyword lists after deletions.
  out = out.replace(/(<meta\s+name=["']keywords["']\s+content=["'])([^"']*)(["'])/gi, (_m, a, body, z) => {
    const normalized = body.split(',').map((x) => x.trim()).filter(Boolean).join(', ');
    return `${a}${normalized}${z}`;
  });
  return out;
}

const changed = [];
const remaining = [];
for (const file of walk(PORTAL)) {
  const rel = relative(PORTAL, file).replaceAll('\\', '/');
  if (protectedPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
  const before = readFileSync(file, 'utf8');
  const after = sanitize(before);
  if (after !== before) {
    changed.push(rel);
    if (WRITE) writeFileSync(file, after, 'utf8');
  }
  const effective = WRITE ? after : before;
  if (banned.test(effective)) {
    const match = effective.match(banned);
    const at = match ? match.index : -1;
    remaining.push({ path: rel, sample: at >= 0 ? effective.slice(Math.max(0, at - 80), at + 160).replace(/\s+/g, ' ') : '' });
  }
}

console.log(JSON.stringify({ mode: WRITE ? 'write' : 'check', changedCount: changed.length, changed, remainingCount: remaining.length, remaining }, null, 2));
if (remaining.length) process.exit(2);
