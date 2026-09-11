import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const failures = [];
const checked = [];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? null;
const generic = /^(image|img|photo|picture|slika|fotografija|asset|thumbnail|hero|banner)(?:\s*\d+)?$/i;
const filenameish = /^(?:[a-z0-9_-]+)\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = attr(tag, 'src') || '';
    const altRaw = attr(tag, 'alt');
    const entity = attr(tag, 'data-entity') || '';
    if (altRaw === null) {
      failures.push(`${route}: ${src || '(missing-src)'} lacks explicit alt intent`);
      continue;
    }
    const alt = altRaw.trim();
    const decorative = alt === '';
    checked.push({route, src, alt, decorative, entity: entity || null});
    if (decorative) continue;
    if (alt.length < 8) failures.push(`${route}: informative image alt is too short: ${src} -> ${JSON.stringify(alt)}`);
    if (alt.length > 180) failures.push(`${route}: informative image alt exceeds 180 characters: ${src}`);
    if (generic.test(alt)) failures.push(`${route}: informative image uses generic alt text: ${src} -> ${JSON.stringify(alt)}`);
    if (filenameish.test(alt)) failures.push(`${route}: informative image alt appears to be a filename: ${src} -> ${JSON.stringify(alt)}`);
    if (entity && !normalize(alt).includes(normalize(entity))) failures.push(`${route}: data-entity=${JSON.stringify(entity)} is not represented in image alt for ${src}`);
  }
}

const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_ALT_QUALITY_V1',
  semantics: {
    decorative: 'Explicit empty alt is accepted and excluded from SEO entity requirements.',
    informative: 'Must use concise non-generic context text; filenames and placeholder labels fail closed.',
    entityContext: 'When an image explicitly declares data-entity, that entity must be represented in alt text. No entity is inferred from pixels.'
  },
  ok: failures.length === 0,
  stats: {
    imagesChecked: checked.length,
    informative: checked.filter(x => !x.decorative).length,
    decorative: checked.filter(x => x.decorative).length,
    explicitEntityImages: checked.filter(x => x.entity).length
  },
  failures,
  checked
};
const out = path.join(ROOT, 'artifacts', 'public-image-alt-quality');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
