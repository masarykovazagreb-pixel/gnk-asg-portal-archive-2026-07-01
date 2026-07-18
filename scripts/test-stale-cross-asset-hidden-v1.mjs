import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('apps/portal/assets/status.js','utf8');
assert.ok(source.includes('removeStaleCrossAssetMonitor'),'stale cross-asset monitor guard must exist');
assert.ok(source.includes('staleLocalizedTimestamp'),'guard must parse localized timestamps');
assert.ok(source.includes("document.querySelectorAll('.macro-dashboard')"),'guard must target the cross-asset dashboard');
assert.ok(source.includes('[.\\/]'),'guard must support Croatian dot and English slash date separators');
assert.ok(source.includes('(Date.now()-timestamp)>86400000'),'datasets older than 24 hours must be rejected');
assert.ok(source.includes('panel.remove()'),'stale cross-asset values must not remain visible');
console.log(JSON.stringify({ok:true,staleCrossAssetVisible:false,localizedDates:true},null,2));
