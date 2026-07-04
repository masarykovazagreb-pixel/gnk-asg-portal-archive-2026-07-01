import assert from 'node:assert/strict';
import app from '../src/index-unified-auth-v14.js';
import {__test as facadeTest} from '../src/mail-studio-extension-v4.js';

const origin='https://gnk-asg.hr';
const env={OPERATOR_TOKEN:'mail-sync-review-token'};
const ctx={waitUntil(){}};

for(const route of ['/api/mail-center/sync/health','/api/mail-center/sync/messages?folder=inbox','/api/mail-center/sync/message?id=x']){
 const response=await app.fetch(new Request(origin+route),env,ctx);
 assert.equal(response.status,401,`${route} must require the existing admin token/session`);
 const payload=await response.json();
 assert.equal(payload.error,'unauthorized');
}

const mapped=facadeTest.mappedRequest(new Request(origin+'/api/mail-center/sync/messages?folder=sent'));
assert.equal(new URL(mapped.url).pathname,'/api/mail-sync/messages');
assert.equal(new URL(mapped.url).searchParams.get('folder'),'sent');
assert.equal(mapped.method,'GET');

console.log('MAIL_SYNC_CENTER_ROUTE_CONTRACT_OK');
