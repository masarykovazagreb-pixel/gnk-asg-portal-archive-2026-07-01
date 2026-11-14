import test from 'node:test';
import assert from 'node:assert/strict';
import { triage, buildQueue, ownershipGroupForHost } from './triage-v1.mjs';
import { assessDraft, editorialFingerprint } from './article-quality-gate-v1.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const head='Vlada predstavila novi zakon o porezu na nekretnine u saboru';
const feed=[
 {title:head, url:'https://medij-a.hr/vijest/1?utm_source=abc', date:'2026-11-13T09:00:00Z', sourceName:'Medij A',source:'a'},
 {title:'Novi zakon o porezu na nekretnine predstavljen u saboru danas',
  url:'https://medij-b.hr/clanak/2',date:'2026-11-13T10:00:00Z',sourceName:'Medij B',source:'b'},
 {title:'Novi zakon o porezu na nekretnine predstavljen u saboru danas',
  url:'https://medij-b.hr/clanak/2?utm_campaign=news',date:'2026-11-13T10:00:00Z',sourceName:'Medij B',source:'b'},
 {title:'Vlada predstavila novi zakon o porezu na nekretnine u saboru',
  url:'https://medij-a.hr/vijest/3',date:'2026-11-13T09:30:00Z',sourceName:'Medij A',source:'a'},
 {title:'Vlada predstavila novi zakon o porezu na nekretnine u saboru',
  url:'https://medij-c.hr/vijest/4',date:'2026-11-08T09:00:00Z',sourceName:'Medij C',source:'c'},
 {title:'Vlada predstavila novi zakon o porezu na nekretnine u saboru',
  url:'http://not-secure.hr/vijest/5',date:'2026-11-13T10:00:00Z',sourceName:'Unsafe'}
];
test('scout picks multi-outlet research leads but never publishes',()=>{
 const q=triage(feed,{now:NOW,channel:'zagreb'});
 assert.equal(q.length,1);
 assert.equal(q[0].distinct_outlets,2);
 assert.equal(q[0].publishable,false);
 assert.equal(q[0].status,'research_required');
 assert.equal(q[0].verified_claims,0);
 assert.ok(q[0].sources.every(x=>x.url.startsWith('https://')));
 assert.ok(q[0].sources.every(x=>!x.url.includes('utm_')));
});
test('single outlet, future and stale stories do not qualify',()=>{
 assert.deepEqual(triage(feed.slice(0,1),{now:NOW}),[]);
 assert.deepEqual(triage(feed.map(x=>({...x,date:'2026-11-20T12:00:00Z'})),{now:NOW}),[]);
});
test('scout is deterministic and stable regardless of input order',()=>{
 const a=triage(feed,{now:NOW});
 const b=triage([...feed].reverse(),{now:NOW});
 assert.deepEqual(a,b);
});
test('queue reads source archives and writes nothing',()=>{
 const dir=mkdtempSync(join(tmpdir(),'aktual-queue-'));
 try{
  mkdirSync(join(dir,'apps/region/data'),{recursive:true});
  writeFileSync(join(dir,'apps/region/channels.json'),JSON.stringify({channels:[{id:'zagreb'},{id:'beograd'}]}));
  writeFileSync(join(dir,'apps/region/data/zagreb.json'),JSON.stringify({items:feed}));
  const q=buildQueue({root:dir,now:NOW});
  assert.equal(q.totals.channels,2);
  assert.equal(q.totals.publishable,0);
  assert.equal(q.channels[1].leads.length,0);
  assert.ok(q.channels[0].leads.length>0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
const body=Array.from({length:300},(_,i)=>'Urednička analiza izvora '+i+' razmatra relevantan institucionalni kontekst i metodološka ograničenja.').join(' ');
function draft(){
 const d={
  status:'draft', title:'Autorska analiza promjene poreznih pravila u regionalnom gospodarstvu',
  body, aiAssisted:true,
  disclosure:{visible:true,text:'Tekst je pripremljen uz AI i sadržajno pregledan.'},
  sources:[
   {id:'a',url:'https://medij-a.hr/vijest/1',published_at:'2026-11-13T08:00:00Z',title:head,summary:'Vlada je iznijela prijedlog',editorialGroup:'group-a',materialType:'official-record',evidenceCheckedAt:'2026-11-13T10:00:00Z',evidenceNote:'Primary documentation reviewed in test fixture'},
   {id:'b',url:'https://medij-b.hr/vijest/2',published_at:'2026-11-13T09:00:00Z',title:'Porezni zakon',summary:'O prijedlogu se raspravlja',editorialGroup:'group-b',materialType:'full-article',evidenceCheckedAt:'2026-11-13T10:30:00Z',evidenceNote:'Full article inspected in test fixture'}
  ],
  claims:[
   {text:'Prvi relevantni nalaz zahtijeva provjeru',evidence:['a','b']},
   {text:'Drugi relevantni nalaz zahtijeva kontekst',evidence:['a','b']}
  ],
  substantiveResearchDone:true,evidence_level:'primary-and-secondary-verified',research_gaps:[],
  humanEditorialReview:{substantive:true,reviewer:'Odgovorni urednik',approvedAt:'2026-11-13T11:00:00Z',editorialResponsibilityAccepted:true},
  privacyAndRightsReviewed:true,
  correctionsUrl:'https://gnk-asg.hr/gnk-aktual/metodologija/'
 };
 d.humanEditorialReview.article_sha256=editorialFingerprint(d);
 return d;
}
test('quality gate only qualifies well-documented draft for manual release',()=>{
 const a=assessDraft(draft(),{now:NOW});
 assert.equal(a.eligible,true);
 assert.equal(a.stage,'eligible-for-manual-release');
 assert.match(a.assessment_note,/not a signature/i);
});
test('no review / no disclosure / no sources means blocked',()=>{
 const d=draft();
 d.humanEditorialReview=null;d.disclosure.visible=false;d.sources=d.sources.slice(0,1);
 const a=assessDraft(d,{now:NOW});
 assert.equal(a.eligible,false);
 assert.ok(a.problems.includes('missing-substantive-human-review'));
 assert.ok(a.problems.includes('missing-visible-ai-disclosure'));
 assert.ok(a.problems.includes('insufficient-independent-outlets'));
});
test('copying a long source phrase blocks publication',()=>{
 const d=draft();
 d.sources[0].summary='Jedanaest ili više uzastopnih riječi preuzetih iz izvornika mora se odbiti odmah';
 d.body += ' Jedanaest ili više uzastopnih riječi preuzetih iz izvornika mora se odbiti odmah.';
 const a=assessDraft(d,{now:NOW});
 assert.equal(a.eligible,false);
 assert.ok(a.problems.includes('near-copy-of-source'));
});
test('unlicensed remote image and ungrounded claims block',()=>{
 const d=draft();
 d.imageUrl='https://news.example/image.jpg';
 d.claims[0].evidence=['a','missing'];
 const a=assessDraft(d,{now:NOW});
 assert.equal(a.eligible,false);
 assert.ok(a.problems.includes('image-rights-not-verified'));
 assert.ok(a.problems.includes('claim-without-two-sources'));
});

test('an editorial approval becomes stale after any body or evidence change',()=>{
 const d=draft();
 assert.equal(assessDraft(d,{now:NOW}).eligible,true);
 d.body+=' Značajna nova tvrdnja bez ponovnog pregleda.';
 const result=assessDraft(d,{now:NOW});
 assert.equal(result.eligible,false);
 assert.ok(result.problems.includes('missing-substantive-human-review'));
});
test('RSS-only material can never be promoted to verified original reporting',()=>{
 const d=draft();
 d.substantiveResearchDone=false;
 d.evidence_level='rss-headlines-only-not-fulltext-or-primary-records';
 d.research_gaps=['Treba provjeriti primarni dokument'];
 const result=assessDraft(d,{now:NOW});
 assert.equal(result.eligible,false);
 assert.ok(result.problems.includes('research-unverified'));
});
test('outlets sharing one editorial owner are not independent',()=>{
 const d=draft();
 d.sources[1].editorialGroup='group-a';
 const a=assessDraft(d,{now:NOW});
 assert.equal(a.eligible,false);
 assert.ok(a.problems.includes('insufficient-independent-outlets'));
 assert.ok(a.problems.includes('claim-without-two-sources'));
});
test('missing primary document or source inspection never passes',()=>{
 const d=draft();
 d.sources[0].materialType='full-article';
 d.sources[1].evidenceCheckedAt='';
 const a=assessDraft(d,{now:NOW});
 assert.equal(a.eligible,false);
 assert.ok(a.problems.includes('missing-primary-evidence'));
 assert.ok(a.problems.includes('source-material-not-inspected'));
});

test('24sata, Vecernji and Poslovni are one known Styria ownership group',()=>{
 const owners=['www.24sata.hr','www.vecernji.hr','www.poslovni.hr'].map(ownershipGroupForHost);
 assert.deepEqual(owners.map(o=>o.group),['styria-media-hr','styria-media-hr','styria-media-hr']);
 assert.ok(owners.every(o=>o.verified));
 const mk=(host,i)=>({title:head,url:'https://'+host+'/news/'+i,
   date:'2026-11-13T10:00:00Z',sourceName:host,source:host});
 const two=triage([mk('24sata.hr',1),mk('vecernji.hr',2)],{now:NOW});
 assert.equal(two.length,0,'same-owner media cannot count as independent research corroboration');
 const mixed=triage([mk('24sata.hr',1),mk('vecernji.hr',2),mk('index.hr',3)],{now:NOW});
 assert.equal(mixed.length,1);
 assert.equal(mixed[0].distinct_outlets,3);
 assert.equal(mixed[0].distinct_owner_groups,2);
 assert.equal(mixed[0].ownership_independence,'partially-unverified');
 assert.equal(mixed[0].publishable,false);
});

test('quality gate rejects forged independence of known Styria media brands',()=>{
 const d=draft();
 d.sources[0].url='https://www.24sata.hr/news/1';
 d.sources[1].url='https://www.vecernji.hr/vijesti/2';
 d.sources[0].editorialGroup='pretend-owner-a';
 d.sources[1].editorialGroup='pretend-owner-b';
 d.humanEditorialReview.article_sha256=editorialFingerprint(d);
 const result=assessDraft(d,{now:NOW});
 assert.equal(result.eligible,false);
 assert.ok(result.problems.includes('misstated-editorial-ownership'));
});
