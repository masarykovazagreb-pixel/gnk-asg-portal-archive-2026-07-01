import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLICK_PREFIX,VERSION,isEmailClickPath,handleEmailClickRequest} from '../workers/gnk-asg-direct-operator/src/email-click-tracking-v1.js';

assert.match(VERSION,/EMAIL_CLICK_TRACKING_V1_20260715/);
assert.equal(CLICK_PREFIX,'/api/email-status/click/');
assert.equal(isEmailClickPath(new Request('https://gnk-asg.hr/api/email-status/click/a/b')),true);
assert.equal(isEmailClickPath(new Request('https://gnk-asg.hr/api/email-status/open/a.gif')),false);
assert.equal(await handleEmailClickRequest(new Request('https://gnk-asg.hr/api/email-status/open/a.gif'),{}),null);

const clickSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-click-tracking-v1.js','utf8');
const statusSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js','utf8');
for(const marker of [
 'email_status_click_links',
 "url.protocol!=='https:'",
 "event_type,event_at,status",
 "'CLICKED'",
 'first_clicked_at',
 'last_clicked_at',
 'click_count',
 'last_click_url',
 'last_click_ip',
 'last_click_user_agent',
 'last_click_device',
 "'referrer-policy':'no-referrer'",
 "status:302",
 'proxy/security scanner',
 'token_hash'
])assert.ok(clickSource.includes(marker),`missing click contract marker: ${marker}`);

for(const blocked of ['javascript:','data:','file:','mailto:','tel:']){
 assert.equal(clickSource.includes(`protocol==='${blocked}'`),false,`${blocked} must never be explicitly allowed`);
}
assert.ok(statusSource.includes('base.withEmailStatusTracking(withEmailClickTracking(env))'),'click layer must sit below existing status wrapper');
assert.ok(statusSource.includes('clickEvents:true'),'records capability must disclose click events');
assert.ok(statusSource.includes('clickDestination:true'),'records capability must disclose destination audit');
assert.ok(statusSource.includes('handleEmailClickRequest(request,env)'),'click route must be wired');

console.log(JSON.stringify({ok:true,version:VERSION,httpsOnly:true,redirect:302,event:'CLICKED',mailSent:false},null,2));
