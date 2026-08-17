#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const policyPath = 'config/canonical-truth-policy.json';
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

const targets = [
  'apps/portal/index.html',
  'apps/portal/en/index.html',
  'apps/portal/scripts/generate_seo.py'
];

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

const errors = findings.filter(x => x.severity === 'error');
console.log(JSON.stringify({
  policy: policy.version,
  checked: targets,
  findings,
  ok: errors.length === 0,
  errorCount: errors.length
}, null, 2));

process.exit(errors.length ? 1 : 0);
