import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('apps/portal/assets/status.js','utf8');
assert.ok(source.includes("document.querySelectorAll('.live-row').forEach"),'existing live status row must be removed');
assert.ok(source.includes('return;'),'status initializer must exit without creating badges');
assert.ok(!source.includes("row.innerHTML = '<span class=\"live-badge waiting\" id=\"newsBadge\""),'index status badges must not be created');
console.log(JSON.stringify({ok:true,indexLiveStatusBadges:false},null,2));
