import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  createCatchAllProfile,
  extractGnkAddresses,
  VERSION as PROFILE_FACTORY_VERSION
} from '../workers/gnk-asg-direct-operator/src/mail-autoreply-profile-factory-v1.js';
import {LOGO_URL,renderBrandSignatureHtml} from '../workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js';

const known=[
  ['office@gnk-asg.hr','GNK-OFFICE-IN'],['legal@gnk-asg.hr','GNK-LEGAL-IN'],
  ['media@gnk-asg.hr','GNK-MEDIA-IN'],['press@gnk-asg.hr','GNK-PRESS-IN'],
  ['it@gnk-asg.hr','GNK-IT-IN'],['assistant@gnk-asg.hr','GNK-ASSISTANT-IN'],
  ['nermin.sefic@gnk-asg.hr','GNK-SEFIC-IN'],['sefic@gnk-asg.hr','GNK-SEFIC-IN'],
  ['ubo@gnk-asg.hr','GNK-UBO-IN']
];
const baseSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
for(const[address,prefix]of known){
  assert.match(baseSource,new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(baseSource,new RegExp(prefix));
}

const message={to:'new.department@gnk-asg.hr',headers:{get(name){return name.toLowerCase()==='to'?'new.department@gnk-asg.hr':''}}};
assert.deepEqual(extractGnkAddresses(message),['new.department@gnk-asg.hr']);
const profile=createCatchAllProfile('new.department@gnk-asg.hr');
assert.equal(profile.address,'new.department@gnk-asg.hr');
assert.equal(profile.prefix,'GNK-NEW-DEPARTMENT-IN');
assert.equal(profile.catchAll,true);
assert.match(`${profile.prefix}-20260713120000-ABCDEF12`,/^GNK-NEW-DEPARTMENT-IN-\d{14}-[A-Z0-9]{8}$/);
assert.equal(createCatchAllProfile('external@example.com'),null);

assert.match(baseSource,/function ref\(profile\)\{return`\$\{profile\.prefix\}-/);
assert.match(baseSource,/crypto\.randomUUID\(\)/);
assert.match(baseSource,/MAIL_AUTO_REPLY_LIVE/);

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

console.log(JSON.stringify({ok:true,mailSent:false,knownProfiles:known.length,catchAll:true,profilePrefix:profile.prefix,goldLogo:LOGO_URL,version:PROFILE_FACTORY_VERSION},null,2));
