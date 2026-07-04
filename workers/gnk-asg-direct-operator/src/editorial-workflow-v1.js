import {validatePublicationReadiness,publicationAttribution,VERSION as READINESS_VERSION} from './publication-readiness-v1.js';

export const VERSION=`GNK_DINAMO_EDITORIAL_WORKFLOW_V1_20260704_${READINESS_VERSION}`;

const clean=value=>String(value??'').trim();
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const planKey=date=>`the-code:editorial-plan:${date}`;
const latestPlanKey='the-code:editorial-plan:latest';
const queueIndexKey='the-code:publication-release-queue:index';
const queueItemKey=id=>`the-code:publication-release-queue:${id}`;
const editableFields=new Set([
  'publicationType','title','slug','language','category','summary','body','canonical','image','imageAlt',
  'primarySource','supportingSources','authorshipConfirmed','commentApprovedByNermin','finalApproval',
  'factCheckComplete','sourceReviewComplete','automationAssisted','processDisclosure','dateReviewed',
  'datePublished','dateModified'
]);

function ensureBinding(env){
  const binding=kvOf(env);
  if(!binding?.get||!binding?.put)throw new Error('editorial_kv_unavailable');
  return binding;
}

async function readJson(binding,key){
  const raw=await binding.get(key);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{throw new Error('editorial_kv_invalid_json')}
}

async function writeJson(binding,key,value){
  await binding.put(key,JSON.stringify(value));
  return value;
}

function sanitizePatch(input={}){
  const patch={};
  for(const [key,value] of Object.entries(input||{})){
    if(!editableFields.has(key))continue;
    if(key==='supportingSources')patch[key]=Array.isArray(value)?value.map(clean).filter(Boolean).slice(0,20):[];
    else if(['authorshipConfirmed','commentApprovedByNermin','finalApproval','factCheckComplete','sourceReviewComplete','automationAssisted'].includes(key))patch[key]=value===true;
    else patch[key]=clean(value);
  }
  patch.automaticPublication=false;
  return patch;
}

function stateFromReadiness(slot,readiness){
  if(readiness.ok)return'ready-for-controlled-publication';
  if(readiness.errors.includes('nermin_authorship_confirmation_required')||readiness.errors.includes('nermin_comment_approval_required'))return'author-confirmation-required';
  if(readiness.errors.some(item=>item.includes('source')))return'sources-required';
  if(readiness.errors.includes('final_approval_required'))return'final-approval-required';
  return'draft-incomplete';
}

export async function readEditorialPlan(env,date){
  if(!datePattern.test(clean(date)))throw new Error('invalid_editorial_date');
  return readJson(ensureBinding(env),planKey(clean(date)));
}

export async function saveEditorialSlot(env,input={}){
  const date=clean(input.date),id=clean(input.id);
  if(!datePattern.test(date))throw new Error('invalid_editorial_date');
  if(!id)throw new Error('editorial_slot_id_required');
  const binding=ensureBinding(env),plan=await readJson(binding,planKey(date));
  if(!plan||!Array.isArray(plan.slots))throw new Error('editorial_plan_not_found');
  const index=plan.slots.findIndex(item=>item.id===id);
  if(index<0)throw new Error('editorial_slot_not_found');
  const original=plan.slots[index],updated={...original,...sanitizePatch(input.patch),automaticPublication:false,updatedAt:new Date().toISOString()};
  const readiness=validatePublicationReadiness(updated);
  updated.state=stateFromReadiness(updated,readiness);
  updated.readiness={status:readiness.status,errors:readiness.errors,warnings:readiness.warnings,checkedAt:new Date().toISOString(),version:readiness.version};
  plan.slots[index]=updated;
  plan.updatedAt=new Date().toISOString();
  plan.summary={...(plan.summary||{}),readyForControlledPublication:plan.slots.filter(item=>item.state==='ready-for-controlled-publication').length};
  await writeJson(binding,planKey(date),plan);
  await writeJson(binding,latestPlanKey,plan);
  return{ok:true,slot:updated,readiness,attribution:publicationAttribution(updated),planSummary:plan.summary,version:VERSION};
}

export async function getEditorialSlot(env,input={}){
  const date=clean(input.date),id=clean(input.id),plan=await readEditorialPlan(env,date);
  if(!plan||!Array.isArray(plan.slots))throw new Error('editorial_plan_not_found');
  const slot=plan.slots.find(item=>item.id===id);
  if(!slot)throw new Error('editorial_slot_not_found');
  return slot;
}

async function readQueueIndex(binding){
  const value=await readJson(binding,queueIndexKey);
  return Array.isArray(value)?value:[];
}

export async function queueEditorialSlotForRelease(env,input={}){
  const binding=ensureBinding(env),slot=await getEditorialSlot(env,input),readiness=validatePublicationReadiness(slot);
  if(!readiness.ok){
    const error=new Error('publication_not_ready');
    error.readiness=readiness;
    throw error;
  }
  const existing=await readJson(binding,queueItemKey(slot.id));
  if(existing)return{ok:true,created:false,item:existing,readiness,version:VERSION};
  const item={
    id:slot.id,
    date:slot.date,
    title:slot.title,
    slug:slot.slug,
    publicationType:slot.publicationType,
    state:'awaiting-executive-release',
    queuedAt:new Date().toISOString(),
    automaticPublication:false,
    project:'GNK DINAMO Ltd.',
    editorialBrand:'THE CODE Intelligence',
    connectedEntity:'GNK ASG d.o.o.',
    attribution:publicationAttribution(slot),
    readiness:{status:readiness.status,warnings:readiness.warnings,version:readiness.version}
  };
  await writeJson(binding,queueItemKey(slot.id),item);
  const index=await readQueueIndex(binding);
  const next=[item,...index.filter(entry=>entry?.id!==item.id)].slice(0,200);
  await writeJson(binding,queueIndexKey,next);
  return{ok:true,created:true,item,readiness,version:VERSION};
}

export async function listEditorialReleaseQueue(env){
  const binding=ensureBinding(env),items=await readQueueIndex(binding);
  return{ok:true,items,automaticPublication:false,version:VERSION};
}

export const __test={kvOf,planKey,latestPlanKey,queueIndexKey,queueItemKey,sanitizePatch,stateFromReadiness};
