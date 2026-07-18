import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const frontend=readFileSync('apps/portal/assets/contact-form-v2.js','utf8');
const route=readFileSync('workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js','utf8');
const cases=readFileSync('workers/gnk-asg-direct-operator/src/contact-case-center-v1.js','utf8');

assert.match(frontend,/crypto\.randomUUID\(\)/);
assert.match(frontend,/x-idempotency-key/);
assert.match(frontend,/data\.idempotencyKey=requestKey/);
assert.match(frontend,/delete form\.dataset\.idempotencyKey/);
assert.match(route,/idempotency_key_required/);
assert.match(route,/reused:true,mailAttempted:false/);
assert.match(route,/idempotencyKey=contactIdempotencyKey\(request,body\)/);
assert.match(cases,/CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_cases_idempotency/);
assert.match(cases,/INSERT OR IGNORE INTO contact_cases/);
assert.match(cases,/reused: true/);

console.log(JSON.stringify({ok:true,contract:'contact-idempotency-no-duplicate-case-or-mail'},null,2));
