import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PROFILES,handleIncomingEmail,VERSION} from '../workers/gnk-asg-direct-operator/src/mail-identity-autoreply-all-v1.js';
import {LOGO_URL,renderBrandSignatureHtml} from '../workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js';

const known=[
  'office@gnk-asg.hr','legal@gnk-asg.hr','media@gnk-asg.hr','press@gnk-asg.hr',
  'it@gnk-asg.hr','assistant@gnk-asg.hr','nermin.sefic@gnk-asg.hr','sefic@gnk-asg.hr','ubo@gnk-asg.hr'
];
for(const address of known){
  assert.ok(PROFILES[address],`missing profile ${address}`);
  assert.match(PROFILES[address].prefix,/^GNK-[A-Z0-9-]+-IN$/);
}

const message={
  from:'external.sender@example.com',
  to:'new.department@gnk-asg.hr',
  subject:'Test',
  headers:{get(name){return ({to:'new.department@gnk-asg.hr',subject:'Test','message-id':'<test-all-addresses@example.com>'}[name.toLowerCase()]||'')}}
};
const audit=await handleIncomingEmail(message,{MAIL_AUTO_REPLY_LIVE:'false'},null,null);
assert.equal(audit.skipped,false);
assert.equal(audit.reply.reason,'auto_reply_locked');
assert.match(audit.reference,/^GNK-NEW-DEPARTMENT-IN-/);
assert.equal(audit.to,'new.department@gnk-asg.hr');
assert.equal(PROFILES['new.department@gnk-asg.hr'].catchAll,true);

assert.equal(LOGO_URL,'https://gnk-asg.hr/assets/logo-gnk-asg-gold.svg');
const signature=renderBrandSignatureHtml({name:'GNK ASG IT',unit:'Technical Support',email:'it@gnk-asg.hr'});
assert.match(signature,/logo-gnk-asg-gold\.svg/);
assert.match(signature,/GNK ASG — gold corporate mark/);
assert.match(signature,/it@gnk-asg\.hr/);

const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
assert.match(config,/MAIL_AUTO_REPLY_LIVE = "true"/);
const entry=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
assert.match(entry,/mail-identity-autoreply-all-v1\.js/);
assert.match(entry,/handleIncomingEmail\(message,env,ctx,app\)/);

console.log(JSON.stringify({ok:true,mailSent:false,knownProfiles:known.length,catchAll:true,reference:audit.reference,goldLogo:LOGO_URL,version:VERSION},null,2));
