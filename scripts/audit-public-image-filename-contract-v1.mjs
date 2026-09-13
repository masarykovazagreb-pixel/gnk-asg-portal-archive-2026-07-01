import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const findings = [];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() || '';
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?:=|\\s|>|/)`, 'i').test(tag);
const clean = src => String(src || '').split(/[?#]/)[0];
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};
const indexable = html => !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(
  html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || ''
);
const generic = base => /^(?:img|image|photo|picture|asset|pic|dsc|pxl|screenshot|screen)[-_]?[a-z0-9]*$/i.test(base);
const opaque = base => /^[a-f0-9]{16,}$/i.test(base) || /^[0-9_-]{10,}$/.test(base);
const semantic = src => {
  const p = clean(src);
  const ext = path.extname(p);
  const base = path.basename(p, ext);
  return Boolean(base && !generic(base) && !opaque(base) && /[a-zA-Z]{3,}/.test(base));
};

function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name.startsWith('.') || ['data', 'assets', '_headers'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile() && e.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (!indexable(html)) continue;
      const route = routeFromFile(full);
      for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
        const tag = m[0];
        const src = attr(tag, 'src');
        const altPresent = hasAttr(tag, 'alt');
        const alt = attr(tag, 'alt');
        const decorative = altPresent && alt === '';
        const local = src && !/^https?:\/\//i.test(src) && !/^data:/i.test(src);
        if (!local || decorative) continue;
        const ok = semantic(src);
        findings.push({route, src, semanticFilename: ok});
        if (!ok) failures.push(`${route}: informative local image has generic/opaque filename: ${src}`);
      }
    }
  }
}

if (!fs.existsSync(PORTAL)) {
  console.error(`Portal missing: ${PORTAL}`);
  process.exit(1);
}
walk(PORTAL);
const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_FILENAME_CONTRACT_V1',
  evidenceSemantics: 'STATIC_LOCAL_FILENAME_POLICY_ONLY; no pixel/content inference',
  ok: failures.length === 0,
  checked: findings.length,
  failures,
  findings
};
const out = path.join(ROOT, 'artifacts', 'public-image-filename-contract');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
