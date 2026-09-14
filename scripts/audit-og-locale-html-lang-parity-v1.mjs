import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, pagesWithOgLocale: 0, checked: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  return ent.isDirectory() ? walk(p) : (ent.isFile() && ent.name === 'index.html' ? [p] : []);
});
const routeOf = file => {
  const dir = path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return dir ? `/${dir}/` : '/';
};
const langPrimary = value => String(value || '').trim().toLowerCase().replace('_', '-').split('-')[0];

for (const file of walk(PORTAL)) {
  stats.pages++;
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  const locale = html.match(/<meta\b[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["'][^>]*>|<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:locale["'][^>]*>/i);
  if (!locale) continue;
  stats.pagesWithOgLocale++;
  const value = locale[1] || locale[2] || '';
  if (!htmlLang) {
    failures.push(`${route}: og:locale present but html lang missing`);
    continue;
  }
  stats.checked++;
  if (!/^[a-z]{2,3}[_-][A-Z]{2}$/i.test(value.trim())) failures.push(`${route}: malformed og:locale ${value}`);
  if (langPrimary(value) !== langPrimary(htmlLang)) failures.push(`${route}: og:locale ${value} conflicts with html lang ${htmlLang}`);
}

const report = { version: 'GNK_ASG_OG_LOCALE_HTML_LANG_PARITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'og-locale-html-lang-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
