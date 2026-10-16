import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const validator = path.resolve(process.env.EDITORIAL_POLICY_VALIDATOR || 'scripts/validate-editorial-content-policy-v1.mjs');
assert.ok(fs.existsSync(validator), `missing validator: ${validator}`);

const meaningful = 'Novi komentar jasno razlikuje provjerenu činjenicu od autorskog zaključka.';

function baseItem(overrides = {}) {
  return {
    type: 'objava',
    slug: 'test-objava',
    title: 'Testna objava',
    seoTitle: 'Testna objava | GNK ASG',
    description: 'Testni meta opis uredničkog sadržaja.',
    summary: 'Testni sažetak uredničkog sadržaja.',
    image: '/assets/nermin-sefic/testna-fotografija.webp',
    paragraphs: [meaningful],
    links: ['/objave/', '/komentari/', '/analize/', '/nermin-sefic/', '/projekti/'],
    ...overrides,
  };
}

function runCase(name, { item, packageOverrides = {}, holds = null, expectedStatus, expectedMarker }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gnk-editorial-policy-${name}-`));
  const manifestPath = path.join(dir, 'manifest.json');
  const packageId = `TEST-${name.toUpperCase()}`;
  fs.writeFileSync(path.join(dir, 'items.json'), JSON.stringify([item], null, 2));
  fs.writeFileSync(manifestPath, JSON.stringify({
    packages: [{
      id: packageId,
      publishAt: '2026-08-06T10:20:00+02:00',
      files: ['items.json'],
      ...packageOverrides,
    }],
  }, null, 2));
  if (holds) {
    fs.writeFileSync(path.join(dir, 'publication-holds.json'), JSON.stringify({
      version: 'TEST_PUBLICATION_HOLDS_V1',
      holds: holds.map(hold => ({ packageId, active: true, reason: 'Substantive editorial rewrite and review required before publication.', ...hold })),
    }, null, 2));
  }

  const result = spawnSync(process.execPath, [validator], {
    cwd: process.cwd(),
    env: { ...process.env, EDITORIAL_PLAN_PATH: manifestPath },
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, expectedStatus, `${name}: unexpected exit status\n${output}`);
  assert.match(output, expectedMarker, `${name}: missing expected marker\n${output}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

runCase('pass-short-publication', {
  item: baseItem({ paragraphs: ['Poslovni trošak traži provjeru stvarnog ugovora.'] }),
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

runCase('pass-short-commentary', {
  item: baseItem({ type: 'komentar', paragraphs: ['Izvor prikazuje tvrdnju; naša analiza postavlja konkretno pitanje.'] }),
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

runCase('pass-short-analysis', {
  item: baseItem({ type: 'analiza', paragraphs: ['Zaključak vrijedi samo uz jasno navedene pretpostavke.'] }),
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

runCase('fail-empty-body', {
  item: baseItem({ paragraphs: [] }),
  expectedStatus: 1,
  expectedMarker: /body requires non-empty text paragraphs/,
});

runCase('fail-whitespace-body', {
  item: baseItem({ paragraphs: ['   ', '  '] }),
  expectedStatus: 1,
  expectedMarker: /body requires non-empty text paragraphs/,
});

runCase('fail-duplicated-paragraphs', {
  item: baseItem({ paragraphs: ['Ista izvorna tvrdnja.', ' ISTA  izvorna   tvrdnja. '] }),
  expectedStatus: 1,
  expectedMarker: /contains duplicated body paragraphs/,
});

runCase('fail-missing-meta', {
  item: baseItem({ seoTitle: '' }),
  expectedStatus: 1,
  expectedMarker: /missing SEO title/,
});

runCase('fail-internal-links', {
  item: baseItem({ links: ['/komentari/'] }),
  expectedStatus: 1,
  expectedMarker: /unique internal links/,
});

runCase('worker-type-exception', {
  item: baseItem({
    type: 'worker',
    slug: 'digital-workforce-status',
    section: 'Digital Workforce',
    paragraphs: ['Kratki operativni status.'],
    links: [],
  }),
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

runCase('explicit-workforce-exception', {
  item: baseItem({
    slug: 'digital-workforce-tehnicki-bilten',
    section: 'Digital Workforce',
    editorialPolicyException: 'digital-workforce-worker',
    paragraphs: ['Kratki tehnički bilten.'],
    links: [],
  }),
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

runCase('generic-operational-is-not-exempt', {
  item: baseItem({
    slug: 'operativna-otpornost-uprave',
    section: 'Operativna otpornost',
    paragraphs: ['Kratki autorski tekst.'],
    links: [],
  }),
  expectedStatus: 1,
  expectedMarker: /has 0 unique internal links/,
});

runCase('publication-hold', {
  item: baseItem({ paragraphs: ['Kratki nacrt koji se ne smije objaviti.'], links: [] }),
  holds: [{}],
  expectedStatus: 0,
  expectedMarker: /"activePublicationHolds": \[\s*"TEST-PUBLICATION-HOLD"/,
});

runCase('unknown-publication-hold', {
  item: baseItem(),
  holds: [{ packageId: 'TEST-UNKNOWN-PACKAGE' }],
  expectedStatus: 1,
  expectedMarker: /publication hold references unknown package: TEST-UNKNOWN-PACKAGE/,
});

runCase('grandfathered', {
  item: baseItem({ paragraphs: ['Kratki povijesni tekst.'], links: [] }),
  packageOverrides: { publishedAt: '2026-08-05T08:00:00.000Z' },
  expectedStatus: 0,
  expectedMarker: /EDITORIAL_CONTENT_POLICY_OK/,
});

console.log('EDITORIAL_CONTENT_POLICY_TESTS_OK');
