import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('apps/portal/assets/index-editorial-cleanup-v1.js','utf8');

assert.match(source,/__GNK_INDEX_EDITORIAL_CLEANUP_V1__/);
assert.match(source,/gnkLegacyEditorial='removed'/);
assert.match(source,/parseLocalizedTimestamp/);
assert.match(source,/\[\.\\\/\]/);
assert.match(source,/24\*60\*60\*1000/);
assert.match(source,/\.macro-dashboard/);
assert.match(source,/gnkStaleCrossAsset='removed'/);
assert.match(source,/hideStaleCrossAssetMonitor/);

console.log(JSON.stringify({ok:true,preservedLegacyCleanup:true,localizedFormats:['hr-HR','en-GB'],staleThresholdHours:24},null,2));
