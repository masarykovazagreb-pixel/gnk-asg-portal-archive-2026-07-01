export const VERSION='GNK_DINAMO_PUBLICATION_READINESS_V1_20260704';

const clean=value=>String(value??'').trim();
const array=value=>Array.isArray(value)?value:[];
const absoluteUrl=value=>{try{return /^https?:$/i.test(new URL(clean(value)).protocol)}catch{return false}};

export function validatePublicationReadiness(input={}){
  const errors=[];
  const warnings=[];
  const publicationType=clean(input.publicationType);
  const allowedTypes=new Set(['desk-article','nermin-original','nermin-commentary']);
  if(!allowedTypes.has(publicationType))errors.push('publication_type_invalid');

  for(const field of ['title','slug','language','category','summary','body','canonical','image','imageAlt']){
    if(!clean(input[field]))errors.push(`required:${field}`);
  }
  if(clean(input.title).length>120)warnings.push('title_too_long');
  if(clean(input.summary).length<80)warnings.push('summary_too_short');
  if(clean(input.body).length<900)warnings.push('body_may_be_thin');
  if(clean(input.slug)&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(clean(input.slug)))errors.push('slug_invalid');
  if(clean(input.canonical)&&!absoluteUrl(input.canonical))errors.push('canonical_invalid');
  if(clean(input.image)&&!absoluteUrl(input.image))errors.push('image_invalid');

  const primarySource=clean(input.primarySource);
  const supportingSources=array(input.supportingSources).map(clean).filter(Boolean);
  if(!primarySource)errors.push('primary_source_required');
  else if(!absoluteUrl(primarySource))errors.push('primary_source_invalid');
  if(supportingSources.some(source=>!absoluteUrl(source)))errors.push('supporting_source_invalid');
  if(new Set([primarySource,...supportingSources].filter(Boolean)).size!==[primarySource,...supportingSources].filter(Boolean).length)warnings.push('duplicate_sources');

  if(publicationType==='desk-article'){
    if(!clean(input.preparedByProfile))errors.push('prepared_by_profile_required');
    if(clean(input.authorEntity)!=='GNK DINAMO Ltd. Group Editorial Desk')errors.push('desk_author_entity_invalid');
  }
  if(publicationType==='nermin-original'){
    if(input.authorshipConfirmed!==true)errors.push('nermin_authorship_confirmation_required');
    if(clean(input.authorEntity)!=='Nermin Sefić')errors.push('nermin_author_entity_required');
  }
  if(publicationType==='nermin-commentary'){
    if(input.commentApprovedByNermin!==true)errors.push('nermin_comment_approval_required');
    if(clean(input.authorEntity)!=='Nermin Sefić')errors.push('nermin_author_entity_required');
  }

  if(clean(input.editor)!=='Nermin Sefić')errors.push('editor_required');
  if(clean(input.project)!=='GNK DINAMO Ltd.')errors.push('project_identity_invalid');
  if(clean(input.connectedEntity)!=='GNK ASG d.o.o.')errors.push('connected_entity_invalid');
  if(input.automaticPublication!==false)errors.push('automatic_publication_must_be_false');
  if(input.finalApproval!==true)errors.push('final_approval_required');
  if(input.factCheckComplete!==true)errors.push('fact_check_required');
  if(input.sourceReviewComplete!==true)errors.push('source_review_required');

  if(input.automationAssisted===true&&!clean(input.processDisclosure))errors.push('automation_process_disclosure_required');
  if(clean(input.processDisclosure)&&clean(input.processDisclosure).length<40)warnings.push('process_disclosure_too_short');
  if(!clean(input.dateCreated))errors.push('date_created_required');
  if(!clean(input.dateReviewed))errors.push('date_reviewed_required');

  return{
    ok:errors.length===0,
    status:errors.length?'blocked':'ready-for-controlled-publication',
    errors,
    warnings,
    version:VERSION
  };
}

export function publicationAttribution(input={}){
  const type=clean(input.publicationType);
  if(type==='nermin-original'||type==='nermin-commentary'){
    return{author:{type:'Person',name:'Nermin Sefić',url:'/nermin-sefic/'},editor:'Nermin Sefić',publisher:'GNK DINAMO Ltd.',provider:'GNK ASG d.o.o.'};
  }
  return{author:{type:'Organization',name:'GNK DINAMO Ltd. Group Editorial Desk',url:'/the-code/intelligence/'},editor:'Nermin Sefić',publisher:'GNK DINAMO Ltd.',provider:'GNK ASG d.o.o.'};
}
