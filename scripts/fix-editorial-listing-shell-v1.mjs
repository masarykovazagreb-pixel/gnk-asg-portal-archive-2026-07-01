#!/usr/bin/env node
/**
 * ZATVORI PRAZNE LJUSKE — stranice koje završavaju bez `</body>`.
 *
 * `/komentari/` i `/objave/` nastale su kao dugi popisi: HTML završava na
 * zadnjem `<script>` retku, bez `</body>` i `</html>`. Zato ih, za razliku od
 * svih ostalih stranica, nije mogao dohvatiti ni sloj impressuma ni traka
 * autora — oba se ubacuju prije `</body>`.
 *
 * Alat je idempotentan: ako stranica ima `</body>`, ne dira je. Ako nema,
 * dodaje impressum, traku autora i zatvara dokument, istim redoslijedom kao
 * `apply-impressum-v1.mjs`.
 *
 *   node scripts/fix-editorial-listing-shell-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { impressumBlock } from '../apps/shared/impressum-v1.mjs';
import { authorBand } from '../apps/shared/author-band-v1.mjs';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const ROOTS = ['apps/portal', 'apps/world/site', 'apps/sites/site', 'apps/tjednik/site',
  'apps/kanal/site', 'apps/arhiva/site', 'apps/dnevnik/site'];
const SKIP = new Set(['node_modules', '.git', 'assets', 'data', '__preview',
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard',
  'digital-headquarters', 'media-registration-admin', 'api', 'app',
  'synapse-demo', 'pulse-demo', 'workers', 'scripts']);

const CSS_LINK = '<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025">';

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let closed = 0;
const touched = [];

for (const relRoot of ROOTS) {
  const dir = join(ROOT, relRoot);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const html = readFileSync(file, 'utf8');
    if (!/<html[\s>]/i.test(html)) continue;
    if (/<\/body>/i.test(html)) continue;
    if (/http-equiv="refresh"/i.test(html)) continue;
    const lang = (/<html[^>]+lang="([a-z]{2})"/i.exec(html) || [, 'hr'])[1].toLowerCase();

    let out = html;
    if (!out.includes('/assets/author-band-v1.css')) {
      out = out.replace(/<\/head>/i, `${CSS_LINK}\n</head>`);
    }
    const tail = [];
    if (!out.includes('data-am-impressum')) tail.push(impressumBlock(lang));
    if (!out.includes('data-am-author')) tail.push(authorBand(lang));
    if (!out.includes('data-am-netday')) tail.push(refreshTag('/'));
    out = `${out.replace(/\s+$/, '')}\n${tail.join('\n')}\n</body>\n</html>\n`;

    if (!CHECK) writeFileSync(file, out);
    closed += 1;
    touched.push(relative(ROOT, file));
  }
}

console.log(JSON.stringify({ ok: true, mode: CHECK ? 'check' : 'write', closed, touched }, null, 2));
