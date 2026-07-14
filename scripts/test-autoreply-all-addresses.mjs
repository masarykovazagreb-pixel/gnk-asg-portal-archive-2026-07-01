import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createCatchAllProfile,extractGnkAddresses,VERSION as PROFILE_FACTORY_VERSION} from '../workers/gnk-asg-direct-operator/src/mail-autoreply-profile-factory-v1.js';
import {LOGO_URL,renderBrandSignatureHtml,VERSION as SIGNATURE_VERSION} from '../workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js';

const known=[
 ['office@gnk-asg.hr','GNK-OFFICE-IN'],['legal@gnk-asg.hr','GNK-LEGAL-IN'],['media@gnk-asg.hr','GNK-MEDIA-IN'],
 ['press@gnk-asg.hr','GNK-PRESS-IN'],['it@gnk-asg.hr','GNK-IT-IN'],['assistant@gnk-asg.hr','GNK-ASSISTANT-IN'],
 ['nermin.sefic@gnk-asg.hr','GNK-SEFIC-IN'],['sefic@gnk-asg.hr','GNK-SEFIC-IN'],['ubo@gnk-asg.hr','GNK-UBO-IN']
];
const baseSource=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
for(const[address,prefix]of known){assert.match(baseSource,new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.match(baseSource,new RegExp(prefix))}

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
assert.match(baseSource,/Content-Location: \$\{EMAIL_LOGO_URL\}/);
assert.match(baseSource,/X-Attachment-Id: \$\{EMAIL_LOGO_CID\}/);
assert.match(baseSource,/multipart\/related; type="multipart\/alternative"/);

assert.equal(LOGO_URL,'https://gnk-asg.hr/assets/logo-gnk-asg-email.png?v=20260713-canonical');
assert.match(SIGNATURE_VERSION,/V12_20260713_STANDARD_64/);
const signature=renderBrandSignatureHtml({name:'GNK ASG IT',unit:'Technical Support',email:'it@gnk-asg.hr'});
assert.match(signature,/logo-gnk-asg-email\.png/);
assert.match(signature,/alt="GNK ASG"/);
assert.match(signature,/width="64"/);
assert.match(signature,/height="66"/);
assert.match(signature,/color:#111111/);
assert.match(signature,/it@gnk-asg\.hr/);
assert.doesNotMatch(signature,/logo-gnk-asg-email\.jpg|corporate mark|width="108"|height="111"/);

const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
assert.match(config,/MAIL_AUTO_REPLY_LIVE = "true"/);
assert.match(config,/main = "src\/index-unified-auth-v22\.js"/);
const wrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
assert.match(wrapper,/index-unified-auth-v21\.js/);
assert.match(wrapper,/email-status-tracking-v5\.js/);
const entry=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
assert.match(entry,/mail-identity-autoreply-all-v1\.js/);
assert.match(entry,/handleIncomingEmail\(message,env,ctx,app\)/);

console.log(JSON.stringify({ok:true,mailSent:false,knownProfiles:known.length,catchAll:true,profilePrefix:profile.prefix,brandLogo:LOGO_URL,canonicalPng:true,inlineCompatibility:['Content-ID','Content-Location','X-Attachment-Id'],logoSize:'64x66',entry:'v22-over-v21',version:PROFILE_FACTORY_VERSION},null,2));
