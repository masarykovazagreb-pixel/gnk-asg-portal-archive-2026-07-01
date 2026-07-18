import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('apps/portal/assets/app.js','utf8');

for(const marker of [
  'up to the 100 newest',
  'archive retains up to 2,000 older items',
  '2,100-record threshold',
  'oldest 1,000 archived items',
  'do 100 najnovijih',
  'Arhiva zadržava do 2.000 starijih stavki',
  'pragu od 2.100 ukupnih zapisa',
  'najstarijih 1.000 arhivskih stavki'
]) assert.ok(source.includes(marker),`missing canonical retention copy: ${marker}`);

for(const stale of [
  '500 newest business and technology news items',
  'newest 500 public items',
  'do 500 najnovijih poslovnih i tehnoloških vijesti',
  'Najnovijih 500 javnih stavki',
  'archive retains up to 400 older items',
  'arhiva zadržava do 400 starijih stavki'
]) assert.ok(!source.includes(stale),`stale retention copy remains: ${stale}`);

console.log(JSON.stringify({ok:true,visible:100,archive:2000,totalThreshold:2100,pruneOldest:1000,deployPerformed:false},null,2));
