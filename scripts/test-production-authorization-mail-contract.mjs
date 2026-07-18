import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const workflow=readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const mail=readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const mime=readFileSync('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js','utf8');
const transport=readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');

assert.match(workflow,/jobs:\s*\n\s*authorize-production:/);
assert.match(workflow,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/);
assert.match(workflow,/\[\[ "\$APPROVED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
assert.match(workflow,/require_eq "\$GITHUB_SHA" "\$APPROVED_SHA"/);
assert.match(workflow,/require_eq "\$\(git rev-parse origin\/main\)" "\$APPROVED_SHA"/);
assert.match(workflow,/node scripts\/test-production-release-v38-contract\.mjs/);
assert.match(workflow,/node scripts\/test-production-authorization-mail-contract\.mjs/);
const authorizeSection=workflow.slice(workflow.indexOf('  authorize-production:'),workflow.indexOf('  deploy-production:'));
assert.doesNotMatch(authorizeSection,/grep\s+-Fq/i,'authorize-production must use canonical contract scripts, not duplicated inline grep assertions');
assert.match(workflow,/Reconfirm tracked release integrity before any production secret/);
assert.ok(workflow.indexOf('Reconfirm tracked release integrity before any production secret') < workflow.indexOf('Resolve token hash after integrity verification'));
assert.ok(workflow.indexOf('Resolve token hash after integrity verification') < workflow.indexOf('Deploy contact session bridge'));

assert.match(mail,/import \{EMAIL_LOGO_CID,VERSION as BRAND_MIME_VERSION\} from '\.\/email-brand-mime-v1\.js'/);
assert.match(mail,/signatureData\(profile,`cid:\$\{EMAIL_LOGO_CID\}`\)/);
assert.match(mail,/buildAutoreplyRawEmail\(/);
assert.match(mail,/format:'mail-studio-compatible-multipart-related'/);
assert.match(mime,/multipart\/related/i);
assert.match(mime,/Content-ID:\s*<\$\{EMAIL_LOGO_CID\}>/);

assert.match(transport,/function sanitizeType\(value\)/);
assert.match(transport,/application\/octet-stream/);
for(const contract of ['scripts/test-mail-mime-type-contract.mjs','scripts/test-production-release-v38-contract.mjs']){
 const check=spawnSync(process.execPath,[contract],{encoding:'utf8'});
 assert.equal(check.status,0,`Canonical contract failed (${contract}):\n${check.stdout}\n${check.stderr}`);
}

console.log(JSON.stringify({
 ok:true,
 authorization:'exact-main-sha-before-secrets',
 releaseAssertions:'canonical-script-no-inline-grep',
 mailLogo:'real-cid-multipart-contract',
 outboundMime:'canonical-contract-executed'
},null,2));
