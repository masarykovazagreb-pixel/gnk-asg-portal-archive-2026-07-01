import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { htmlFiles: 0, images: 0, informativeImages: 0, invalidWidth: 0, invalidHeight: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const p = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(p) : [p];
});
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? null;
const positiveInteger = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);

for (const file of walk(PORTAL).filter(f => f.endsWith('.html'))) {
  stats.htmlFiles++;
  const rel = '/' + path.relative(PORTAL, file).replaceAll(path.sep, '/');
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    stats.images++;
    const tag = match[0];
    const alt = attr(tag, 'alt');
    const decorative = alt === '';
    if (decorative) continue;
    stats.informativeImages++;
    const src = attr(tag, 'src') || '(missing-src)';
    const width = attr(tag, 'width');
    const height = attr(tag, 'height');
    if (!positiveInteger(width)) {
      stats.invalidWidth++;
      failures.push(`${rel}: informative image ${src} must declare a positive integer width; got ${JSON.stringify(width)}`);
    }
    if (!positiveInteger(height)) {
      stats.invalidHeight++;
      failures.push(`${rel}: informative image ${src} must declare a positive integer height; got ${JSON.stringify(height)}`);
    }
  }
}

const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_DIMENSION_INTEGRITY_V1',
  scope: 'PUBLIC_HTML_INFORMATIVE_IMAGES',
  semantics: 'STATIC_INTRINSIC_DIMENSION_CONTRACT_ONLY',
  ok: failures.length === 0,
  stats,
  failures
};
const out = path.join(ROOT, 'artifacts', 'public-image-dimension-integrity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
