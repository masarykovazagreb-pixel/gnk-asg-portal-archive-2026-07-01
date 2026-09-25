import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const IMAGE_SITEMAP = path.join(PORTAL, 'image-sitemap.xml');
const failures = [];
const warnings = [];

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const imageSitemap = fs.existsSync(IMAGE_SITEMAP) ? fs.readFileSync(IMAGE_SITEMAP, 'utf8') : '';
const now = Date.now();

for (const item of registry.items || []) {
  const publishedAt = Date.parse(item.publishedAt || '');
  if (Number.isFinite(publishedAt) && publishedAt > now) continue;
  const image = String(item.image || '').trim();
  if (!image) {
    failures.push(`${item.path || item.slug}: published editorial item missing image`);
    continue;
  }
  if (!/^https:\/\/gnk-asg\.hr\//i.test(image)) warnings.push(`${item.path || item.slug}: remote/non-canonical editorial image ${image}`);
  if (!imageSitemap.includes(`<image:loc>${image}</image:loc>`)) failures.push(`${item.path || item.slug}: editorial image absent from image-sitemap.xml`);
}

const report = {
  version: 'GNK_ASG_EDITORIAL_IMAGE_DISCOVERY_PARITY_V1',
  ok: failures.length === 0,
  semantics: {discovered: 'image appears in image-sitemap.xml', indexed: 'NOT_INFERRED'},
  stats: {registryItems: (registry.items || []).length, failures: failures.length, warnings: warnings.length},
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'editorial-image-discovery-parity');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
