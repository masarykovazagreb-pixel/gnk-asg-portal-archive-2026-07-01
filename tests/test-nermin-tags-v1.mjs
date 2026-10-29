#!/usr/bin/env node
// Test: svaka stranica Nermina Sefića (HR, EN, galerija) nosi hashtagove, ulogu glavnog
// urednika i izjavu o GNK DINAMO Ltd grupi. Provjerava stvarne datoteke.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tagBlock, langOf } from '../scripts/apply-nermin-tags-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SKIP = new Set(['admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters', 'api', 'assets', 'data', '__preview', 'automation-status']);
const walk = (d, out = []) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f, out); else if (n.endsWith('.html')) out.push(f); } return out; };
const pages = walk(PORTAL).filter((f) => { const p = relative(PORTAL, f).split(sep); return !p.some((x) => SKIP.has(x)) && p.some((x) => /nermin/i.test(x)); });

const fails = [];
if (pages.length < 100) fails.push(`premalo stranica Nermina: ${pages.length}`);
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f);
  const lang = langOf(html);
  if (!html.includes('data-am-tags="v1"')) { fails.push(`${rel}: nema bloka oznaka`); continue; }
  for (const h of ['#AKTUALMEDIA', '#GNKASG', '#GNKDINAMO', '#NerminSefić', '#NerminSefic']) if (!html.includes(h)) fails.push(`${rel}: nema ${h}`);
  const block = tagBlock(lang);
  if (!html.includes(block)) fails.push(`${rel}: blok oznaka nije u očekivanom obliku (${lang})`);
}
if (!existsSync(join(PORTAL, 'assets', 'am-tags-v1.css'))) fails.push('nema assets/am-tags-v1.css');

if (fails.length) { console.error('FAIL nermin tags:\n- ' + fails.slice(0, 30).join('\n- ')); process.exit(1); }
console.log(`PASS nermin tags: ${pages.length} stranica Nermina Sefića ima hashtagove, glavnog urednika i izjavu o GNK DINAMO Ltd grupi.`);
