import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const [wrapper, api, publicPage, editorPage, suite, workforceMenu, publicNavigation] = await Promise.all([
  read('workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js'),
  read('workers/gnk-asg-direct-operator/src/digital-workforce-api-v1.js'),
  read('apps/portal/digital-workforce/index.html'),
  read('apps/portal/editor-desk/index.html'),
  read('apps/portal/assets/digital-workforce-suite-v1.js'),
  read('apps/portal/assets/public-digital-workforce-menu-v1.js'),
  read('apps/portal/assets/public-unified-menu-v6.js'),
]);

assert.match(wrapper, /index-unified-auth-v23\.js/, 'Digital Workforce must preserve the canonical authenticated V38 runtime');
assert.match(wrapper, /handleDigitalWorkforce/, 'Canonical wrapper must delegate to the Digital Workforce API module');
assert.match(wrapper, /public-digital-workforce-menu-v1\.js\?v=20261012-language-routes-v1/);
assert.match(wrapper, /digital-workforce-suite-v1\.js\?v=20261012-runtime-health-status-v1/);
assert.ok(wrapper.includes("html=html.replace(/<script\\b[^>]*public-digital-workforce-menu-v1\\.js"), 'Active wrapper must refresh the cached workforce menu script');
assert.ok(wrapper.includes("html=html.replace(/<script\\b[^>]*digital-workforce-suite-v1\\.js"), 'Active wrapper must refresh the runtime-status client script');
assert.match(wrapper, /scheduled\(event,env,ctx\).*app\.scheduled/s, 'Existing scheduled handler must be delegated, not replaced');
assert.match(wrapper, /email\(message,env,ctx\).*app\.email/s, 'Existing email handler must be delegated, not replaced');

assert.match(api, /\/api\/public\/digital-workforce\/health/, 'Public readiness endpoint is required');
assert.match(api, /\/api\/public\/editor-desk/, 'Public Editor Desk endpoint is required');
assert.match(api, /\/api\/admin\/editor-desk/, 'Protected Editor Desk endpoint is required');
assert.match(api, /\/api\/operator-auth-check/, 'Admin writes must use the existing operator session boundary');
assert.match(api, /GNK_ASG_D1/, 'Digital Workforce must reuse the existing D1 binding');
assert.doesNotMatch(api, /ADMIN_TOKEN|token\s*===\s*['"]1203['"]/, 'Fallback admin-token authentication is prohibited');
assert.doesNotMatch(api, /ANTHROPIC_API_KEY|api\.anthropic\.com/, 'External AI runtime activation is outside the approved integration');

assert.match(publicPage, /digital-workforce-suite-v1\.js/, 'Public page must use the canonical data renderer');
assert.match(publicPage, /id="dwRuntimeStatus"/, 'Public page must expose truthful runtime status');
assert.match(suite, /get\('state'\)/, 'Public renderer must use the canonical state endpoint');
assert.match(suite, /updateRuntimeStatus\(d\.runtimeHealth\)/, 'Public renderer must display Worker-provided runtime evidence');
assert.match(suite, /safePortalUrl\(x\.seo\?\.canonical\)/, 'Dynamic newsroom links must reject unsafe URL schemes/origins');
assert.match(suite, /safePortalUrl\(lead\.personUrl\)/, 'Dynamic profile links must reject unsafe URL schemes/origins');
assert.match(workforceMenu, /\/editor-desk\//, 'Workforce navigation must link to the public Editor Desk');
assert.match(workforceMenu, /\/workers\//, 'Workforce navigation must link to the canonical worker catalogue');
assert.match(publicNavigation, /\['Digitalna radna snaga','Digital workforce','\/digital-workforce\/','\/en\/digital-workforce\/'\]/, 'English global navigation must use the English workforce route');
assert.match(publicNavigation, /\['Workeri','Workers','\/workers\/','\/en\/workers\/'\]/, 'English global navigation must use the English worker directory');
assert.match(editorPage, /editor-desk-public-v1\.js/, 'Editor Desk page must use the approved public renderer');

console.log('Digital Workforce single-runtime contract passed.');
