import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const proc=spawnSync(process.execPath,['scripts/worker-agent-swarm-v1.mjs'],{encoding:'utf8',timeout:90000});
assert.equal(proc.status,0,'Swarm must execute without errors: '+proc.stderr);
const report=JSON.parse(fs.readFileSync('artifacts/worker-agent-swarm/report.json','utf8'));
const config=JSON.parse(fs.readFileSync('config/control-plane/worker-agent-swarm-v1.json','utf8'));
const bots=JSON.parse(fs.readFileSync('config/control-plane/workforce-bot-registry-v1.json','utf8')).bots;
assert.equal(report.summary.agents,config.agents.length);
assert.ok(report.summary.agents>=bots.length);
assert.equal(report.summary.errors,0);
assert.equal(report.controls.deploy,false);
assert.equal(report.controls.externalPublication,false);
assert.equal(report.controls.automaticHumanApproval,false);
assert.equal(config.policy.writeToMain,false);
assert.equal(config.policy.deploy,false);
assert.equal(config.policy.publishExternally,false);
assert.equal(config.policy.editorialHumanApprovalRequired,true);
for(const bot of bots)assert.ok(report.results.some(r=>r.parentBot===bot.botId),'Missing agent '+bot.botId);
assert.ok(fs.existsSync('artifacts/worker-agent-swarm/drafts/AG-JOURNALIST.json'));
const draft=JSON.parse(fs.readFileSync('artifacts/worker-agent-swarm/drafts/AG-JOURNALIST.json','utf8'));
assert.equal(draft.editorialApproval,false);
assert.equal(draft.sourceURLsVerified,false);
assert.equal(draft.status,'source-review');
assert.equal(report.results.find(r=>r.id==='AG-EDITOR').status,'review-hold');
for(const action of ['seo-check','frontend-check','worker-check','release-gate','news-review'])
 assert.ok(report.results.some(r=>r.action===action),'Missing action '+action);
console.log('Masarykova Worker Swarm: '+report.summary.agents+' agents across '+report.summary.workers+' workers — safe operational gates PASS');
