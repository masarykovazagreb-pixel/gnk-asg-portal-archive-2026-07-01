import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {SITES} from '../apps/sites/lib/registry.mjs';
import {WORLD_PORTALS} from '../apps/world/lib/registry.mjs';

test('inventar prati konfigurirane adrese i čuva upozorenje o pravima',()=>{
  execFileSync(process.execPath,['scripts/factory/network-inventory-v1.mjs','--check']);
  const text=readFileSync('docs/factory/INVENTAR-MREZE-V1.md','utf8');
  const {channels}=JSON.parse(readFileSync('apps/region/channels.json','utf8'));
  for(const item of [...channels,...SITES,...WORLD_PORTALS])assert.ok(text.includes(item.base),`Nedostaje ${item.base}`);
  assert.match(text,/ne dokaz dostupnosti, vlasništva, licence ili odobrenja/);
  assert.match(text,/status: \*\*(?:pending|blocked)\*\*/);
});
