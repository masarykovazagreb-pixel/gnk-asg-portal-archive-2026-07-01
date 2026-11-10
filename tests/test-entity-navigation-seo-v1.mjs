import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const rels = [
  '<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/radio/">',
  '<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/radio/">',
  '<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/radio/">',
];

test('radio variants link reciprocally and use the actual PNG social-image type', () => {
  const png = readFileSync('apps/portal/assets/gnk-asg-social-card.png');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  for (const path of ['apps/portal/radio/index.html', 'apps/portal/en/radio/index.html']) {
    const html = read(path);
    for (const rel of rels) assert.ok(html.includes(rel), `${path}: ${rel}`);
    assert.match(html, /<meta property="og:image:type" content="image\/png">/);
  }
  assert.doesNotMatch(read('apps/portal/radio/index.html'), /8 kanala · 9 deskova/);
});

test('brand hashtag links lead to the corresponding entity in both languages', () => {
  for (const [path, aktual, corporate, person] of [
    ['apps/portal/index.html', '/gnk-aktual/', '/', '/nermin-sefic/'],
    ['apps/portal/en/index.html', '/en/gnk-aktual/', '/en/', '/en/nermin-sefic/'],
  ]) {
    const row = read(path).match(/<ul class="amz-tags"[^>]*>[\s\S]*?<\/ul>/)?.[0];
    assert.ok(row);
    assert.ok(row.includes(`href="${aktual}">#AKTUALMEDIA`));
    assert.ok(row.includes(`href="${corporate}">#GNKASG`));
    assert.ok(row.includes(`href="${person}">#NerminSefić`));
    assert.ok(row.includes(`href="${person}">#NerminSefic`));
  }
});

test('key profile and home descriptions agree across search and social metadata', () => {
  for (const path of ['apps/portal/index.html', 'apps/portal/en/index.html', 'apps/portal/nermin-sefic/index.html', 'apps/portal/en/nermin-sefic/index.html']) {
    const html = read(path);
    const descriptions = ['name="description"', 'property="og:description"', 'name="twitter:description"'].map(k => html.match(new RegExp(`<meta ${k} content="([^"]+)"`))?.[1]);
    assert.ok(descriptions.every(Boolean), path);
    assert.equal(new Set(descriptions).size, 1, path);
    assert.match(descriptions[0], /Nermin/i);
    assert.match(descriptions[0], /GNK ASG/i);
    assert.ok(descriptions[0].length <= 160, path);
    assert.doesNotMatch(descriptions[0], /…$/);
  }
});

test('world directory has a useful social preview and links to the external project', () => {
  const html = read('apps/portal/gnk-aktual/media/index.html');
  assert.match(html, /<meta name="twitter:title" content="[^"]+">/);
  assert.match(html, /<meta name="twitter:description" content="[^"]+">/);
  assert.match(html, /href="https:\/\/j1hex9qg03f0-d\.space-z\.ai\//);
  assert.match(html, /konfiguriran/i);
});

test('person profiles provide contextual media and radio links without stale edition counts', () => {
  const hr = read('apps/portal/nermin-sefic/index.html');
  const en = read('apps/portal/en/nermin-sefic/index.html');
  assert.match(hr, /href="\.\.\/gnk-aktual\/">AKTUAL MEDIA/);
  assert.match(hr, /href="\.\.\/radio\/">AKTUAL MEDIA RADIO/);
  assert.doesNotMatch(hr, /AKTUAL MEDIA — osam gradova/);
  assert.match(en, /href="\/en\/gnk-aktual\/">AKTUAL MEDIA/);
  assert.match(en, /href="\/en\/radio\/">AKTUAL MEDIA RADIO/);
});
