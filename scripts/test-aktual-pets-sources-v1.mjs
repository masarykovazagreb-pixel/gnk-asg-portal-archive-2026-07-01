import fs from 'node:fs';
import assert from 'node:assert/strict';

const refresh = fs.readFileSync('scripts/gnk-news-refresh.mjs', 'utf8');
const aktual = fs.readFileSync('apps/portal/gnk-aktual/index.html', 'utf8');

const expected = [
  ['The Guardian Pets', 'https://www.theguardian.com/lifeandstyle/pets/rss'],
  ['Dogster', 'https://www.dogster.com/feed'],
  ['Catster', 'https://www.catster.com/feed']
];

for (const [source, url] of expected) {
  assert.ok(refresh.includes(`source: '${source}'`), `missing source ${source}`);
  assert.ok(refresh.includes(`url: '${url}'`), `missing feed ${url}`);
}

assert.match(refresh, /group:\s*'ljubimci'/);
assert.match(aktual, /ljubimci:'Kućni ljubimci'/);
assert.match(aktual, /RUBRIKA_RED[^\n]*'ljubimci'/);

console.log(JSON.stringify({
  ok: true,
  vertical: 'ljubimci',
  sources: expected.map(([source]) => source),
  contract: 'existing Aktual Media group is populated by the primary news refresh engine'
}, null, 2));
