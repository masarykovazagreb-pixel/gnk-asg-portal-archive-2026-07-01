import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const file = path.join(ROOT, 'apps', 'portal', 'image-sitemap.xml');
const failures = [];
const warnings = [];

if (!fs.existsSync(file)) {
  console.error(`Missing image sitemap: ${file}`);
  process.exit(1);
}

const xml = fs.readFileSync(file, 'utf8');
const images = [...xml.matchAll(/<image:image>([\s\S]*?)<\/image:image>/gi)].map((m, i) => {
  const block = m[1];
  const loc = block.match(/<image:loc>([\s\S]*?)<\/image:loc>/i)?.[1]?.trim() || '';
  const title = block.match(/<image:title>([\s\S]*?)<\/image:title>/i)?.[1]?.trim() || '';
  return {index: i + 1, loc, title};
});

const generic = /^(image|img|photo|picture|asset|slika|fotografija|gnk asg)$/i;
const filenameLike = /(?:^|\s)[\w-]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|\s)/i;

for (const image of images) {
  if (!image.loc) {
    failures.push(`image #${image.index}: missing image:loc`);
    continue;
  }
  if (!/^https:\/\/gnk-asg\.hr\//i.test(image.loc)) {
    warnings.push(`${image.loc}: non-canonical host requires explicit review`);
  }
  if (image.title) {
    if (image.title.length < 8) failures.push(`${image.loc}: image:title too short`);
    if (image.title.length > 220) failures.push(`${image.loc}: image:title too long (${image.title.length})`);
    if (generic.test(image.title)) failures.push(`${image.loc}: generic image:title '${image.title}'`);
    if (filenameLike.test(image.title)) failures.push(`${image.loc}: filename-like image:title '${image.title}'`);
  } else {
    warnings.push(`${image.loc}: no image:title; acceptable only when sitemap entry is purely discovery-oriented`);
  }
}

const duplicateLocs = [...new Set(images.map(x => x.loc).filter(Boolean).filter((loc, _, arr) => arr.filter(x => x === loc).length > 1))];
for (const loc of duplicateLocs) warnings.push(`${loc}: repeated across source pages; verify repetition is intentional`);

const report = {
  version: 'GNK_ASG_IMAGE_SITEMAP_TITLE_QUALITY_V1',
  ok: failures.length === 0,
  semantics: {
    imageTitle: 'descriptive metadata only; never identity inference from pixels',
    indexed: 'NOT_INFERRED'
  },
  stats: {images: images.length, withTitle: images.filter(x => x.title).length, duplicateImageLocs: duplicateLocs.length},
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'image-sitemap-title-quality');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
