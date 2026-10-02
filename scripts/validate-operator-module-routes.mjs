import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));

const wrangler=read('workers/gnk-asg-direct-operator/wrangler.toml');
const wrapper=read('workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js');
const auth=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js');
const gateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const postCode=read('workers/gnk-asg-direct-operator/src/media-registration-post-code-v2.js');
const reviewAdmin=read('workers/gnk-asg-direct-operator/src/media-registration-review-admin-v1.js');
const reviewDecision=read('workers/gnk-asg-direct-operator/src/media-registration-review-decision-v1.js');

assert.match(wrangler,/main = "src\/index-digital-workforce-v1\.js"/u,'Review Worker mora koristiti aktualni digital-workforce entrypoint.');
assert.ok(wrapper.includes("from './index-unified-auth-v23.js'"),'Digital-workforce wrapper mora koristiti aktualni unified-auth v23 runtime.');
assert.ok(auth.includes("'/media-application'"),'Auth sloj mora zadržati javnu media prijavu.');
assert.ok(auth.includes("'/media-registration-admin'"),'Auth sloj mora zadržati zaštićeni media review UI.');
assert.ok(auth.includes("path.startsWith('/api/media-registration-admin')"),'Auth sloj mora štititi media registration admin API.');
assert.ok(gateway.includes("const isPublicRegistration=path=>path==='/media-application'"),'Gateway mora prepoznati javnu media prijavu.');
assert.ok(gateway.includes("const isAdminRegistration=path=>path==='/media-registration-admin'"),'Gateway mora prepoznati zaštićeni media review.');
assert.ok(gateway.includes('authorizeCampaignMailer'), 'Zaštićeni media review mora koristiti postojeći auth guard.');
assert.ok(postCode.includes('patchMediaRegistrationAdminPage'), 'Media registration runtime mora injektirati review UI.');
assert.ok(postCode.includes('patchMediaRegistrationDecisionGuard'), 'Media registration runtime mora injektirati revision-safe decision guard.');
assert.ok(reviewAdmin.includes('media-applications-review-v1.js'), 'Review backend mora referencirati aktualni review JS asset.');
assert.ok(reviewAdmin.includes('media-applications-review-v1.css'), 'Review backend mora referencirati aktualni review CSS asset.');
assert.ok(reviewDecision.includes('media-applications-decision-guard-v1.js'), 'Decision backend mora referencirati decision guard asset.');

for(const file of [
  'apps/portal/media-application/index.html',
  'apps/portal/media-registration-admin/index.html',
  'apps/portal/assets/media-applications-review-v1.js',
  'apps/portal/assets/media-applications-review-v1.css',
  'apps/portal/assets/media-applications-decision-guard-v1.js'
]){
  assert.ok(exists(file),`Nedostaje aktivni media-review artefakt: ${file}`);
  assert.ok(fs.statSync(path.join(root,file)).size>0,`Prazan aktivni media-review artefakt: ${file}`);
}

console.log('OPERATOR_MEDIA_ROUTE_CONTRACT_OK currentRuntime=index-digital-workforce-v1.js');
