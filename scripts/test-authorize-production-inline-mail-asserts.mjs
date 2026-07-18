import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');

assert.doesNotMatch(workflow,/grep -Fq 'loadEmailLogo'/);
assert.match(workflow,/test -f workers\/gnk-asg-direct-operator\/src\/email-brand-mime-v1\.js/);
assert.match(workflow,/test -f workers\/gnk-asg-direct-operator\/src\/email-autoreply-mime-v1\.js/);
assert.match(workflow,/node --check workers\/gnk-asg-direct-operator\/src\/email-brand-mime-v1\.js/);
assert.match(workflow,/node --check workers\/gnk-asg-direct-operator\/src\/email-autoreply-mime-v1\.js/);
assert.match(workflow,/node scripts\/test-production-authorization-mail-contract\.mjs/);
assert.match(workflow,/EMAIL_LOGO_CID,VERSION as BRAND_MIME_VERSION/);
assert.match(workflow,/signatureData\(profile,`cid:\$\{EMAIL_LOGO_CID\}`\)/);
assert.match(workflow,/buildAutoreplyRawEmail\(/);
assert.match(workflow,/multipart\/related/);
assert.match(workflow,/Content-ID: <\$\{EMAIL_LOGO_CID\}>/);

console.log(JSON.stringify({ok:true,workflow:'real-inline-cid-mail-contract'},null,2));
