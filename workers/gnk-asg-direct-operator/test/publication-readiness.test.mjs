import assert from 'node:assert/strict';
import {validatePublicationReadiness,publicationAttribution} from '../src/publication-readiness-v1.js';
import {handleEditorialOperationsApi} from '../src/editorial-draft-planner-v1.js';

const base={
  title:'Verified enterprise analysis with original editorial context',
  slug:'verified-enterprise-analysis-original-context',
  language:'en',
  category:'Enterprise Intelligence',
  summary:'A source-based analysis that adds original enterprise context, identifies the accountable editor and records the publication process.',
  body:'x'.repeat(1200),
  canonical:'https://www.gnk-asg.hr/publications/verified-enterprise-analysis-original-context/',
  image:'https://www.gnk-asg.hr/assets/gnk-asg-social-card.png',
  imageAlt:'Editorial illustration for a verified enterprise analysis',
  primarySource:'https://example.org/primary-source',
  supportingSources:['https://example.org/supporting-source'],
  editor:'Nermin Sefić',
  project:'GNK DINAMO Ltd.',
  connectedEntity:'GNK ASG d.o.o.',
  automaticPublication:false,
  finalApproval:true,
  factCheckComplete:true,
  sourceReviewComplete:true,
  automationAssisted:true,
  processDisclosure:'Automation assisted the draft structure; source verification, authorship and final approval were completed by the accountable human editor.',
  dateCreated:'2026-07-04T08:00:00Z',
  dateReviewed:'2026-07-04T09:00:00Z'
};

const incomplete=validatePublicationReadiness({publicationType:'desk-article'});
assert.equal(incomplete.ok,false);
assert.equal(incomplete.status,'blocked');
assert.ok(incomplete.errors.includes('primary_source_required'));
assert.ok(incomplete.errors.includes('final_approval_required'));
assert.ok(incomplete.errors.includes('fact_check_required'));
assert.ok(incomplete.errors.includes('automatic_publication_must_be_false'));

const desk=validatePublicationReadiness({...base,publicationType:'desk-article',preparedByProfile:'EDT-LON-001',authorEntity:'GNK DINAMO Ltd. Group Editorial Desk'});
assert.equal(desk.ok,true);
assert.equal(desk.status,'ready-for-controlled-publication');
const deskAttribution=publicationAttribution({publicationType:'desk-article'});
assert.equal(deskAttribution.author.type,'Organization');
assert.equal(deskAttribution.author.name,'GNK DINAMO Ltd. Group Editorial Desk');
assert.equal(deskAttribution.editor,'Nermin Sefić');

const originalBlocked=validatePublicationReadiness({...base,publicationType:'nermin-original',authorEntity:'Nermin Sefić',authorshipConfirmed:false});
assert.equal(originalBlocked.ok,false);
assert.ok(originalBlocked.errors.includes('nermin_authorship_confirmation_required'));
const originalReady=validatePublicationReadiness({...base,publicationType:'nermin-original',authorEntity:'Nermin Sefić',authorshipConfirmed:true});
assert.equal(originalReady.ok,true);

const commentaryBlocked=validatePublicationReadiness({...base,publicationType:'nermin-commentary',authorEntity:'Nermin Sefić',commentApprovedByNermin:false});
assert.equal(commentaryBlocked.ok,false);
assert.ok(commentaryBlocked.errors.includes('nermin_comment_approval_required'));
const commentaryReady=validatePublicationReadiness({...base,publicationType:'nermin-commentary',authorEntity:'Nermin Sefić',commentApprovedByNermin:true});
assert.equal(commentaryReady.ok,true);

const disclosureBlocked=validatePublicationReadiness({...base,publicationType:'desk-article',preparedByProfile:'EDT-NYC-005',authorEntity:'GNK DINAMO Ltd. Group Editorial Desk',processDisclosure:''});
assert.equal(disclosureBlocked.ok,false);
assert.ok(disclosureBlocked.errors.includes('automation_process_disclosure_required'));

const apiBlocked=await handleEditorialOperationsApi(new Request('https://example.test/api/editorial-operations/publication/readiness',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({publicationType:'desk-article'})}),{});
assert.equal(apiBlocked.status,422);
const apiBlockedBody=await apiBlocked.json();
assert.equal(apiBlockedBody.readiness.status,'blocked');

const readyPayload={...base,publicationType:'desk-article',preparedByProfile:'EDT-ZRH-003',authorEntity:'GNK DINAMO Ltd. Group Editorial Desk'};
const apiReady=await handleEditorialOperationsApi(new Request('https://example.test/api/editorial-operations/publication/readiness',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(readyPayload)}),{});
assert.equal(apiReady.status,200);
const apiReadyBody=await apiReady.json();
assert.equal(apiReadyBody.readiness.status,'ready-for-controlled-publication');
assert.equal(apiReadyBody.attribution.publisher,'GNK DINAMO Ltd.');
assert.equal(apiReadyBody.attribution.provider,'GNK ASG d.o.o.');

console.log('PUBLICATION_READINESS_GATE_TESTS_OK');
