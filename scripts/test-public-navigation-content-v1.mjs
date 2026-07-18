import fs from 'node:fs';
import assert from 'node:assert/strict';

const navigation=fs.readFileSync('apps/portal/assets/portal-navigation.js','utf8');
const visual=fs.readFileSync('apps/portal/visual-index/index.html','utf8');
const publications=fs.readFileSync('apps/portal/objave/index.html','utf8');
const comments=fs.readFileSync('apps/portal/komentari/index.html','utf8');

for(const marker of [
  "['Digitalna imovina', '/#digital-assets']",
  "['Objave', '/objave/']",
  "['Komentari', '/komentari/']",
  "['Vizualni indeks', '/visual-index/']",
  "['Digital Assets', '/en/#digital-assets']",
  "['Publications', '/objave/']",
  "['Comments', '/komentari/']",
  "['Visual Index', '/visual-index/']"
]) assert.ok(navigation.includes(marker),`navigation missing ${marker}`);

assert.ok(visual.includes('https://gnk-asg.hr/visual-index/'),'visual index canonical missing');
assert.ok(visual.includes('id="visualGrid"'),'visual grid missing');
assert.ok((publications.match(/href="\/objave\//g)||[]).length>=10,'publications index must expose individual links');
assert.ok((comments.match(/href="\/komentari\//g)||[]).length>=5,'comments index must expose individual links');

console.log(JSON.stringify({ok:true,menu:['digital-assets','objave','komentari','visual-index'],individualPublicationLinks:true,individualCommentLinks:true,deployPerformed:false},null,2));
