#!/usr/bin/env node
import fs from 'node:fs';

const policy=JSON.parse(fs.readFileSync('apps/portal/data/publishing_policy.json','utf8'));
const topics=JSON.parse(fs.readFileSync('apps/portal/data/publishing_topics.json','utf8'));
const failures=[];

const requiredAllowed=[
  'source-linked lifestyle and culture',
  'travel and destinations',
  'fashion and personal style',
  'pets and companion animals as non-medical lifestyle content',
  'automotive design, ownership and mobility',
  'food, gastronomy and hospitality',
  'sports reporting and culture without unsupported partnership claims'
];
for(const x of requiredAllowed) if(!policy.autonomous_allowed_topics?.includes(x)) failures.push('missing allowed topic: '+x);

const mustRemainBlocked=[
  'legal disputes',
  'criminal proceedings',
  'political commentary',
  'investment advice',
  'medical or private personal matters',
  'passwords or credentials',
  'unverified financial claims'
];
for(const x of mustRemainBlocked) if(!policy.autonomous_blocked_topics?.includes(x)) failures.push('blocked topic removed: '+x);

if(policy.quality_gate?.must_not_copy_external_articles!==true) failures.push('copying external articles must remain forbidden');
if(policy.quality_gate?.must_have_source_attribution_for_external_facts!==true) failures.push('external source attribution gate missing');
if(policy.quality_gate?.must_not_imply_personal_authorship_without_approval!==true) failures.push('personal authorship approval gate missing');
if(!policy.automatic_disclosures?.ai_visuals?.includes('not documentary photographs')) failures.push('AI visual disclosure weakened');
if(!policy.automatic_disclosures?.lifestyle) failures.push('lifestyle disclosure missing');
if(!/may not present a text as a personal author statement/i.test(policy.nermin_sefic_profile_rule||'')) failures.push('Nermin personal authorship rule weakened');

const requiredIds=['aktual-travel-weekly','aktual-style-fashion','aktual-pets-good-life','aktual-cars-style','aktual-food-travel','aktual-sport-weekly'];
for(const id of requiredIds){
  const t=topics.topics?.find(x=>x.id===id);
  if(!t) failures.push('topic seed missing: '+id);
  else if(t.safe_autonomous!==true) failures.push('topic is not safely classified: '+id);
}
for(const t of topics.topics||[]){
  const ks=(t.keywords||[]).join(' ');
  if(/Nermin\s+Sefi[cć]/i.test(ks) && requiredIds.includes(t.id)) failures.push('lifestyle topic keyword stuffing with author name: '+t.id);
}
const blockedSignals=(topics.blocked_topic_signals||[]).join(' ');
for(const signal of ['court','criminal','tax audit','political campaign','personal medical','bank account','password','unverified claim']){
  if(!blockedSignals.includes(signal)) failures.push('blocked signal missing: '+signal);
}

console.log(JSON.stringify({version:'AKTUAL_LIFESTYLE_POLICY_V1',requiredAllowed:requiredAllowed.length,topicSeeds:requiredIds.length,failures},null,2));
if(failures.length) process.exit(1);
