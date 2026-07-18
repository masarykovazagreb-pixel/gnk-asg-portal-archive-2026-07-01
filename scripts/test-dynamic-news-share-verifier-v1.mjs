import fs from 'node:fs';
import assert from 'node:assert/strict';

const verifier=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');
assert.ok(verifier.includes("share_id=$(jq -r"),'verifier must derive a current news id dynamically');
assert.ok(verifier.includes("share_target=$(jq -r"),'verifier must derive the matching source URL dynamically');
assert.ok(verifier.includes('x-gnk-news-id: ${share_id}'),'verifier must validate the dynamic news id');
assert.ok(verifier.includes('location: ${share_target}'),'verifier must validate the dynamic redirect target');
assert.ok(!verifier.includes('19fa99e0723490d640'),'stale hard-coded news id must be removed');
console.log(JSON.stringify({ok:true,dynamicShareVerification:true},null,2));
