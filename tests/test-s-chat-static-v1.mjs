#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const get=p=>readFileSync(p,'utf8');
const html=get('apps/portal/s-chat/index.html');
const css=get('apps/portal/assets/s-chat-v1.css');
const js=get('apps/portal/assets/s-chat-v1.js');
const menu=get('apps/portal/assets/public-unified-menu-v6.js');
for(const name of ['apps/portal/assets/s-chat-v1.js','apps/portal/assets/public-unified-menu-v6.js']){
  execFileSync(process.execPath,['--check',name],{stdio:'pipe'});
}
assert.match(html,/GNK ASG S\+Chat/);
assert.match(html,/Powered by <strong>GNK ASG<\/strong>/);
assert.match(html,/Razgovarate s umjetnom inteligencijom/);
assert.match(html,/id="newChatMobile"/);
assert.match(html,/maxlength="600"/);
assert.match(html,/rel="canonical" href="https:\/\/gnk-asg\.hr\/s-chat\/"/);
assert.match(css,/\.chat-scroll\{[^}]*min-height:0;overflow-y:auto/);
assert.match(css,/\.conversation\{[^}]*min-height:0/);
assert.match(css,/\.mobile-new\{display:inline-flex/);
assert.match(js,/sessionStorage/);
assert.match(js,/const maxChars = 600/);
assert.match(js,/if \(pending\) \{ pending\.abort\(\); pending = null; \}/);
assert.match(js,/if \(token !== generation\) return/);
assert.match(js,/textContent = data\.reply/);
assert.match(js,/\/api\/intelligence-desk-chat/);
assert.match(menu,/id='gnk-splus-floating-button'/);
assert.match(menu,/link\.href='\/s-chat\/'/);
assert.match(menu,/Otvori GNK ASG S\+Chat/);
assert.match(menu,/9000/);
const governance=JSON.parse(get('config/splus-chat-ai-governance-v1.json'));
assert.equal(governance.aiGovernance.usedAI,true);
assert.equal(governance.aiGovernance.directAiInteraction,true);
assert.equal(governance.aiGovernance.chatbotIdentifiedAsAI,true);
assert.equal(governance.technicalControls.inputMaxCharacters,600);
execFileSync(process.execPath,['scripts/check-ai-act-governance-v1.mjs',
  '--candidate','config/splus-chat-ai-governance-v1.json','--strict'],{stdio:'pipe'});
console.log('GNK ASG S+Chat portal, floating launcher, mobile, privacy and governance: PASS');
