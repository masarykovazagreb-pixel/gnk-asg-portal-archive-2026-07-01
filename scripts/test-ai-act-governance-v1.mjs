import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir=mkdtempSync(join(tmpdir(),'asg-ai-act-'));
const path=join(dir,'candidate.json');
const base=()=>({title:'Internal test content',aiGovernance:{
  usedAI:true,role:'deployer',purpose:'Draft public article',
  prohibitedUse:false,prohibitedUseScreenPassed:true,
  privacyAndRightsReviewed:true,riskClassification:'not-high-risk',
  aiLiteracyMeasuresReviewed:true,
  publicInterest:true,generatesOrAltersText:true,deepfake:false,
  disclosure:{visible:true,text:'Tekst je generiran uz pomoć umjetne inteligencije.'}
}});
const run=(c)=>{
  writeFileSync(path,JSON.stringify(c));
  const proc=spawnSync(process.execPath,['scripts/check-ai-act-governance-v1.mjs','--candidate',path,'--as-of','2026-10-17','--strict'],{encoding:'utf8'});
  assert.equal(proc.stderr,'',proc.stderr);
  return {code:proc.status,report:JSON.parse(proc.stdout)};
};
try{
  const valid=run(base());
  assert.equal(valid.code,0);
  assert.equal(valid.report.status,'metadata-check-passed-needs-human-evidence');
  assert.equal(valid.report.published,false);
  assert.equal(valid.report.externalCalls,0);
  const noDisclosure=base(); noDisclosure.aiGovernance.disclosure={visible:false,text:''};
  assert.equal(run(noDisclosure).code,2,'AI public-interest content without review and disclosure must fail');
  const reviewed=base();reviewed.aiGovernance.disclosure={visible:false,text:''};
  reviewed.aiGovernance.humanEditorialReview={substantive:true,reviewer:'Named editor',approvedAt:'2026-10-17',editorialResponsibilityAccepted:true};
  assert.equal(run(reviewed).code,0,'Documented real substantive editorial review may qualify');
  const fakeReview=base();fakeReview.aiGovernance.disclosure={visible:false,text:''};
  fakeReview.aiGovernance.humanEditorialReview={substantive:false,reviewer:'Automated spelling checker',approvedAt:'2026-10-17',editorialResponsibilityAccepted:true};
  assert.equal(run(fakeReview).code,2,'Automated proofreading is not substantive human review');
  const deepfake=structuredClone(reviewed);deepfake.aiGovernance.deepfake=true;
  assert.equal(run(deepfake).code,2,'Deepfake requires disclosure even when a human reviewed the text');
  const forbidden=base();forbidden.aiGovernance.prohibitedUse=true;
  assert.equal(run(forbidden).code,2,'Prohibited use must fail');
  const recruitment=base();recruitment.aiGovernance.riskClassification='possible-high-risk';
  assert.equal(run(recruitment).code,2,'High-risk case needs specialist review and oversight');
  const chatbot=base();chatbot.aiGovernance.directAiInteraction=true;
  assert.equal(run(chatbot).code,2,'Undisclosed interactive AI must fail');
  const noAI={title:'Human-only content',aiGovernance:{usedAI:false,deepfake:false,generatesOrAltersText:false}};
  assert.equal(run(noAI).code,0);
  assert.equal(run({title:'Missing AI status'}).code,2);
  console.log('ASG EU AI Act policy: 10 candidate disclosure, prohibition, risk and accountability checks PASS');
} finally { rmSync(dir,{recursive:true,force:true}); }
