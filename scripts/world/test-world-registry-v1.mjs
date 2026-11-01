import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateWorldRegistry } from './check-world-registry-v1.mjs';

const registry = JSON.parse(readFileSync(new URL('../../config/world-countries-v1.json', import.meta.url)));
const channels = JSON.parse(readFileSync(new URL('../../apps/region/channels.json', import.meta.url))).channels;
const check = (edit, expected) => {
  const r = structuredClone(registry), c = structuredClone(channels);
  edit(r.countries, c);
  assert.ok(validateWorldRegistry(r, c).some(e => e.includes(expected)), expected);
};
test('stvarni registar zadovoljava podatkovni ugovor', () => assert.deepEqual(validateWorldRegistry(registry, channels), []));
test('sprječava duplikate oznaka država i kanala', () => {
  check(rows => { rows[1].cca2 = rows[0].cca2; }, 'duplikat cca2');
  check(rows => { rows[1].cca3 = rows[0].cca3; }, 'duplikat cca3');
  check((rows, cs) => { cs.push(structuredClone(cs[0])); }, 'duplikat kanala');
  check(rows => { const a = rows.filter(r => r.channelId); a[1].channelId = a[0].channelId; }, 'duplikat mapiranje kanala');
});
test('nepoznata stanja i nepostojeća mapiranja ne prolaze', () => {
  check(rows => { rows[0].status = 'publishing'; }, 'nepoznat status');
  check(rows => { rows.find(r => r.status === 'live').channelId = 'nepoznato'; }, 'nepoznat kanal');
  check(rows => { rows[0].channelId = 'zagreb'; }, 'planirana s postojećim kanalom');
  check(rows => { rows[0].id = '../x'; }, 'neispravan id');
});
test('država i adresa mapiranog kanala moraju odgovarati', () => {
  check(rows => { rows.find(r => r.channelId).cca2 = 'ZZ'; }, 'država kanala ne odgovara');
  check(rows => { rows.find(r => r.channelId).liveUrl = 'https://example.com/'; }, 'adresa kanala ne odgovara');
  check((rows, cs) => { cs.push({id:'novi'}); }, 'nije mapiran u registru');
});
test('neispravni ulazi ne prolaze', () => {
  assert.ok(validateWorldRegistry({}, channels).length);
  assert.ok(validateWorldRegistry(registry, null).length);
});
