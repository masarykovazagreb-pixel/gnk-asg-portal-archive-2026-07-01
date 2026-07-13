import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';

const REQUIRED_CONFIRM='DEPLOY_ADMIN_AUTH_V6';
const WORKFLOW='deploy-admin-auth-v6.yml';
const REPO='beckuphome-gnk/gnk-asg-portal';
const args=new Set(process.argv.slice(2));
const value=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]||'':''};
const confirm=value('--confirm');
const expectedSha=value('--expected-sha');
const execute=args.has('--execute');

const run=(command,params,options={})=>execFileSync(command,params,{encoding:'utf8',stdio:options.capture?'pipe':'inherit',...options}).trim();
const fail=message=>{console.error(`DEPLOY PREPARATION BLOCKED: ${message}`);process.exit(1)};

if(confirm!==REQUIRED_CONFIRM)fail(`exact --confirm ${REQUIRED_CONFIRM} is required`);
if(!expectedSha||!/^[0-9a-f]{40}$/i.test(expectedSha))fail('a full 40-character --expected-sha is required');
if(!fs.existsSync('.github/workflows/deploy-admin-auth-v6.yml'))fail('approved workflow file is missing');

const branch=run('git',['branch','--show-current'],{capture:true});
const head=run('git',['rev-parse','HEAD'],{capture:true});
const dirty=run('git',['status','--porcelain'],{capture:true});
if(branch!=='main')fail(`deploy source must be main, current branch is ${branch||'detached'}`);
if(head!==expectedSha)fail(`HEAD ${head} does not match approved SHA ${expectedSha}`);
if(dirty)fail('working tree is not clean');

run(process.execPath,['scripts/test-email-signature-contract.mjs']);
run(process.execPath,['scripts/test-mail-transport-guardrails.mjs']);
run(process.execPath,['scripts/test-email-mime-guardrails.mjs']);
run(process.execPath,['scripts/test-autoreply-guardrails.mjs']);
run(process.execPath,['scripts/test-news-queue-guardrails.mjs']);
run(process.execPath,['scripts/predeploy-release-v6.mjs']);

const command=['workflow','run',WORKFLOW,'--repo',REPO,'--ref',head,'-f',`confirm_production_deploy=${REQUIRED_CONFIRM}`];
console.log(JSON.stringify({ok:true,mode:execute?'execute':'prepare-only',repo:REPO,workflow:WORKFLOW,branch,head,command:['gh',...command].join(' ')},null,2));

if(!execute){
  console.log('\nPreparation completed. No deploy was started. Re-run with --execute only after a new explicit approval.');
  process.exit(0);
}
if(process.env.GNK_ASG_DEPLOY_APPROVED!=='YES')fail('GNK_ASG_DEPLOY_APPROVED=YES is required for execution');
const result=spawnSync('gh',command,{stdio:'inherit'});
if(result.error)fail(result.error.message);
if(result.status!==0)fail(`GitHub workflow dispatch failed with exit code ${result.status}`);
console.log('Approved workflow dispatch submitted.');
