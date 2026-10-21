#!/usr/bin/env node
// Pristupačnost: preskok navigacije i vidljiv fokus.
//
// Svaka stranica mora imati točno jednu vezu "preskoči na sadržaj" koja
// vodi na id koji na toj stranici stvarno postoji. Bez toga čitatelj s
// tipkovnicom prolazi kroz cijeli izbornik prije prvog naslova — to je
// WCAG 2.2 zahtjev 2.4.1 (Bypass Blocks).
//
// Test ne provjerava ljepotu, nego ugovor: generatori (region engine,
// hub, AKTUAL ljuska) moraju zadržati vezu i metu. Ako se izgubi,
// padne odmah, a ne nakon sljedećeg ciklusa.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const read = (file) => fs.readFileSync(path.join(PORTAL, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(PORTAL, file));

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const SKIP_LINK = /<a[^>]*class="(?:skip-to-content|skip)"[^>]*href="#([^"]+)"[^>]*>/i;

function inspect(file, html) {
  const link = html.match(SKIP_LINK);
  if (!link) {
    check(false, `${file}: nema veze za preskok sadržaja`);
    return;
  }
  const target = link[1];
  const targetExists = new RegExp(`id="${target.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"`).test(html);
  check(targetExists, `${file}: preskok vodi na #${target}, a taj id ne postoji`);

  const all = [...html.matchAll(new RegExp(SKIP_LINK.source, 'gi'))];
  check(all.length === 1, `${file}: ${all.length} veze za preskok (očekivana 1)`);

  const body = html.slice(html.indexOf('<body'));
  const firstAnchor = body.match(/<a\b[^>]*href=/i);
  check(Boolean(firstAnchor) && link.index > html.indexOf('<body'), `${file}: preskok nije unutar body`);
  check(
    !firstAnchor || body.indexOf(firstAnchor[0]) >= body.indexOf(link[0]),
    `${file}: preskok nije prva veza u bodyju`
  );

  check(/<main\b/i.test(html), `${file}: nema <main> orijentira`);
}

/* ---------- 1. ključne rute ---------- */

const CRITICAL = [
  'index.html',
  'en/index.html',
  'gnk-aktual/index.html',
  'en/gnk-aktual/index.html',
  'izdanja/index.html',
  'izdanja/sport/index.html',
  'kanal/index.html',
  'kanal/zagreb/index.html',
  'kanal/zagreb/en/index.html',
  'usa/index.html',
];

for (const file of CRITICAL) {
  check(exists(file), `${file}: stranica ne postoji`);
  if (exists(file)) inspect(file, read(file));
}

/* ---------- 2. sve generirane stranice izdanja ---------- */

const walk = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
};

const generated = [
  ...walk(path.join(PORTAL, 'izdanja')),
  ...walk(path.join(PORTAL, 'kanal')).filter((f) => !f.includes(`${path.sep}en${path.sep}`) || true),
];

let missing = 0;
for (const full of generated) {
  const html = fs.readFileSync(full, 'utf8');
  if (!SKIP_LINK.test(html)) {
    missing += 1;
    if (missing <= 5) check(false, `${path.relative(ROOT, full)}: nema preskoka`);
  }
}
check(missing === 0, `generirane stranice bez preskoka: ${missing}`);

/* ---------- 3. vidljiv fokus na svemu što se dohvaća ---------- */

// Stranice kanala nose CSS iz svoje kopije; ako se u generatoru izgubi
// pravilo fokusa, izgubi se na svih 3522 stranice odjednom.
const walkAll = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkAll(full));
    else out.push(full);
  }
  return out;
};
const channelCss = walkAll(path.join(PORTAL, 'kanal')).filter((file) => file.endsWith(path.join('assets', 'region.css')));
check(channelCss.length >= 8, `premalo kopija region.css: ${channelCss.length}`);
for (const file of channelCss) {
  const css = fs.readFileSync(file, 'utf8');
  check(/:focus-visible/.test(css), `${path.relative(ROOT, file)}: nema :focus-visible pravila`);
}

for (const file of ['izdanja/index.html', 'kanal/index.html', 'usa/index.html', 'index.html', 'gnk-aktual/index.html', 'en/gnk-aktual/index.html']) {
  if (!exists(file)) continue;
  check(/:focus-visible/.test(read(file)), `${file}: nema :focus-visible pravila`);
}
check(/:focus-visible/.test(read('assets/s-chat-v2.css')), 's-chat-v2.css: nema :focus-visible pravila');

/* ---------- 4. vidljiv fokus nije uklonjen ---------- */

const focusCss = (file) => {
  if (!exists(file)) return '';
  return read(file);
};
const shells = ['assets/styles.css', 'assets/site.css'];
const cssText = shells.map(focusCss).join('\n');
if (cssText.trim()) {
  check(
    !/outline\s*:\s*(0|none)\s*;\s*\}?/i.test(cssText) || /:focus-visible/i.test(cssText),
    'globalni CSS gasi outline, a nema :focus-visible zamjene'
  );
}

/* ---------- ispis ---------- */

if (failures.length) {
  console.error(JSON.stringify({ ok: false, pages: CRITICAL.length + generated.length, failures: failures.slice(0, 20) }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, critical: CRITICAL.length, generated: generated.length, failures: 0 }, null, 2));
}
