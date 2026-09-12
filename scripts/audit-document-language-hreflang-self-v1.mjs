import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const pages = [];

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['data', 'assets'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') pages.push(full);
  }
};

const routeFor = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};

const normalize = href => {
  try {
    const u = new URL(href, 'https://gnk-asg.hr');
    if (u.hostname !== 'gnk-asg.hr') return null;
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return null; }
};

walk(PORTAL);
let checked = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const htmlLang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
  const expectedLang = route === '/en/' || route.startsWith('/en/') ? 'en' : 'hr';
  if (!htmlLang) {
    failures.push(`${route}: html lang is missing`);
    continue;
  }
  checked += 1;
  if (htmlLang !== expectedLang) {
    failures.push(`${route}: html lang ${htmlLang} does not match route language ${expectedLang}`);
  }

  const alternates = [...html.matchAll(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map(m => ({ lang: m[1].toLowerCase(), href: normalize(m[2]) }));
  if (!alternates.length) continue;

  const self = alternates.filter(x => x.lang === expectedLang && x.href === route);
  if (self.length !== 1) {
    failures.push(`${route}: expected exactly one self hreflang ${expectedLang}, found ${self.length}`);
  }
}

const report = {
  version: 'GNK_ASG_DOCUMENT_LANGUAGE_HREFLANG_SELF_V1',
  scope: 'PUBLIC_INDEX_HTML',
  ok: failures.length === 0,
  stats: { pagesChecked: pages.length, pagesWithHtmlLang: checked },
  failures
};

const out = path.join(ROOT, 'artifacts', 'document-language-hreflang-self');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
