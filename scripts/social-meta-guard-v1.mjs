// GNK ASG — Social Meta Guard.
// Provjerava da svaki URL koji ide u social-distribution plan ima potpun,
// jak skup meta/OG/Twitter/schema podataka PRIJE nego uđe u objavu.
// Ne šalje objavu ako izvorna stranica nema kompletnu meta osnovu -
// umjesto toga bilježi u audit report i preskace tu stavku.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'apps/portal';
const REQUIRED_META = [
  { name: 'title', re: /<title>[^<]{10,}<\/title>/i },
  { name: 'meta:description', re: /<meta name="description" content="[^"]{40,}"/i },
  { name: 'canonical', re: /<link rel="canonical" href="https:\/\/gnk-asg\.hr[^"]*">/i },
  { name: 'og:title', re: /<meta property="og:title" content="[^"]{5,}"/i },
  { name: 'og:description', re: /<meta property="og:description" content="[^"]{20,}"/i },
  { name: 'og:image', re: /<meta property="og:image" content="https:\/\/gnk-asg\.hr[^"]*"/i },
  { name: 'og:url', re: /<meta property="og:url" content="https:\/\/gnk-asg\.hr[^"]*"/i },
  { name: 'twitter:card', re: /<meta name="twitter:card" content="[^"]+"/i },
  { name: 'author', re: /<meta name="author" content="[^"]{5,}"/i },
  { name: 'json-ld', re: /<script type="application\/ld\+json">/i },
];

function pathToFile(urlPath) {
  const clean = urlPath.replace(/^https?:\/\/gnk-asg\.hr/, '').replace(/\?.*$/, '');
  const rel = clean.endsWith('/') ? clean + 'index.html' : clean + '/index.html';
  return join(ROOT, rel);
}

function auditOne(urlPath) {
  const file = pathToFile(urlPath);
  if (!existsSync(file)) return { urlPath, ok: false, missing: ['file-not-found'] };
  const html = readFileSync(file, 'utf8');
  const missing = REQUIRED_META.filter((m) => !m.re.test(html)).map((m) => m.name);
  return { urlPath, ok: missing.length === 0, missing, score: Math.round(((REQUIRED_META.length - missing.length) / REQUIRED_META.length) * 100) };
}

// Provjeri sve URL-ove trenutno korištene kao izvor za social distribution
// (najnoviji editorial, AKTUAL, World Topics arhiva) + kljucne korporativne
// stranice (Nermin Sefić, GNK ASG naslovnica, GNK DINAMO Ltd povezane).
function collectSocialSourceUrls() {
  const urls = new Set(['/', '/en/', '/nermin-sefic/', '/en/nermin-sefic/', '/gnk-aktual/', '/en/gnk-aktual/']);
  try {
    const registry = JSON.parse(readFileSync(`${ROOT}/data/editorial-registry.json`, 'utf8'));
    for (const item of (registry.items || []).slice(0, 40)) {
      if (item.path) urls.add(item.path);
    }
  } catch {}
  return [...urls];
}

const urls = collectSocialSourceUrls();
const results = urls.map(auditOne);
const failing = results.filter((r) => !r.ok);
const avgScore = Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length);

const report = {
  generatedAt: new Date().toISOString(),
  checked: results.length,
  passing: results.length - failing.length,
  failing: failing.length,
  avgScore,
  failingDetail: failing,
};

mkdirSync(`${ROOT}/data/seo-audit`, { recursive: true });
writeFileSync(`${ROOT}/data/seo-audit/social-meta-guard.json`, JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify({ checked: report.checked, passing: report.passing, failing: report.failing, avgScore }, null, 2));
if (failing.length) {
  console.log('URLs needing meta reinforcement:');
  for (const f of failing) console.log(` - ${f.urlPath}: missing [${f.missing.join(', ')}]`);
}
