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

const localPath = href => {
  try {
    const u = new URL(href, 'https://gnk-asg.hr');
    if (u.hostname !== 'gnk-asg.hr') return null;
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return null; }
};

const localFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

walk(PORTAL);
let pagesWithAlternates = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const alternates = [...html.matchAll(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map(m => ({ lang: m[1].toLowerCase(), href: m[2] }));
  if (!alternates.length) continue;
  pagesWithAlternates += 1;

  const xdefaults = alternates.filter(x => x.lang === 'x-default');
  if (xdefaults.length !== 1) {
    failures.push(`${route}: expected exactly one x-default hreflang, found ${xdefaults.length}`);
    continue;
  }

  const target = localPath(xdefaults[0].href);
  if (!target) {
    failures.push(`${route}: x-default must target https://gnk-asg.hr (${xdefaults[0].href})`);
    continue;
  }

  const declaredTargets = new Set(alternates.filter(x => x.lang !== 'x-default').map(x => localPath(x.href)).filter(Boolean));
  if (!declaredTargets.has(target)) {
    failures.push(`${route}: x-default target ${target} is not one of the declared language alternates`);
  }

  if (target !== '/' && !fs.existsSync(localFile(target))) {
    failures.push(`${route}: x-default target has no local index.html (${target})`);
  }
}

const report = {
  version: 'GNK_ASG_HREFLANG_XDEFAULT_COHERENCE_V1',
  scope: 'PUBLIC_INDEX_HTML_WITH_HREFLANG',
  ok: failures.length === 0,
  stats: { pagesChecked: pages.length, pagesWithAlternates },
  failures
};

const out = path.join(ROOT, 'artifacts', 'hreflang-xdefault-coherence');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
