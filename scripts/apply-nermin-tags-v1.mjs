#!/usr/bin/env node
/**
 * HASHTAGOVI I IDENTITET NA STRANICAMA NERMINA SEFIĆA.
 *
 * Na svakoj stranici Nermina Sefića (HR, EN i galerija, u svim varijantama imena
 * u putanji) dodaje isti blok prije </body>:
 *   - hashtagovi #AKTUALMEDIA #GNKASG #GNKDINAMO i varijante imena,
 *   - Nermin Sefić kao glavni urednik AKTUAL MEDIA,
 *   - izjava o grupi, doslovno kako je odobreno.
 * Blok je idempotentan (marker data-am-tags="v1"); vanjski CSS jer CSP ne dopušta inline stilove.
 *
 *   node scripts/apply-nermin-tags-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const CSS_HREF = '/assets/am-tags-v1.css?v=20261029';
const MARK = 'data-am-tags="v1"';

const SKIP = new Set(['admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters', 'api', 'assets', 'data', '__preview', 'automation-status']);

// Kombinacije hashtagova: ime u svim varijantama uz svaku kombinaciju kuće i grupe.
const COMBOS = [
  ['#NerminSefić', '#AKTUALMEDIA'],
  ['#NerminSefić', '#GNKASG'],
  ['#NerminSefić', '#GNKDINAMO'],
  ['#NerminSefic', '#AKTUALMEDIA', '#GNKASG', '#GNKDINAMO'],
  ['#NerminSefic', '#NerminSefić', '#AKTUALMEDIA'],
];
const HASHTAGS = [...new Set(COMBOS.flat())];

const COPY = {
  hr: {
    label: 'Oznake',
    role: 'Nermin Sefić — glavni direktor i glavni urednik AKTUAL MEDIA.',
    ubo: 'Nermin Sefić — ovlašteni predstavnik i stvarni vlasnik (UBO) grupe GNK DINAMO Ltd.',
    group: 'GNK ASG d.o.o. povezani s cijelim svijetom kao GNK DINAMO Ltd grupa direktno i preko povezanih društava.',
  },
  en: {
    label: 'Tags',
    role: 'Nermin Sefić — director and editor-in-chief of AKTUAL MEDIA.',
    ubo: 'Nermin Sefić — authorised representative and ultimate beneficial owner (UBO) of the GNK DINAMO Ltd group.',
    group: 'GNK ASG d.o.o. is connected with the whole world as the GNK DINAMO Ltd group, directly and through affiliated companies.',
  },
};

export function langOf(html) {
  const m = html.match(/<html[^>]*\blang=["']([a-z]{2})/i);
  return m && m[1].toLowerCase() === 'en' ? 'en' : 'hr';
}

export function tagBlock(lang) {
  const t = COPY[lang];
  const combos = COMBOS.map((c) => `<p class="am-tags-list">${c.map((h) => `<span>${h}</span>`).join(' ')}</p>`).join('\n');
  return `<aside class="am-tags" ${MARK} aria-label="${t.label}">
${combos}
<p class="am-tags-role">${t.role}</p>
<p class="am-tags-group">${t.ubo} ${t.group}</p>
</aside>`;
}

/** Vraća novi HTML; zamjenjuje stari blok ako postoji (idempotentno). */
export function applyNerminTags(html) {
  const lang = langOf(html);
  let out = html.replace(/<aside class="am-tags"[^>]*data-am-tags="v1"[\s\S]*?<\/aside>\n?/g, '');
  if (!out.includes(CSS_HREF) && /<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
  }
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${tagBlock(lang)}\n</body>`);
  return out;
}

function isNerminPage(relPath) {
  const parts = relPath.split(sep);
  if (parts.some((p) => SKIP.has(p))) return false;
  return parts.some((p) => /nermin/i.test(p));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  // --hub: glavne AKTUAL MEDIA stranice (početna, gnk-aktual, izdanja, mreža, izdanja gradova).
  const HUB = process.argv.includes('--hub');
  const hubFiles = () => {
    const fixed = ['index.html', 'en/index.html', 'gnk-aktual/index.html', 'en/gnk-aktual/index.html', 'izdanja/index.html', 'mreza/index.html'];
    const cities = readdirSync(join(PORTAL, 'kanal')).filter((d) => statSync(join(PORTAL, 'kanal', d)).isDirectory());
    return [...fixed, ...cities.map((c) => join('kanal', c, 'index.html'))]
      .map((r) => join(PORTAL, r)).filter((f) => existsSync(f));
  };
  const ALL = process.argv.includes('--all');
  const files = ALL ? [...new Set([...walk(PORTAL).filter((f) => isNerminPage(relative(PORTAL, f))), ...hubFiles()])]
    : HUB ? hubFiles() : walk(PORTAL).filter((f) => isNerminPage(relative(PORTAL, f)));
  let changed = 0;
  let skipped = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = applyNerminTags(before);
    if (after === before) { skipped += 1; continue; }
    if (!CHECK) writeFileSync(file, after);
    changed += 1;
  }
  const cssPath = join(PORTAL, 'assets', 'am-tags-v1.css');
  if (!CHECK) {
    writeFileSync(cssPath, `.am-tags{max-width:1120px;margin:28px auto 8px;padding:16px 20px;border-radius:14px;background:linear-gradient(90deg,#1b3a5c 0%,#8a5a00 55%,#2e7d5b 100%);color:#fff;font:400 15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.am-tags-list{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.am-tags-list span{background:rgba(255,255,255,.16);border-radius:999px;padding:4px 12px;font:800 12px/1.4 system-ui,sans-serif;letter-spacing:.02em}
.am-tags-role{margin:0 0 4px;font-weight:700}
.am-tags-group{margin:0;font-size:14px;opacity:.92}
`);
  }
  console.log(JSON.stringify({ ok: true, pages: files.length, changed, alreadyTagged: skipped, check: CHECK }, null, 2));
}
