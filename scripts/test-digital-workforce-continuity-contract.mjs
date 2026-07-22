import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const continuity=fs.readFileSync('apps/portal/assets/digital-workforce-continuity-v1.js','utf8');

assert.match(html,/objavljena baza 1\.536/i);
assert.match(html,/katalog 1\.573/i);
assert.match(html,/digital-workforce-continuity-v1\.js/);
assert.match(html,/digital-workforce-continuity-v1\.css/);
assert.match(html,/>SIMULACIJA</);
assert.match(continuity,/publishedBaselineWorkers:1536/);
assert.match(continuity,/currentCatalogueWorkers:1573/);
assert.match(continuity,/catalogueExpansion:37/);
assert.match(continuity,/publishedProjectAreas:9/);
assert.match(continuity,/mode:'append-only'/);
assert.match(continuity,/continueBulletinIssueNumbers:true/);
assert.match(continuity,/continueNewsroomChronology:true/);
assert.match(continuity,/neverRewritePublishedHistory:true/);
assert.match(continuity,/deduplicateByStableId:true/);

console.log(JSON.stringify({ok:true,contract:'published-digital-workforce-continuity',baseline:1536,current:1573,projectAreas:9},null,2));
