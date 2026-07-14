import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

export const VERSION='GNK_ASG_PRODUCTION_DEPLOY_REQUEST_VALIDATOR_V1_20260715';
export const ALLOWED_CONTROL_FILES=Object.freeze([
 '.github/production-deploy-request-v1.json',
 '.github/workflows/deploy-admin-auth-v6.yml',
 'scripts/test-deploy-approval-guardrails.mjs',
 'scripts/validate-production-deploy-request-v1.mjs'
]);

const shaPattern=/^[0-9a-f]{40}$/i;
const git=(args)=>execFileSync('git',args,{encoding:'utf8'}).trim();

export function validateProductionDeployRequest({requestPath='.github/production-deploy-request-v1.json',approvedSha,runGit=true}={}){
 assert.ok(shaPattern.test(String(approvedSha||'')),'approved deploy SHA must be a full 40-character SHA');
 assert.ok(fs.existsSync(requestPath),`missing production deploy request: ${requestPath}`);
 const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
 assert.equal(request.version,'GNK_ASG_PRODUCTION_DEPLOY_REQUEST_V1');
 assert.equal(request.confirm,'DEPLOY_ADMIN_AUTH_V6');
 assert.equal(request.oneTime,true);
 assert.match(String(request.requestId||''),/^[a-z0-9][a-z0-9-]{15,100}$/);
 assert.ok(shaPattern.test(String(request.approvedReleaseSha||'')),'request approvedReleaseSha must be a full SHA');
 assert.notEqual(request.approvedReleaseSha,approvedSha,'control merge SHA must differ from the previously approved release SHA');
 assert.equal(request.repository,'beckuphome-gnk/gnk-asg-portal');
 assert.equal(request.targetEnvironment,'production');
 assert.ok(Array.isArray(request.requiredPublicRoutes)&&request.requiredPublicRoutes.length>=4);
 for(const route of request.requiredPublicRoutes)assert.match(route,/^\/[a-z0-9/_-]*\/$/i);
 assert.ok(typeof request.reason==='string'&&request.reason.length>=40);
 let changedFiles=[];
 if(runGit){
  execFileSync('git',['merge-base','--is-ancestor',request.approvedReleaseSha,approvedSha],{stdio:'inherit'});
  changedFiles=git(['diff','--name-only',`${request.approvedReleaseSha}..${approvedSha}`]).split('\n').filter(Boolean).sort();
  const unexpected=changedFiles.filter(file=>!ALLOWED_CONTROL_FILES.includes(file));
  assert.deepEqual(unexpected,[],`unapproved files between release and deploy-control SHA: ${unexpected.join(', ')}`);
  assert.ok(changedFiles.includes(requestPath),'deploy request file must be part of the control diff');
  assert.ok(changedFiles.includes('.github/workflows/deploy-admin-auth-v6.yml'),'guarded push workflow change must be part of the control diff');
 }
 return {ok:true,version:VERSION,approvedSha,approvedReleaseSha:request.approvedReleaseSha,requestId:request.requestId,changedFiles,requiredPublicRoutes:request.requiredPublicRoutes};
}

if(import.meta.url===new URL(`file://${process.argv[1]}`).href){
 const result=validateProductionDeployRequest({requestPath:process.argv[2],approvedSha:process.argv[3]});
 console.log(JSON.stringify(result,null,2));
}
