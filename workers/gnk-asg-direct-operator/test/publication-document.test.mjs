import assert from 'node:assert/strict';
import {renderPublicationDocument} from '../src/publication-document-v1.js';
import {handleEditorialOperationsApi} from '../src/editorial-draft-planner-v1.js';

const ready={
  publicationType:'desk-article',
  preparedByProfile:'EDT-DXB-004',
  authorEntity:'GNK DINAMO Ltd. Group Editorial Desk',
  editor:'Nermin Sefić',
  project:'GNK DINAMO Ltd.',
  connectedEntity:'GNK ASG d.o.o.',
  title:'THE CODE Intelligence verified publication preview',
  slug:'the-code-intelligence-verified-publication-preview',
  language:'en',
  category:'Enterprise Intelligence',
  summary:'A verified source-based preview demonstrating controlled publication metadata, accountable editing and correct project attribution.',
  body:'First analytical paragraph with original context.\n\nSecond paragraph with <script>alert(1)</script> text that must be escaped.'+'x'.repeat(1000),
  canonical:'https://www.gnk-asg.hr/publications/the-code-intelligence-verified-publication-preview/',
  image:'https://www.gnk-asg.hr/assets/gnk-asg-social-card.png',
  imageAlt:'THE CODE Intelligence controlled editorial preview',
  primarySource:'https://example.org/primary',
  supportingSources:['https://example.org/supporting'],
  automaticPublication:false,
  finalApproval:true,
  factCheckComplete:true,
  sourceReviewComplete:true,
  automationAssisted:true,
  processDisclosure:'Automation assisted the draft structure; sources, facts and final publication approval were reviewed and confirmed by the accountable human editor.',
  dateCreated:'2026-07-04T08:00:00Z',
  dateReviewed:'2026-07-04T09:00:00Z',
  datePublished:'2026-07-04T09:00:00Z'
};

const document=renderPublicationDocument(ready);
assert.ok(document.startsWith('<!doctype html>'));
assert.ok(document.includes('<meta name="robots" content="noindex,nofollow,noarchive">'));
assert.ok(document.includes('THE CODE Intelligence'));
assert.ok(document.includes('GNK DINAMO Ltd. Group Editorial Desk'));
assert.ok(document.includes('Edited and reviewed by'));
assert.ok(document.includes('Nermin Sefić'));
assert.ok(document.includes('Publisher: GNK DINAMO Ltd.'));
assert.ok(document.includes('Publishing platform/provider: GNK ASG d.o.o.'));
assert.ok(document.includes('"@type":"NewsArticle"'));
assert.ok(document.includes('"accountablePerson"'));
assert.ok(document.includes('"reviewedBy"'));
assert.ok(document.includes('https://example.org/primary'));
assert.ok(!document.includes('<script>alert(1)</script>'));
assert.ok(document.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

assert.throws(()=>renderPublicationDocument({publicationType:'desk-article'}),error=>error?.message==='publication_not_ready'&&error?.readiness?.status==='blocked');

const response=await handleEditorialOperationsApi(new Request('https://example.test/api/editorial-operations/publication/preview',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(ready)
}),{});
assert.equal(response.status,200);
assert.equal(response.headers.get('x-robots-tag'),'noindex,nofollow,noarchive');
assert.match(response.headers.get('content-type'),/^text\/html/u);
const responseHtml=await response.text();
assert.ok(responseHtml.includes('Controlled preview'));

const blocked=await handleEditorialOperationsApi(new Request('https://example.test/api/editorial-operations/publication/preview',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({publicationType:'desk-article'})
}),{});
assert.equal(blocked.status,422);
assert.match(blocked.headers.get('content-type'),/^application\/json/u);

const nerminDocument=renderPublicationDocument({...ready,publicationType:'nermin-original',preparedByProfile:undefined,authorEntity:'Nermin Sefić',authorshipConfirmed:true});
assert.ok(nerminDocument.includes('By <a href="/nermin-sefic/">Nermin Sefić</a>'));
assert.ok(nerminDocument.includes('"@type":"Person"'));

console.log('PUBLICATION_DOCUMENT_PREVIEW_TESTS_OK');
