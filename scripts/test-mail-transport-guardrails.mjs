import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v18.js','utf8');
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');

assert.match(source,/DEFAULT_MANDATORY_BCC=\['beckuphome@gmail\.com'\]/);
assert.doesNotMatch(source,/rht@gmx\.com/i);
assert.match(source,/ALLOWED_FROM_DOMAIN='gnk-asg\.hr'/);
assert.match(source,/MAX_RECIPIENTS=25/);
assert.match(source,/invalid_from_address/);
assert.match(source,/recipient_limit_exceeded/);
assert.match(source,/mandatoryBcc\(env\)/);
assert.match(config,/MAIL_MANDATORY_BCC = "beckuphome@gmail\.com"/);

console.log(JSON.stringify({ok:true,mailSent:false,fromDomain:'gnk-asg.hr',mandatoryBcc:['beckuphome@gmail.com'],maxRecipients:25},null,2));
