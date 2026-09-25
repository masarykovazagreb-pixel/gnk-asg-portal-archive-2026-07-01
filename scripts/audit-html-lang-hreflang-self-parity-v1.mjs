import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, withHtmlLang: 0, withAlternates: 0, checkedSelfAlternates: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  return ent.isDirectory() ? walk(p) : (ent.isFile() && ent.name === 'index.html' ? [p] : []);
});
const routeOf = file => {
  const dir = path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return dir ? `/${dir}/` : '/';
};
const normalizeLang = value => String(value || '').trim().toLowerCase().replace('_', '-');

for (const file of walk(PORTAL)) {
  stats.pages++;
  const route = routeOf(file);
  const html = fs.readFileSync(file, 'utf8');
  const langMatch = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  if (!langMatch) {
    failures.push(`${route}: missing html lang`);
    continue;
  }
  stats.withHtmlLang++;
  const htmlLang = normalizeLang(langMatch[1]);
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(htmlLang)) failures.push(`${route}: invalid html lang ${langMatch[1]}`);

  const alternates = [];
  for (const m of html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*>/gi)) {
    alternates.push({ lang: normalizeLang(m[1] || m[4]), href: String(m[2] || m[3] || '').trim() });
  }
  if (!alternates.length) continue;
  stats.withAlternates++;

  const self = alternates.filter(a => {
    try { return new URL(a.href, 'https://gnk-asg.hr').pathname.replace(/\/+$/, '') === route.replace(/\/+$/, ''); }
    catch { return false; }
  });
  stats.checkedSelfAlternates += self.length;
  if (!self.length) failures.push(`${route}: hreflang cluster has no self-reference`);
  for (const alt of self) {
    if (alt.lang === 'x-default') continue;
    if (alt.lang.split('-')[0] !== htmlLang.split('-')[0]) failures.push(`${route}: self hreflang ${alt.lang} conflicts with html lang ${htmlLang}`);
  }
}

const report = { version: 'GNK_ASG_HTML_LANG_HREFLANG_SELF_PARITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'html-lang-hreflang-self-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
