import assert from 'node:assert/strict';
import app from '../src/index-unified-auth-v14.js';
import {recordMailSyncOutbound} from '../src/mail-sync-center-v1.js';
import {__test as facadeTest} from '../src/mail-studio-extension-v4.js';

const origin='https://gnk-asg.hr';
const env={};
const ctx={waitUntil(){}};

for(const route of ['/api/mail-center/sync/health','/api/mail-center/sync/messages?folder=inbox','/api/mail-center/sync/message?id=x']){
 const response=await app.fetch(new Request(origin+route),env,ctx);
 assert.equal(response.status,401,`${route} must require the existing admin session`);
 const payload=await response.json();
 assert.equal(payload.error,'unauthorized');
}

const mapped=facadeTest.mappedRequest(new Request(origin+'/api/mail-center/sync/messages?folder=sent'));
assert.equal(new URL(mapped.url).pathname,'/api/mail-sync/messages');
assert.equal(new URL(mapped.url).searchParams.get('folder'),'sent');
assert.equal(mapped.method,'GET');

const executed=[];
const d1={
 prepare(sql){
  const state={sql,binds:[]};
  return{
   bind(...binds){state.binds=binds;return this;},
   async run(){executed.push({...state});return{meta:{changes:1}};},
   async all(){executed.push({...state});return{results:[]};},
   async first(){executed.push({...state});return null;}
  };
 },
 async batch(){return[];}
};
const outbound=await recordMailSyncOutbound({GNK_ASG_D1:d1},{
 sourceId:'outbound-test-1',
 providerMessageId:'<provider-1@example.test>',
 from:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},
 to:['Recipient <recipient@example.test>'],
 subject:'Re: Mail Sync test',
 text:'Body',
 headers:new Headers({
  'In-Reply-To':'<root@example.test>',
  'References':'<root@example.test> <parent@example.test>'
 })
});
assert.equal(outbound.inReplyTo,'root@example.test');
assert.deepEqual(outbound.references,['root@example.test','parent@example.test']);
assert.match(outbound.threadId,/^mid:/);
const insert=executed.find(item=>item.sql.startsWith('INSERT INTO mail_sync_messages'));
assert.ok(insert,'outbound INSERT must execute');
assert.equal((insert.sql.match(/\?/g)||[]).length,insert.binds.length,'mail_sync_messages SQL bind count must match placeholders');
assert.equal(insert.binds[7],'root@example.test');
assert.equal(insert.binds[8],JSON.stringify(['root@example.test','parent@example.test']));
const stateUpdate=executed.find(item=>item.sql.startsWith('UPDATE mail_sync_state SET last_inbound_at'));
assert.ok(stateUpdate,'mail_sync_state update must execute');
assert.equal((stateUpdate.sql.match(/\?/g)||[]).length,stateUpdate.binds.length,'mail_sync_state SQL bind count must match placeholders');

console.log('MAIL_SYNC_CENTER_ROUTE_CONTRACT_OK');
