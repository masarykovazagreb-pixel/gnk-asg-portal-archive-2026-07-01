#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  { locale: 'hr', file: 'apps/portal/index.html' },
  { locale: 'en', file: 'apps/portal/en/index.html' },
];
const evidenceDir = path.join(ROOT, 'artifacts', 'home-truth-consistency');
fs.mkdirSync(evidenceDir, { recursive: true });

const unique = values => [...new Set(values.map(Number).filter(Number.isFinite))];

function collectCounts(html, locale) {
  const patterns = locale === 'hr'
    ? [
        /Broj povezanih društava[\s\S]{0,160}?<dd[^>]*>\s*(\d+)\s*</i,
        /(\d+)\s+povezanih društava\s*[·|+]/gi,
        /Interaktivna karta\s+(\d+)\s+povezanih društava/gi,
      ]
    : [
        /Number of related companies[\s\S]{0,160}?<dd[^>]*>\s*(\d+)\s*</i,
        /(\d+)\s+related companies\s*[·|+]/gi,
        /Interactive map[^<]{0,80}?(\d+)\s+related companies/gi,
      ];

  const values = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      values.push(Number(match[1]));
      if (!pattern.global) break;
    }
  }
  return unique(values);
}

const report = {
  generatedAt: new Date().toISOString(),
  contract: 'Homepage related-company count must be internally consistent per locale. This gate does not choose or invent the authoritative count.',
  targets: [],
  ok: true,
};

for (const target of TARGETS) {
  const fullPath = path.join(ROOT, target.file);
  if (!fs.existsSync(fullPath)) {
    report.targets.push({ ...target, status: 'missing-file', counts: [] });
    report.ok = false;
    continue;
  }
  const html = fs.readFileSync(fullPath, 'utf8');
  const counts = collectCounts(html, target.locale);
  const status = counts.length === 0 ? 'unobserved' : counts.length === 1 ? 'consistent' : 'conflict';
  report.targets.push({ ...target, status, counts });
  if (status === 'conflict') report.ok = false;
}

fs.writeFileSync(path.join(evidenceDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

for (const target of report.targets) {
  console.log(`[truth:${target.locale}] ${target.file}: ${target.status}; counts=${target.counts.join(',') || 'none'}`);
}

if (!report.ok) {
  console.error('Homepage truth-consistency contract failed. Resolve the source-of-truth conflict before merge/deploy; do not guess a replacement value.');
  process.exit(1);
}
