import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const LINKEDIN = 'https://www.linkedin.com/in/nermin-sefic-18573196';
const failures = [];

function read(rel) {
  const file = path.join(PORTAL, rel);
  if (!fs.existsSync(file)) {
    failures.push(`missing ${rel}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireIn(text, needle, label) {
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`);
}

const hr = read('nermin-sefic/index.html');
const en = read('en/nermin-sefic/index.html');
const home = read('index.html');
const sitemap = read('sitemap.xml');

const HR = `${SITE}/nermin-sefic/`;
const EN = `${SITE}/en/nermin-sefic/`;

for (const [html, lang, self, other] of [[hr, 'hr', HR, EN], [en, 'en', EN, HR]]) {
  requireIn(html, `<link rel="canonical" href="${self}"`, `${lang} canonical`);
  requireIn(html, `hreflang="hr" href="${HR}"`, `${lang} hreflang hr`);
  requireIn(html, `hreflang="en" href="${EN}"`, `${lang} hreflang en`);
  requireIn(html, `hreflang="x-default" href="${HR}"`, `${lang} x-default`);
  requireIn(html, '"@type":"Person"', `${lang} Person schema`);
  requireIn(html, '"name":"Nermin Sefić"', `${lang} Person name`);
  requireIn(html, '"alternateName":"Nermin Sefic"', `${lang} alternateName`);
  requireIn(html, LINKEDIN, `${lang} canonical LinkedIn sameAs`);
}

requireIn(home, 'GNK ASG d.o.o.', 'homepage organization signal');
if (!/Nermin Sefi(?:ć|c)/i.test(home)) failures.push('homepage: missing Nermin Sefić/Sefic entity signal');
if (!home.includes('"@type":"Organization"') && !home.includes('"@type": "Organization"')) {
  failures.push('homepage: missing Organization JSON-LD signal');
}

for (const url of [HR, EN]) requireIn(sitemap, `<loc>${url}</loc>`, 'sitemap');
requireIn(sitemap, `hreflang="hr" href="${HR}"`, 'sitemap hreflang hr');
requireIn(sitemap, `hreflang="en" href="${EN}"`, 'sitemap hreflang en');

const legacy = path.join(PORTAL, 'hr', 'nermin-sefic', 'index.html');
if (fs.existsSync(legacy)) failures.push('unexpected duplicate legacy route apps/portal/hr/nermin-sefic/index.html');

const result = { ok: failures.length === 0, checks: 'GNK_ASG_NERMIN_ENTITY_SEO_V1', failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
