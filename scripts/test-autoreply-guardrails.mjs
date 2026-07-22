import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const mime=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js','utf8');
const dedupe=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-autoreply-dedupe-v1.js','utf8');
const combined=`${source}\n${mime}\n${dedupe}`;

assert.match(source,/import \{EmailMessage\} from 'cloudflare:email'/);
assert.match(combined,/duplicate_message_id/);
assert.match(combined,/mail:autoreply:message-id:/);
assert.match(combined,/MESSAGE_ID_TTL=60\*60\*24\*30/);
assert.match(source,/auto_response_suppressed/);
assert.match(source,/null_return_path/);
assert.match(source,/bulk_or_list/);
assert.match(source,/invalid_autoreply_target/);
assert.match(source,/isGnk\(safeTo\)/);
assert.match(combined,/Precedence: bulk/);
assert.match(combined,/X-Auto-Response-Suppress: All/);
assert.match(combined,/safeHeader\(inReplyTo\)/);
assert.doesNotMatch(source,/typeof EmailMessage==='undefined'/);

console.log(JSON.stringify({ok:true,mailSent:false,guards:['internal-domain','bounce','list','auto-submitted','suppress','null-return-path','message-id-dedupe'],mimeBuilder:'email-autoreply-mime-v1'},null,2));