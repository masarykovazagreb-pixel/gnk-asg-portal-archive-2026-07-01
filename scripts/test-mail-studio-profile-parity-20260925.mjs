import fs from 'node:fs';
import assert from 'node:assert/strict';

const addresses=[
  'info@gnk-asg.hr','contact@gnk-asg.hr','office@gnk-asg.hr','legal@gnk-asg.hr',
  'privacy@gnk-asg.hr','media@gnk-asg.hr','press@gnk-asg.hr','it@gnk-asg.hr',
  'assistant@gnk-asg.hr','nermin.sefic@gnk-asg.hr','sefic@gnk-asg.hr','ubo@gnk-asg.hr'
];
const files=[
  'workers/gnk-asg-direct-operator/src/mail-studio-extension-v1.js',
  'workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js',
  'apps/portal/assets/mail-studio-webmail-v27.js',
  'workers/gnk-asg-direct-operator/src/index-mail-studio-bridge-v17.js',
  'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js'
];
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  for(const address of addresses)assert.ok(source.includes(address),\`${file} missing ${address}\`);
}
assert.equal(new Set(addresses).size,12);
console.log(JSON.stringify({ok:true,mailSent:false,count:addresses.length,addresses,files},null,2));
