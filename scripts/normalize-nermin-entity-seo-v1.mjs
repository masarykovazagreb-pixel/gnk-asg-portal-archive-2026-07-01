import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WRITE = process.argv.includes('--write');
const LINKEDIN_CANONICAL = 'https://www.linkedin.com/in/nermin-sefic-18573196';

const targets = [
  {
    lang: 'hr',
    file: 'apps/portal/nermin-sefic/index.html',
    canonical: 'https://gnk-asg.hr/nermin-sefic/',
    alternate: 'https://gnk-asg.hr/en/nermin-sefic/',
  },
  {
    lang: 'en',
    file: 'apps/portal/en/nermin-sefic/index.html',
    canonical: 'https://gnk-asg.hr/en/nermin-sefic/',
    alternate: 'https://gnk-asg.hr/nermin-sefic/',
  },
];

function normalizeLinkedIn(html) {
  return html.replace(
    /https:\/\/[a-z]{2}\.linkedin\.com\/in\/nermin-sefic-18573196\/?/gi,
    LINKEDIN_CANONICAL,
  );
}

function requiredSignals(target) {
  const { lang, canonical, alternate } = target;
  return [
    { name: 'canonical', value: `<link rel="canonical" href="${canonical}"` },
    { name: `${lang}-hreflang`, value: `hreflang="${lang}" href="${canonical}"` },
    { name: `${lang === 'hr' ? 'en' : 'hr'}-hreflang`, value: `hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alternate}"` },
    { name: 'person-name', value: '"name":"Nermin Sefić"' },
    { name: 'alternate-name', value: '"alternateName":"Nermin Sefic"' },
    { name: 'linkedin-sameAs', value: LINKEDIN_CANONICAL },
  ];
}

let changed = 0;
let failures = 0;

for (const target of targets) {
  const abs = path.join(ROOT, target.file);
  if (!fs.existsSync(abs)) {
    console.error(`FAIL missing ${target.file}`);
    failures++;
    continue;
  }

  const original = fs.readFileSync(abs, 'utf8');
  const normalized = normalizeLinkedIn(original);

  if (normalized !== original) {
    changed++;
    if (WRITE) {
      fs.writeFileSync(abs, normalized, 'utf8');
      console.log(`WRITE normalized LinkedIn identity URL: ${target.file}`);
    } else {
      console.error(`DRIFT localized LinkedIn identity URL: ${target.file}`);
      failures++;
    }
  }

  const effective = WRITE ? normalized : original;
  for (const signal of requiredSignals(target)) {
    if (!effective.includes(signal.value)) {
      console.error(`FAIL ${target.file}: missing ${signal.name}`);
      failures++;
    }
  }
}

const legacy = path.join(ROOT, 'apps/portal/hr/nermin-sefic/index.html');
if (fs.existsSync(legacy)) {
  console.error('FAIL unexpected legacy duplicate route exists: apps/portal/hr/nermin-sefic/index.html');
  failures++;
}

if (failures) {
  console.error(JSON.stringify({ ok: false, write: WRITE, changed, failures }));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, write: WRITE, changed, failures: 0 }));
