#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PORTAL = 'apps/portal';
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');
const TITLES = new Map([
  ['en/gnk-aktual/columns/01-ai-za-male-tvrtke/index.html', 'AI for Small Businesses: The Cost of Waiting'],
  ['en/gnk-aktual/columns/08-cibona-prvak/index.html', "Cibona's 21st Croatian Title (2026)"],
  ['en/gnk-aktual/columns/prijatelj-koji-mi-je-rekao-istinu/index.html', 'The Friend Who Told Me What I Needed to Hear'],
  ['en/gnk-aktual/index.html', 'AKTUAL MEDIA — News, Business & Technology'],
  ['en/gnk-aktual/kolumne/01-ai-za-male-tvrtke/index.html', 'AI for Small Businesses: Cost of Waiting | AKTUAL MEDIA'],
  ['en/gnk-aktual/kolumne/07-cibona-kutak-dodig/index.html', "Cibona Corner: Victor Dodig's New Era | AKTUAL MEDIA"],
  ['en/gnk-aktual/kolumne/08-cibona-prvak/index.html', "Cibona Wins Its 21st Croatian Title | AKTUAL MEDIA"],
  ['gnk-aktual/index.html', 'AKTUAL MEDIA — Vijesti, biznis i tehnologija'],
  ['gnk-aktual/kolumne/08-cibona-prvak/index.html', 'Cibona prvak 2026: 21. naslov'],
  ['gnk-aktual/kolumne/godina-kad-sam-prestao-obecavati/index.html', 'Godina kad sam prestao obećavati ishode'],
  ['gnk-aktual/kolumne/koncar-gnk-asg-504-milijuna-ai-radna-snaga-izvoz/index.html', 'KONČAR i GNK ASG: digitalni izvoz | AKTUAL MEDIA'],
  ['gnk-aktual/kolumne/hrvatski-softver-izvoz-nevidljivi-lider/index.html', 'Hrvatski softver bez kamiona | AKTUAL MEDIA'],
]);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const unescapeHtml = (value = '') => String(value).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attrValue = (tag, name) => unescapeHtml(tag.match(new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || '');
const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  const safe = esc(value);
  return pattern.test(tag) ? tag.replace(pattern, `${name}="${safe}"`) : tag.replace(/\s*\/?>$/, (end) => ` ${name}="${safe}"${end}`);
};
const upsertMeta = (html, keyAttr, key, value) => {
  let found = false;
  const next = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attrValue(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    return setAttr(tag, 'content', value);
  });
  if (found) return next;
  const meta = `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`;
  return next.includes('</head>') ? next.replace('</head>', `${meta}</head>`) : `${meta}${next}`;
};

const changed = [];
const failures = [];
for (const [relative, title] of TITLES) {
  const file = path.join(PORTAL, relative);
  if (!fs.existsSync(file)) {
    failures.push(`${file}: expected AKTUAL page is missing`);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  let next = before.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  if (next === before && !/<title\b/i.test(before)) failures.push(`${file}: title element is missing`);
  next = upsertMeta(next, 'property', 'og:title', title);
  next = upsertMeta(next, 'name', 'twitter:title', title);
  if (next !== before) {
    changed.push(relative);
    if (WRITE) fs.writeFileSync(file, next, 'utf8');
  }
}

console.log(JSON.stringify({
  version: 'AKTUAL_SEO_TITLES_V1',
  mode: WRITE ? 'write' : CHECK ? 'check' : 'dry-run',
  managedPages: TITLES.size,
  changed: changed.length,
  changedPages: changed,
  failures,
}, null, 2));
if (failures.length || (CHECK && changed.length)) process.exitCode = 1;
