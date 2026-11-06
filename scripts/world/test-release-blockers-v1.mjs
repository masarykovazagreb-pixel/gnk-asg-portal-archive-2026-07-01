import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countryBlockers } from './release-blockers-v1.mjs';

test('stvarni plan razdvaja postojeća izdanja od država bez javne objave', () => {
  const r = JSON.parse(readFileSync(new URL('../../config/world-countries-v1.json', import.meta.url)));
  const s = JSON.parse(readFileSync(new URL('../../config/world-sources-v1.json', import.meta.url)));
  const rows = countryBlockers(r,s);
  assert.equal(rows.length, r.countries.filter(c=>c.status==='planned').length);
  assert.ok(rows.every(x => x.blockers.length >= 4));
  assert.ok(rows.find(x=>x.code==='AL').blockers.includes('nema evidentiranih izvora'));
  assert.ok(rows.find(x=>x.code==='AT').blockers.includes('nema odobrenog izvora'));
  assert.equal(rows.some(x=>x.code==='US'),false);
});
test('odobreni izvor nije dokaz ostalih uvjeta niti pristupa hostingu', () => {
  const r={countries:[{status:'planned',id:'test',country:'Test',cca2:'TT',url:'https://example.test/',wave:'W1'}]};
  const row=countryBlockers(r,{countries:{TT:{sources:[{status:'approved'}]}}})[0];
  assert.equal(row.approvedSources,1);
  assert.equal(row.blockers.length,4);
  assert.match(row.blockers.join(' '), /produkcijski projekt/);
  assert.throws(()=>countryBlockers({},{}));
});
