#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const policyPath = 'config/canonical-truth-policy.json';
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

const targets = [
  'apps/portal/index.html',
  'apps/portal/en/index.html',
  'apps/portal/scripts/generate_seo.py'
];

const ARTICLE_504 = 'apps/portal/aktual/gnk-asg-504-milijuna-eura-prihoda/index.html';
const IMAGE_504 = 'apps/portal/aktual/gnk-asg-504-milijuna-eura-prihoda/img/pocetna-infografika.webp';
const APPROVED_504_IMAGE = '/aktual/gnk-asg-504-milijuna-eura-prihoda/img/pocetna-infografika.webp';

const findings = [];
const add = (severity, file, rule, detail) => findings.push({severity, file, rule, detail});

for (const file of targets) {
  if (!existsSync(file)) {
    add('error', file, 'missing-file', 'Expected truth-layer source is missing.');
    continue;
  }
  const text = readFileSync(file, 'utf8');

  for (const term of policy.prohibitedPublicTerms || []) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      add('error', file, 'prohibited-public-term', term);
    }
  }
  for (const id of policy.prohibitedPublicEntityIds || []) {
    if (text.toLowerCase().includes(id.toLowerCase())) {
      add('error', file, 'prohibited-public-entity-id', id);
    }
  }

  if (/45\s+(povezanih\s+društava|group\s+companies)/i.test(text)) {
    add('error', file, 'group-company-count', '45 is not an approved connected-company count; canonical value is 33 companies plus 12 planned locations.');
  }

  if (file === 'apps/portal/index.html' && /ažurira se svaki sat/i.test(text)) {
    add('error', file, 'market-cadence', 'Homepage says hourly; canonical public cadence is every 2 hours.');
  }
  if (file === 'apps/portal/en/index.html' && /(updated|refresh(?:ed|es)?) every hour/i.test(text)) {
    add('error', file, 'market-cadence', 'English homepage says hourly; canonical public cadence is every 2 hours.');
  }
}

// 504M article is a protected publication: body/design stay unchanged. The only
// approved visual correction is inside the existing pocetna-infografika.webp.
if (!existsSync(ARTICLE_504)) {
  add('error', ARTICLE_504, '504m-missing-article', 'Protected 504M article source is missing.');
} else {
  const html = readFileSync(ARTICLE_504, 'utf8');
  const canonical = 'https://gnk-asg.hr/aktual/gnk-asg-504-milijuna-eura-prihoda/';
  if (!html.includes(canonical)) {
    add('error', ARTICLE_504, '504m-canonical', 'Protected 504M canonical URL changed or is missing.');
  }
  if (!html.includes('pocetna-infografika.webp')) {
    add('error', ARTICLE_504, '504m-image-reference', 'Protected 504M article no longer references pocetna-infografika.webp.');
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] || '';
  if (og && !og.endsWith(APPROVED_504_IMAGE)) {
    add('error', ARTICLE_504, '504m-og-image', `OG image changed: ${og}`);
  }
}
if (!existsSync(IMAGE_504)) {
  add('error', IMAGE_504, '504m-missing-image', 'Protected 504M infographic is missing.');
}

const errors = findings.filter(x => x.severity === 'error');
console.log(JSON.stringify({
  policy: policy.version,
  checked: [...targets, ARTICLE_504, IMAGE_504],
  findings,
  ok: errors.length === 0,
  errorCount: errors.length
}, null, 2));

process.exit(errors.length ? 1 : 0);
