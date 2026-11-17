import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isWithdrawnItem } from '../apps/region/engine/withdrawals.mjs';

const manifest = JSON.parse(readFileSync('apps/region/data/withdrawn-content-v1.json', 'utf8'));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const blocked = new Set(manifest.slugHashes);
const ROOT = 'apps/portal/kanal/ljubljana';
const entry = JSON.parse(readFileSync('apps/region/data/ljubljana.json', 'utf8'));

test('withdrawal manifest is reasoned, hashed, and has no personal titles or URLs', () => {
  assert.equal(manifest.schema, 'AKTUAL_REGION_WITHDRAWN_V1');
  assert.equal(manifest.sourceUrlHashes.length, 2);
  assert.equal(manifest.slugHashes.length, 2);
  assert.equal(manifest.titleHashes.length, 2);
  for (const hash of [...manifest.slugHashes,...manifest.sourceUrlHashes,...manifest.titleHashes])
    assert.match(hash, /^[a-f0-9]{64}$/);
});

test('withdrawn RSS records are absent from the source of truth', () => {
  assert.ok(entry.items.length > 0);
  for (const item of entry.items) assert.equal(isWithdrawnItem(item), false, item.slug);
});

test('withdrawn article HTML files do not exist', () => {
  for (const name of readdirSync(ROOT + '/clanak')) {
    if (!blocked.has(sha(name.toLowerCase()))) continue;
    assert.equal(existsSync(ROOT + '/clanak/' + name + '/index.html'), false, name);
  }
});

test('withdrawn articles are excluded from category, source, search, related and sitemap links', () => {
  const files = [
    ROOT + '/sitemap.xml', ROOT + '/index.html', ROOT + '/feed.json', ROOT + '/feed.xml',
    ROOT + '/tema/drustvo/index.html', ROOT + '/izvor/24ur/index.html',
    ROOT + '/izvor/slovenskenovice/index.html', ROOT + '/izvori/index.html',
    ROOT + '/mravinjak/index.html', 'apps/portal/data/public-search-v1.json'
  ];
  for (const file of files) {
    const data = readFileSync(file, 'utf8');
    for (const match of data.matchAll(/clanak\/([a-z0-9-]+)\//g)) {
      const slug = match[1];
      assert.equal(blocked.has(sha(slug.toLowerCase())), false, file);
    }
  }
});

test('the publisher automation and both downstream builders retain the fail-closed withdrawal filter', () => {
  for (const file of ['apps/region/engine/daily.mjs','apps/region/engine/build.mjs','apps/region/engine/hub.mjs']) {
    const source = readFileSync(file,'utf8');
    assert.match(source,/isWithdrawnItem/);
  }
});
