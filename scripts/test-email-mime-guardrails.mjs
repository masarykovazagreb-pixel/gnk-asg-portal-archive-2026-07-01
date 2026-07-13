import assert from 'node:assert/strict';
import {
  buildBrandedRawEmail,
  mediaSignatureHtml,
  VERSION
} from '../workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js';

const env={};

await assert.rejects(
  ()=>buildBrandedRawEmail({env,fromEmail:'media@gnk-asg.hr\r\nBcc: attacker@example.com',to:'user@example.com',subject:'Test',text:'Body'}),
  /invalid_from_email/
);

await assert.rejects(
  ()=>buildBrandedRawEmail({env,fromEmail:'media@gnk-asg.hr',to:'user@example.com\r\nBcc: attacker@example.com',subject:'Test',text:'Body'}),
  /invalid_to_email/
);

const raw=await buildBrandedRawEmail({
  env,
  fromEmail:'media@gnk-asg.hr',
  to:'user@example.com',
  subject:'Test\r\nBcc: attacker@example.com',
  text:'Body',
  headers:{'X-Test':'ok\r\nBcc: attacker@example.com','Content-Type':'text/html'},
  attachments:[{filename:'bad\r\nname.exe',contentType:'text/plain\r\nX-Evil: yes',bytes:new Uint8Array([1,2,3,4])}]
});
assert.doesNotMatch(raw,/^Bcc:/m);
assert.doesNotMatch(raw,/X-Evil:/m);
assert.doesNotMatch(raw,/Content-Type: text\/html$/m);
assert.match(raw,/Content-Type: application\/octet-stream/);
assert.match(raw,/filename="bad_name\.exe"/);
assert.match(raw,new RegExp(VERSION.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

await assert.rejects(
  ()=>buildBrandedRawEmail({
    env,
    fromEmail:'media@gnk-asg.hr',
    to:'user@example.com',
    subject:'Large',
    text:'Body',
    attachments:[{filename:'large.bin',bytes:new Uint8Array(12*1024*1024+1)}]
  }),
  /attachment_size_limit_exceeded/
);

const signature=mediaSignatureHtml('javascript:alert(1)');
assert.doesNotMatch(signature,/javascript:/i);
assert.match(signature,/https:\/\/gnk-asg\.hr\/assets\/logo-gnk-asg-email\.jpg/);

console.log(JSON.stringify({ok:true,mailSent:false,headers:'guarded',attachments:{maxCount:10,maxBytes:12582912}},null,2));
