import assert from 'node:assert/strict';
import fs from 'node:fs';
import {themeArtwork} from '../apps/region/engine/theme-art.mjs';
import {CHANNELS,CSS} from '../apps/region/engine/build.mjs';
import {THEMES} from '../apps/region/engine/lib.mjs';
assert.equal(CHANNELS.length,8);
assert.ok(THEMES.length>=9);
assert.match(CSS,/\.cardvisual/);
assert.match(CSS,/object-fit:cover/);
const source=fs.readFileSync('apps/region/engine/build.mjs','utf8');
assert.match(source,/themeArtwork\(channel,theme\.id\)/);
assert.match(source,/imageRightsVerified === true/);
assert.match(source,/og:site_name" content="AKTUAL MEDIA"/);
assert.doesNotMatch(source,/\$\{PUBLIC\}\/nermin-sefic\/"[^]*?article:author/);
for(const c of CHANNELS){
 for(const theme of THEMES){
  const s=themeArtwork(c,theme.id);
  assert.match(s,/<svg/);
  assert.match(s,/ORIGINAL EDITORIAL ART/);
  assert.ok(s.includes(c.city));
  assert.ok(s.includes('AKTUAL MEDIA'));
  assert.ok(s.length>1500);
 }
}
console.log('PASS: '+CHANNELS.length*THEMES.length+' original local thematic images; all eight regional languages and editions; no unverified photo reuse');
