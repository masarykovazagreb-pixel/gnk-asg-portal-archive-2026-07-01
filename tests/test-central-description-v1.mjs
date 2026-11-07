import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('opis huba čuva puno ime i isti je u sve tri meta oznake', () => {
  const html=readFileSync(new URL('../apps/portal/gnk-aktual/index.html',import.meta.url),'utf8');
  const attrs=['name="description"','property="og:description"','name="twitter:description"'];
  const values=attrs.map(a=>html.match(new RegExp(`<meta ${a} content="([^"]*)"`))?.[1]);
  assert.ok(values.every(Boolean));
  assert.equal(new Set(values).size,1);
  assert.match(values[0],/Nermin Sefić/);
  assert.ok(values[0].length <= 178);
  const source=readFileSync(new URL('../apps/region/engine/aktual-central.mjs',import.meta.url),'utf8');
  assert.match(source,/const metaDesc = `[^`]*Nermin Sefić\.`/);
  assert.match(source,/const safeDesc = esc\(metaDesc\)/);
});
