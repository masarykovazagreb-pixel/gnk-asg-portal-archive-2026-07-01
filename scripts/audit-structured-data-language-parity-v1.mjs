import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, languageClaims: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  return ent.isDirectory() ? walk(p) : (ent.isFile() && ent.name === 'index.html' ? [p] : []);
});
const routeOf = file => {
  const dir = path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return dir ? `/${dir}/` : '/';
};
const norm = value => String(value || '').trim().toLowerCase().replace('_', '-').split('-')[0];

for (const file of walk(PORTAL)) {
  stats.pages++;
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  if (!htmlLang) continue;
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    const queue = [data];
    while (queue.length) {
      const node = queue.pop();
      if (Array.isArray(node)) { queue.push(...node); continue; }
      if (!node || typeof node !== 'object') continue;
      if (Object.prototype.hasOwnProperty.call(node, 'inLanguage')) {
        const values = Array.isArray(node.inLanguage) ? node.inLanguage : [node.inLanguage];
        for (const value of values) {
          if (typeof value !== 'string') continue;
          stats.languageClaims++;
          if (norm(value) && norm(value) !== norm(htmlLang)) failures.push(`${route}: JSON-LD inLanguage=${value} conflicts with html lang=${htmlLang}`);
        }
      }
      queue.push(...Object.values(node).filter(v => v && typeof v === 'object'));
    }
  }
}

const report = { version: 'GNK_ASG_STRUCTURED_DATA_LANGUAGE_PARITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'structured-data-language-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
