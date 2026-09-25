import fs from 'node:fs';
import path from 'node:path';

const root = 'apps/portal';
const file = path.join(root, 'sitemap-index.xml');
const errors = [];
if (!fs.existsSync(file)) errors.push('missing sitemap-index.xml');
else {
  const xml = fs.readFileSync(file, 'utf8');
  const seen = new Set();
  for (const match of xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/sitemap>/g)) {
    const url = new URL(match[1].trim());
    const lastmod = match[2].trim();
    if (url.origin !== 'https://gnk-asg.hr') errors.push(`foreign sitemap origin: ${url.href}`);
    if (seen.has(url.pathname)) errors.push(`duplicate sitemap child: ${url.pathname}`);
    seen.add(url.pathname);
    const local = path.join(root, url.pathname.replace(/^\//, ''));
    if (!fs.existsSync(local)) errors.push(`missing sitemap child: ${url.pathname}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) errors.push(`invalid lastmod: ${lastmod}`);
    const date = new Date(`${lastmod}T23:59:59Z`);
    if (!Number.isNaN(date.valueOf()) && date > new Date(Date.now() + 86400000)) errors.push(`future lastmod: ${url.pathname}`);
  }
  if (!seen.size) errors.push('sitemap-index has no sitemap children');
}
fs.mkdirSync('artifacts/sitemap-index-contract', { recursive: true });
fs.writeFileSync('artifacts/sitemap-index-contract/report.json', JSON.stringify({ errors }, null, 2));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('sitemap-index contract PASS');
