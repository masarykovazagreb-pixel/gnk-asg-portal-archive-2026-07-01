import fs from 'node:fs';
import { execSync } from 'node:child_process';

const results = [];

function ok(label, detail = '') {
  results.push({ label, status: 'OK', detail });
}
function fail(label, detail = '') {
  results.push({ label, status: 'FAIL', detail });
}

// 1. Validate sitemap files
const sitemapFiles = [
  'apps/portal/sitemap.xml',
  'apps/portal/editorial-sitemap.xml',
  'apps/portal/visual-sitemap.xml',
  'apps/portal/image-sitemap.xml',
  'apps/portal/sitemap-index.xml',
];
for (const f of sitemapFiles) {
  try {
    const xml = fs.readFileSync(f, 'utf8');
    const openTags = (xml.match(/<url>/g) || []).length;
    const closeTags = (xml.match(/<\/url>/g) || []).length;
    if (openTags !== closeTags) throw new Error(`unbalanced <url> tags: ${openTags} vs ${closeTags}`);
    ok(`Sitemap: ${f}`, `${openTags} URLs`);
  } catch (err) {
    fail(`Sitemap: ${f}`, String(err.message || err));
  }
}

// 2. Validate key JS files parse (syntax check via node --check)
const jsFiles = [
  'apps/portal/assets/app.js',
  'apps/portal/assets/sticker-tiles-v1.js',
  'apps/portal/assets/floating-intelligence.js',
  'apps/portal/assets/public-unified-menu-v6.js',
];
for (const f of jsFiles) {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
    ok(`JS syntax: ${f}`);
  } catch (err) {
    fail(`JS syntax: ${f}`, String(err.stderr || err.message || err));
  }
}

// 3. Fetch a handful of key live pages and check HTTP status
const KEY_PAGES = [
  'https://gnk-asg.hr/',
  'https://gnk-asg.hr/en/',
  'https://gnk-asg.hr/objave/',
  'https://gnk-asg.hr/gnk-aktual/',
  'https://gnk-asg.hr/puls-trzista/',
  'https://gnk-asg.hr/kontakt/',
];

async function checkPages() {
  for (const url of KEY_PAGES) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        ok(`Live page: ${url}`, `HTTP ${res.status}`);
      } else {
        fail(`Live page: ${url}`, `HTTP ${res.status}`);
      }
    } catch (err) {
      fail(`Live page: ${url}`, String(err.message || err));
    }
  }
}

// 4. Check for pending editorial items awaiting explicit approval
function checkEditorialQueue() {
  try {
    const queue = JSON.parse(fs.readFileSync('apps/portal/data/editorial-approval-queue.json', 'utf8'));
    const pending = (queue.items || []).length;
    ok('Editorial approval queue', `${pending} item(s) on file (requires explicit human approval before publish, per house policy)`);
  } catch (err) {
    fail('Editorial approval queue', String(err.message || err));
  }
}

async function main() {
  await checkPages();
  checkEditorialQueue();

  const failCount = results.filter(r => r.status === 'FAIL').length;
  const okCount = results.filter(r => r.status === 'OK').length;

  const lines = [];
  lines.push(`# Provjera sustava — ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**Rezultat: ${okCount} OK, ${failCount} FAIL**`);
  lines.push('');
  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : '❌';
    lines.push(`${icon} **${r.label}**${r.detail ? ' — ' + r.detail : ''}`);
  }
  lines.push('');
  lines.push('_Automatska provjera pokreće se 3x dnevno (06:00, 12:00, 18:00 po Zagrebu). Nova urednička objava zahtijeva izričito ljudsko odobrenje prema politici uredništva — ova provjera to ne zaobilazi._');

  const report = lines.join('\n');
  fs.writeFileSync('/tmp/health-check-report.md', report);
  console.log(report);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

await main();
