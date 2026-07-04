import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const errors=[];
const check=(condition,message)=>{if(!condition)errors.push(message);};
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadCommonJs(file){
  const sandbox={module:{exports:{}},exports:{}};
  vm.runInNewContext(read(file),sandbox,{filename:file});
  return sandbox.module.exports;
}

const library=loadCommonJs('apps/portal/assets/js/editorial-launch-library-v1.js');
const drafts=loadCommonJs('apps/portal/assets/js/editorial-launch-drafts-v1.js');
const expanded=drafts.expandLibrary(library);
const items=expanded.items||[];

check(library.status==='controlled-review','library must remain controlled-review');
check(library.count===60,'declared launch count must equal 60');
check(items.length===60,'launch library must contain exactly 60 items');
check(expanded.fullDraftCount===60,'all 60 launch items must have first-draft bodies');
check(new Set(items.map(item=>item.id)).size===60,'launch item IDs must be unique');
check(new Set(items.map(item=>item.slug)).size===60,'launch slugs must be unique');
check(new Set(items.map(item=>item.title)).size===60,'launch titles must be unique');
check(library.distribution?.deskArticles===48,'launch library must contain 48 desk articles');
check(library.distribution?.nerminCommentaryCandidates===12,'launch library must contain 12 Nermin commentary candidates');
check(library.distribution?.nerminEditorCandidates===24,'launch library must contain 24 Nermin editor candidates');
check(library.publicationPolicy?.automaticPublication===false,'automatic publication must remain false');
check(library.publicationPolicy?.indexBeforeApproval===false,'indexing before approval must remain false');
check(library.publicationPolicy?.approvalQueue==='/mobile-admin/','mobile approval queue link missing');

const requiredFields=['id','title','slug','category','language','publicationType','preparedByProfile','proposedAuthor','proposedEditor','summary','status'];
for(const item of items){
  for(const field of requiredFields)check(typeof item[field]==='string'&&item[field].trim(),`${item.id||'unknown'} missing ${field}`);
  check(/^LAUNCH-\d{3}$/.test(item.id),`invalid launch ID ${item.id}`);
  check(Array.isArray(item.bodyOutline)&&item.bodyOutline.length>=5,`${item.id} requires a complete body outline`);
  check(Array.isArray(item.requiredSources)&&item.requiredSources.length>=3,`${item.id} requires at least three source requirements`);
  check(item.draftBodyComplete===true,`${item.id} first draft must be marked complete`);
  check(typeof item.draftBody==='string'&&item.draftBody.length>=3500,`${item.id} first draft body is too short`);
  check(item.draftBody.includes('Option one:')&&item.draftBody.includes('Option two:'),`${item.id} must present two editorial options`);
  check(item.draftBody.includes('Evidence and review standard'),`${item.id} evidence section missing`);
  check(item.factCheckRequired===true,`${item.id} fact-check must be required`);
  check(item.sourceReviewRequired===true,`${item.id} source review must be required`);
  check(item.finalHumanApprovalRequired===true,`${item.id} final human approval must be required`);
  check(item.automaticPublication===false,`${item.id} automatic publication must be false`);
  check(item.pushNotificationOnApprovalReady===true,`${item.id} approval-ready notification flag missing`);
  check(!/published/i.test(item.status),`${item.id} must not start as published`);
  if(item.publicationType==='nermin-commentary'){
    check(item.proposedAuthor==='Nermin Sefić',`${item.id} commentary author candidate mismatch`);
    check(item.authorApprovalRequired===true,`${item.id} requires Nermin authorship approval`);
    check(item.independentReviewRequired===true,`${item.id} requires independent editorial review`);
    check(item.proposedEditor!=='Nermin Sefić',`${item.id} Nermin must not be sole editor of his own commentary`);
  }
  if(item.proposedEditor==='Nermin Sefić'){
    check(item.publicationType==='desk-article',`${item.id} Nermin editor rule applies only to other articles`);
    check(item.editorApprovalRequired===true,`${item.id} requires recorded Nermin editorial approval`);
  }
}

const page=read('apps/portal/editorial-operations/launch-library/index.html');
for(const token of ['noindex,nofollow,noarchive','Sixty planned publications','No automatic publication','/mobile-admin/','editorial-launch-library-v1.js','role="status"','author confirmation','editor confirmation']){
  check(page.includes(token),`launch library page missing ${token}`);
}
const runtime=read('apps/portal/assets/js/editorial-operations-runtime-v1.js');
check(runtime.includes('/editorial-operations/launch-library/'),'Editorial Operations link to launch library missing');
const releaseQueue=read('apps/portal/editorial-operations/release-queue/index.html');
check(releaseQueue.includes('No publish action exists here'),'release queue publish lock missing');

if(errors.length){
  console.error(`EDITORIAL_LAUNCH_LIBRARY_FAILED ${errors.length}`);
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}
console.log('EDITORIAL_LAUNCH_LIBRARY_OK');
console.log(JSON.stringify({...library.distribution,fullDraftCount:expanded.fullDraftCount}));
