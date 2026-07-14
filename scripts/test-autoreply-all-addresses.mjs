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
assert.equal(createCatchAllProfile('external@example.com'),null);
for(const marker of [
 /GLOBAL_CENTRES=/,/Budapest/,/New York/,/London/,/Dubai/,/Singapore/,/Tokyo/,/Zurich/,/Berlin/,/Paris/,/São Paulo/,
 /chooseCentre\(\)/,/env\.AI\.run/,/MAIL_AUTO_REPLY_AI_LIVE/,/MAIL_AUTO_REPLY_AI_MODEL/,/mode:'ai'/,/mode:'fallback'/,
 /inline_logo_unavailable/,/Content-ID: <\$\{EMAIL_LOGO_CID\}>/,/X-GNK-ASG-Signature-Logo: cid-inline/,
 /createTrackedMessage/,/annotateEmailStatusRecord/,/recordAutoReplyAudit/,/auto-reply/
])assert.match(baseSource,marker);
assert.match(baseSource,/function ref\(profile\)\{return`\$\{profile\.prefix\}-/);
assert.match(baseSource,/crypto\.randomUUID\(\)/);
assert.match(baseSource,/MAIL_AUTO_REPLY_LIVE/);
assert.match(baseSource,/duplicate_message_id/);
assert.match(baseSource,/X-Auto-Response-Suppress: All/);
assert.equal(LOGO_URL,'https://gnk-asg.hr/assets/logo-gnk-asg-email.png?v=20260713-canonical');
assert.match(SIGNATURE_VERSION,/V12_20260713_STANDARD_64/);
const signature=renderBrandSignatureHtml({name:'GNK ASG IT',unit:'Technical Support',email:'it@gnk-asg.hr',logoSrc:'cid:gnk-asg-email-logo'});
assert.match(signature,/src="cid:gnk-asg-email-logo"/);
assert.match(signature,/width="64"/);
assert.match(signature,/height="66"/);
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
assert.match(config,/MAIL_AUTO_REPLY_LIVE = "true"/);
assert.match(config,/MAIL_AUTO_REPLY_AI_LIVE = "true"/);
assert.match(config,/MAIL_AUTO_REPLY_AI_MODEL = "@cf\/meta\/llama-3\.1-8b-instruct-fast"/);
assert.match(config,/main = "src\/index-unified-auth-v22\.js"/);
console.log(JSON.stringify({ok:true,mailSent:false,knownProfiles:known.length,catchAll:true,globalCentres:10,ai:true,fallback:true,inlineCidRequired:true,emailStatusOperations:true,brandLogo:LOGO_URL,entry:'v22-over-v21',version:PROFILE_FACTORY_VERSION},null,2));
