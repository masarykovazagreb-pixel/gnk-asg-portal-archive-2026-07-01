import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const pages = [
  'index.html','en/index.html','about/index.html','en/about/index.html',
  'projects/index.html','en/projects/index.html','projects/roadmap/index.html',
  'en/projects/roadmap/index.html','finance/index.html','en/finance/index.html',
  'reports/index.html','en/reports/index.html','group-network/index.html'
];

const runtime = await read('assets/digital-headquarters-v1.js');
assert.match(runtime, /querySelectorAll\('\.dhq-status,\.dhq-note'\)/);
assert.match(runtime, /važno/);
assert.match(runtime, /javni prikaz\./);

for (const page of pages) {
  const html = await read(page);
  assert.doesNotMatch(html, /instagram|insta feed|social publishing|publish to instagram/i, `${page} exposes social publishing language`);
  assert.doesNotMatch(html, /DEPLOY_PUBLIC_PORTAL_SAFE|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|wrangler deploy/i, `${page} exposes deployment internals`);
  assert.doesNotMatch(html, /campaign mailer|bulk mail|scheduler status|credential status/i, `${page} exposes protected operations`);
}

console.log('public-surface-cleanliness: notices, deployment internals and social publishing remain off public routes');