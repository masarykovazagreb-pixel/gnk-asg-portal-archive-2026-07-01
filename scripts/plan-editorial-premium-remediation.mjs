#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] || 'ops/evidence/editorial-premium-contract.json';
const outputJson = process.argv[3] || 'ops/evidence/editorial-premium-remediation.json';
const outputMd = process.argv[4] || 'ops/evidence/editorial-premium-remediation.md';

if (!fs.existsSync(input)) {
  console.error(`Nedostaje validation report: ${input}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(input, 'utf8'));
} catch (error) {
  console.error(`Neispravan JSON report: ${error.message}`);
  process.exit(1);
}

const today = String(process.env.EDITORIAL_REFERENCE_DATE || new Date().toISOString().slice(0, 10)).replaceAll('-', '');
const categoryFor = (message = '') => {
  if (message.includes('identitet') || message.startsWith('author ') || message.startsWith('editor ') || message.startsWith('publisher ') || message.startsWith('internationalPublisher ')) return 'identity';
  if (message.includes('hashtag')) return 'hashtags';
  if (message.includes('canonical') || message.includes('Open Graph') || message.includes('seoTitle') || message.includes('description') || message.includes('summary')) return 'metadata';
  if (message.includes('slika') || message.includes('vizual') || message.includes('imageAlt')) return 'images';
  if (message.includes('odlomaka')) return 'content-depth';
  return 'other';
};

const files = new Map();
for (const finding of report.findings || []) {
  const entry = files.get(finding.file) || {
    file: finding.file,
    errors: 0,
    warnings: 0,
    items: new Set(),
    categories: {}
  };
  if (finding.level === 'error') entry.errors += 1;
  else entry.warnings += 1;
  entry.items.add(finding.slug || `(index ${finding.index ?? '?'})`);
  const category = categoryFor(finding.message);
  entry.categories[category] ||= { errors: 0, warnings: 0 };
  entry.categories[category][finding.level === 'error' ? 'errors' : 'warnings'] += 1;
  files.set(finding.file, entry);
}

const ranked = [...files.values()].map((entry) => {
  const match = path.basename(entry.file).match(/(20\d{6})/);
  const date = match?.[1] || null;
  const horizon = !date ? 'undated' : date < today ? 'legacy' : date === today ? 'active' : 'future';
  const priority = horizon === 'active' ? 0 : horizon === 'future' ? 1 : horizon === 'undated' ? 2 : 3;
  return {
    ...entry,
    items: [...entry.items],
    itemCount: entry.items.size,
    date,
    horizon,
    priority
  };
}).sort((a, b) => a.priority - b.priority || (a.date || '').localeCompare(b.date || '') || b.errors - a.errors || b.warnings - a.warnings);

const remediation = {
  contract: 'GNK_ASG_EDITORIAL_PREMIUM_REMEDIATION_V1',
  referenceDate: today,
  sourceDigest: report.digest || null,
  sourceSummary: {
    files: report.files || 0,
    items: report.items || 0,
    errors: report.errors || 0,
    warnings: report.warnings || 0
  },
  policy: {
    order: ['active', 'future', 'undated', 'legacy'],
    mutateContent: false,
    note: 'Ovaj artefakt samo rangira nalaze. Ne mijenja editorial pakete i ne slabi premium contract.'
  },
  files: ranked.map(({ priority, ...entry }) => entry)
};

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(remediation, null, 2)}\n`);

const lines = [
  '# Editorial Premium Remediation',
  '',
  `Referentni datum: **${today}**`,
  `Izvorni digest: \`${remediation.sourceDigest || 'n/a'}\``,
  '',
  '| Prioritet | Datum | Datoteka | Stavke | Pogreške | Upozorenja |',
  '|---|---|---|---:|---:|---:|'
];
for (const entry of ranked) {
  lines.push(`| ${entry.horizon} | ${entry.date || '—'} | \`${entry.file}\` | ${entry.itemCount} | ${entry.errors} | ${entry.warnings} |`);
}
lines.push('', '> Ovaj plan je read-only: ne mijenja sadržaj, slike, rute ni produkciju.', '');
fs.writeFileSync(outputMd, lines.join('\n'));

console.log(JSON.stringify({
  contract: remediation.contract,
  referenceDate: today,
  rankedFiles: ranked.length,
  active: ranked.filter((entry) => entry.horizon === 'active').length,
  future: ranked.filter((entry) => entry.horizon === 'future').length,
  legacy: ranked.filter((entry) => entry.horizon === 'legacy').length,
  outputJson,
  outputMd
}, null, 2));
