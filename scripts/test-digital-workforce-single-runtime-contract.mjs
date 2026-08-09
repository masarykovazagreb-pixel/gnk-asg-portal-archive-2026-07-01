import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const [wrapper, api, publicPage, editorPage] = await Promise.all([
  read('workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js'),
  read('workers/gnk-asg-direct-operator/src/digital-workforce-api-v1.js'),
  read('apps/portal/digital-workforce/index.html'),
  read('apps/portal/editor-desk/index.html'),
]);

assert.match(wrapper, /index-unified-auth-v23\.js/, 'Digital Workforce must preserve the canonical authenticated V38 runtime');
assert.match(wrapper, /handleDigitalWorkforce/, 'Canonical wrapper must delegate to the Digital Workforce API module');
assert.match(wrapper, /scheduled\(event,env,ctx\).*app\.scheduled/s, 'Existing scheduled handler must be delegated, not replaced');
assert.match(wrapper, /email\(message,env,ctx\).*app\.email/s, 'Existing email handler must be delegated, not replaced');

assert.match(api, /\/api\/public\/digital-workforce\/health/, 'Public readiness endpoint is required');
assert.match(api, /\/api\/public\/editor-desk/, 'Public Editor Desk endpoint is required');
assert.match(api, /\/api\/admin\/editor-desk/, 'Protected Editor Desk endpoint is required');
assert.match(api, /\/api\/operator-auth-check/, 'Admin writes must use the existing operator session boundary');
assert.match(api, /GNK_ASG_D1/, 'Digital Workforce must reuse the existing D1 binding');
assert.doesNotMatch(api, /ADMIN_TOKEN|token\s*===\s*['"]1203['"]/, 'Fallback admin-token authentication is prohibited');
assert.doesNotMatch(api, /ANTHROPIC_API_KEY|api\.anthropic\.com/, 'External AI runtime activation is outside the approved integration');

assert.match(publicPage, /\/api\/public\/digital-workforce\/health/, 'Public page must use the canonical readiness endpoint');
assert.match(publicPage, /\/editor-desk\//, 'Public page must link to Editor Desk');
assert.match(publicPage, /\/workers\//, 'Public page must reuse the canonical worker catalogue');
assert.match(editorPage, /editor-desk-public-v1\.js/, 'Editor Desk page must use the approved public renderer');

console.log('Digital Workforce single-runtime contract passed.');
