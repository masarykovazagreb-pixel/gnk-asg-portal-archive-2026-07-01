import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {addEmailStatusButtons,VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-buttons-v1.js';

const request=new Request('https://www.gnk-asg.hr/mail-studio/');
const source='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src \'self\'"></head><body><main>Mail Studio</main></body></html>';
const response=new Response(source,{headers:{'content-type':'text/html; charset=utf-8'}});
const patched=await addEmailStatusButtons(request,response);
const html=await patched.text();
assert.match(VERSION,/CSP_SAFE/);
assert.match(html,/id="gnk-email-tools-hub-v4"/);
assert.match(html,/src="\/assets\/email-tools-hub-v4\.js\?v=20260703-1"/);
assert.doesNotMatch(html,/prompt\(/);
assert.equal(patched.headers.get('x-gnk-asg-email-status-buttons'),VERSION);

const asset=await readFile(new URL('../apps/portal/assets/email-tools-hub-v4.js',import.meta.url),'utf8');
assert.match(asset,/date=today/);
assert.match(asset,/!launcher\.contains\(event\.target\)/);
assert.doesNotMatch(asset,/\bprompt\s*\(/);
assert.doesNotMatch(asset,/\balert\s*\(/);

const publicResponse=new Response('<html><body>Public status</body></html>',{headers:{'content-type':'text/html'}});
const untouched=await addEmailStatusButtons(new Request('https://www.gnk-asg.hr/automation-status/'),publicResponse);
assert.doesNotMatch(await untouched.text(),/gnk-email-tools-hub-v4/);

console.log(JSON.stringify({ok:true,version:VERSION,cspSafeExternalScript:true,todayLink:true,launcherClickSafe:true,publicAutomationStatusUntouched:true},null,2));
