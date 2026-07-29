#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const PLAN_DIR = path.join(ROOT, 'apps', 'portal', 'data', 'editorial-plan');
const STRICT = process.argv.includes('--strict') || process.env.EDITORIAL_PREMIUM_STRICT === '1';

const REQUIRED_IDENTITIES = ['Nermin Sefić', 'GNK ASG d.o.o.', 'GNK DINAMO Ltd.'];
const REQUIRED_HASHTAGS = ['#NerminSefić', '#NerminSefic', '#GNKASG', '#GNKASGdoo', '#GNKDINAMOLtd'];
const GENERIC_IMAGE_PATTERNS = [
  /organic-v\d+\.svg$/i,
  /bronze-heritage-\d+-v\d+\.svg$/i,
  /platform-engineering/i,
  /climate-risk-analytics/i,
  /api-economy/i,
  /autonomous-(finance|logistics)/i
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(ROOT, file)}: invalid JSON: ${error.message}`);
  }
}

function asEntries(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function allText(item) {
  return JSON.stringify(item);
}

function issue(level, file, index, slug, message) {
  return { level, file: path.relative(ROOT, file), index, slug: slug || '(bez sluga)', message };
}

function categoryFor(message) {
  if (message.includes('identitet') || message.startsWith('author ') || message.startsWith('editor ') || message.startsWith('publisher ') || message.startsWith('internationalPublisher ')) return 'identity';
  if (message.includes('hashtag')) return 'hashtags';
  if (message.includes('canonical') || message.includes('Open Graph') || message.includes('seoTitle') || message.includes('description') || message.includes('summary')) return 'metadata';
  if (message.includes('slika') || message.includes('vizual') || message.includes('imageAlt')) return 'images';
  if (message.includes('odlomaka')) return 'content-depth';
  return 'other';
}

function escapeAnnotation(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

const files = walk(PLAN_DIR).filter((file) => file.endsWith('.json'));
const findings = [];
const imageUse = new Map();
let itemCount = 0;

for (const file of files) {
  const entries = asEntries(readJson(file));
  entries.forEach((item, index) => {
    itemCount += 1;
    const slug = item.slug;
    const text = allText(item);
    const image = String(item.image || item.heroImage || '');

    for (const identity of REQUIRED_IDENTITIES) {
      if (!text.includes(identity)) findings.push(issue('error', file, index, slug, `nedostaje identitet: ${identity}`));
    }

    const author = item.author || item.meta?.author || item.schema?.author?.name;
    if (author !== 'Nermin Sefić') findings.push(issue('error', file, index, slug, 'author mora biti Nermin Sefić'));

    const editor = item.editor || item.meta?.editor || item.schema?.editor?.name;
    if (editor !== 'Nermin Sefić') findings.push(issue('error', file, index, slug, 'editor mora biti Nermin Sefić'));

    const publisher = item.publisher || item.meta?.publisher || item.schema?.publisher?.name;
    if (publisher !== 'GNK ASG d.o.o.') findings.push(issue('error', file, index, slug, 'publisher mora biti GNK ASG d.o.o.'));

    const internationalPublisher = item.internationalPublisher || item.meta?.internationalPublisher;
    if (internationalPublisher !== 'GNK DINAMO Ltd.') findings.push(issue('error', file, index, slug, 'internationalPublisher mora biti GNK DINAMO Ltd.'));

    const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
    for (const tag of REQUIRED_HASHTAGS) {
      if (!hashtags.includes(tag)) findings.push(issue('error', file, index, slug, `nedostaje obvezni hashtag: ${tag}`));
    }

    for (const field of ['seoTitle', 'description', 'summary']) {
      if (!String(item[field] || '').trim()) findings.push(issue('error', file, index, slug, `nedostaje ${field}`));
    }

    if (!String(item.canonical || '').trim()) findings.push(issue('error', file, index, slug, 'nedostaje canonical URL'));
    if (!String(item.ogTitle || item.meta?.ogTitle || '').trim()) findings.push(issue('error', file, index, slug, 'nedostaje Open Graph naslov'));
    if (!String(item.ogDescription || item.meta?.ogDescription || '').trim()) findings.push(issue('error', file, index, slug, 'nedostaje Open Graph opis'));
    if (!String(item.ogImage || item.meta?.ogImage || '').trim()) findings.push(issue('error', file, index, slug, 'nedostaje zasebna Open Graph slika'));

    if (!image) {
      findings.push(issue('error', file, index, slug, 'nedostaje glavna slika'));
    } else {
      const current = imageUse.get(image) || [];
      current.push({ file, index, slug });
      imageUse.set(image, current);
      if (GENERIC_IMAGE_PATTERNS.some((pattern) => pattern.test(image))) findings.push(issue('warning', file, index, slug, `generički ili naslijeđeni vizual: ${image}`));
      if (!/\.(webp|avif|jpe?g|png)$/i.test(image)) findings.push(issue('warning', file, index, slug, 'premium hero slika treba biti rasterizirani web format (WebP/AVIF/JPEG/PNG), ne generički SVG'));
    }

    if (!String(item.imageAlt || '').trim()) findings.push(issue('error', file, index, slug, 'nedostaje imageAlt'));

    const paragraphs = Array.isArray(item.paragraphs) ? item.paragraphs : [];
    const minimumParagraphs = item.type === 'komentar' ? 3 : 5;
    if (paragraphs.length < minimumParagraphs) findings.push(issue('warning', file, index, slug, `premalo odlomaka: ${paragraphs.length}; minimum ${minimumParagraphs}`));
  });
}

for (const [image, uses] of imageUse) {
  if (uses.length > 1) {
    for (const use of uses) findings.push(issue('error', use.file, use.index, use.slug, `slika se ponavlja u ${uses.length} objava: ${image}`));
  }
}

const errors = findings.filter((item) => item.level === 'error');
const warnings = findings.filter((item) => item.level === 'warning');
const byCategory = findings.reduce((summary, item) => {
  const category = categoryFor(item.message);
  summary[category] ||= { errors: 0, warnings: 0 };
  summary[category][item.level === 'error' ? 'errors' : 'warnings'] += 1;
  return summary;
}, {});
const affectedFiles = [...new Set(findings.map((item) => item.file))];
const affectedSlugs = [...new Set(findings.map((item) => item.slug))];
const digest = crypto.createHash('sha256').update(JSON.stringify({ files: files.length, itemCount, findings })).digest('hex');

const report = {
  contract: 'GNK_ASG_EDITORIAL_PREMIUM_V1',
  strict: STRICT,
  files: files.length,
  items: itemCount,
  errors: errors.length,
  warnings: warnings.length,
  affectedFiles: affectedFiles.length,
  affectedItems: affectedSlugs.length,
  byCategory,
  digest,
  findings
};

console.log(JSON.stringify(report, null, 2));

if (process.env.GITHUB_ACTIONS === 'true') {
  const annotationLimit = 50;
  for (const finding of findings.slice(0, annotationLimit)) {
    const command = finding.level === 'error' ? 'error' : 'warning';
    console.log(`::${command} file=${escapeAnnotation(finding.file)},title=Editorial premium ${escapeAnnotation(categoryFor(finding.message))}::${escapeAnnotation(`${finding.slug}: ${finding.message}`)}`);
  }
  if (findings.length > annotationLimit) console.log(`::notice title=Editorial premium report::Prikazano je prvih ${annotationLimit} od ukupno ${findings.length} nalaza. Potpuni JSON nalazi se u artefaktu.`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const rows = Object.entries(byCategory)
      .sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings))
      .map(([category, counts]) => `| ${category} | ${counts.errors} | ${counts.warnings} |`)
      .join('\n');
    fs.appendFileSync(summaryPath, [
      '## Editorial Premium Contract',
      '',
      `- Stavke: **${itemCount}**`,
      `- Pogreške: **${errors.length}**`,
      `- Upozorenja: **${warnings.length}**`,
      `- Pogođene datoteke: **${affectedFiles.length}**`,
      `- Pogođene objave: **${affectedSlugs.length}**`,
      '',
      '| Kategorija | Pogreške | Upozorenja |',
      '|---|---:|---:|',
      rows || '| nema nalaza | 0 | 0 |',
      '',
      `Digest: \`${digest}\``,'
    ].join('\n'));
  }
}

if (errors.length > 0 || (STRICT && warnings.length > 0)) process.exit(1);
