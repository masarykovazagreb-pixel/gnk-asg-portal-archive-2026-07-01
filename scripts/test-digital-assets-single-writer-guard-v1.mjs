import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/refresh-index-live-data.yml','utf8');
const guard=JSON.parse(fs.readFileSync('ops/digital-assets-single-writer-guard-v1.json','utf8'));

assert.match(workflow,/cron:\s*'5 7,15 \* \* \*'/);
assert.match(workflow,/python scripts\/test_index_live_data_cadence_v1\.py/);
assert.match(workflow,/python scripts\/validate_index_live_data\.py/);
assert.equal(guard.canonicalWriter.type,'github-actions');
assert.equal(guard.canonicalWriter.workflow,'.github/workflows/refresh-index-live-data.yml');
assert.equal(guard.canonicalWriter.targetCadence,'2x daily');
assert.ok(guard.legacyPaths.every(item=>item.status==='legacy-hold'));
assert.ok(guard.rules.some(rule=>rule.includes('No legacy Windows task')));
assert.ok(guard.rules.some(rule=>rule.includes('No legacy refresh script may perform a direct production wrangler deploy')));

console.log(JSON.stringify({ok:true,canonicalWriter:guard.canonicalWriter.workflow,cadence:guard.canonicalWriter.targetCadence,legacyPaths:guard.legacyPaths.map(item=>item.path)},null,2));
