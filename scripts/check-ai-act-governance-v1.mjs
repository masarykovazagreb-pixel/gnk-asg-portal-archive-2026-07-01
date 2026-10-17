#!/usr/bin/env node
/**
 * Read-only ASG AI Act metadata gate for new AI-assisted editorial/use-case candidates.
 * No network calls, file writes, publication or legal certification.
 */
import { readFileSync } from 'node:fs';

const argv=process.argv.slice(2);
if(argv.includes('--help')){
  console.log('Usage: node scripts/check-ai-act-governance-v1.mjs --candidate /path/candidate.json [--as-of YYYY-MM-DD] [--strict]');
  process.exit(0);
}
const flag=(k)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:undefined;};
const strict=argv.includes('--strict');
const path=flag('--candidate');
if(!path||path.startsWith('--'))throw Error('Missing --candidate JSON path');
const today=flag('--as-of')||new Date().toISOString().slice(0,10);
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
if(!validDate(today))throw Error('Invalid as-of date');
const config=JSON.parse(readFileSync('config/eu-ai-act-governance-v1.json','utf8'));
if(config.schemaVersion!=='ASG_EU_AI_ACT_GOVERNANCE_V1'||!config.controls?.prohibitedUseMustBeRejected)throw Error('AI governance policy is invalid');
const candidate=JSON.parse(readFileSync(path,'utf8'));
const governance=candidate.aiGovernance;
const blockers=[],warnings=[];
const block=(condition,message)=>{if(condition)blockers.push(message);};
const string=s=>typeof s==='string'&&s.trim().length>0;
const dateIsNotFuture=s=>validDate(s)&&s<=today;
block(!governance||typeof governance!=='object','Missing mandatory aiGovernance record for new candidate.');
if(governance){
  block(typeof governance.usedAI!=='boolean','AI-use status must be explicitly true or false.');
  if(governance.usedAI===false){
    block(governance.deepfake===true||governance.generatesOrAltersText===true,'AI-derived content cannot be declared no-AI.');
  }
  if(governance.usedAI===true){
    block(!['provider','deployer','both'].includes(governance.role),'Declare role: provider, deployer or both.');
    block(!string(governance.purpose),'Declare the intended AI use-case purpose.');
    block(governance.prohibitedUseScreenPassed!==true||governance.prohibitedUse===true,'Prohibited-use screen must be passed and forbidden practices rejected.');
    block(governance.privacyAndRightsReviewed!==true,'Data protection, confidentiality and IP rights must be reviewed.');
    block(!['not-high-risk','possible-high-risk','high-risk'].includes(governance.riskClassification),'Classify the use by intended purpose; unknown classification is blocked.');
    if(governance.riskClassification!=='not-high-risk'){
      block(governance.specialistReviewApproved!==true||!string(governance.humanOversightPlan),'Potential high-risk use requires specialist approval and a human oversight plan.');
    }
    const mustLabel=governance.deepfake===true||
      (governance.publicInterest===true&&governance.generatesOrAltersText===true);
    const human=governance.humanEditorialReview;
    const validHuman=human?.substantive===true&&string(human.reviewer)&&dateIsNotFuture(human.approvedAt)&&human.editorialResponsibilityAccepted===true;
    const exempt=governance.deepfake!==true&&validHuman;
    if(mustLabel&&!exempt){
      block(governance.disclosure?.visible!==true||!string(governance.disclosure?.text),'AI/deepfake disclosure must be visible and have meaningful text unless qualifying human editorial review is evidenced for public-interest text.');
    }
    if(governance.publicInterest===true&&governance.generatesOrAltersText===true&&!validHuman){
      warnings.push('No qualifying substantive human editorial review: disclosure is required for public-interest AI text.');
    }
    if(governance.publicInterest===true&&governance.generatesOrAltersText===true&&validHuman){
      warnings.push('Human review recorded, but independently verify that substantive review and editorial accountability actually occurred.');
    }
    if(governance.directAiInteraction===true){
      block(governance.chatbotIdentifiedAsAI!==true&&governance.obviousAiInteraction!==true,'Direct AI interaction must identify the AI system unless already obvious.');
    }
    if((governance.role==='provider'||governance.role==='both')&&governance.generatesSyntheticMedia===true){
      block(governance.machineReadableProvenanceReviewed!==true,'Provider synthetic-media provenance/marking obligation requires review.');
    }
    if(governance.aiLiteracyMeasuresReviewed!==true)warnings.push('Document role-based AI literacy support measures (Article 4).');
  }
}
const report={
  policy:config.schemaVersion,
  policyAdoptedOn:config.adoptedOn,
  asOf:today,
  candidate:typeof candidate.title==='string'?candidate.title:null,
  status:blockers.length?'blocked':'metadata-check-passed-needs-human-evidence',
  blockers,warnings,
  evidenceLimit:'Self-reported candidate metadata is not proof of actual human review, legal compliance, or public deployment.',
  published:false,externalCalls:0,filesWritten:0,
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(strict&&blockers.length)process.exitCode=2;
