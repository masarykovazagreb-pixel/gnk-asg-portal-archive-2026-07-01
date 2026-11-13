import test from 'node:test';
import assert from 'node:assert/strict';
import { triage, buildQueue } from './triage-v1.mjs';
import { assessDraft } from './article-quality-gate-v1.mjs';
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
 return {
  status:'draft', title:'Autorska analiza promjene poreznih pravila u regionalnom gospodarstvu',
  body, aiAssisted:true,
  disclosure:{visible:true,text:'Tekst je pripremljen uz AI i sadržajno pregledan.'},
  sources:[
   {id:'a',url:'https://medij-a.hr/vijest/1',published_at:'2026-11-13T08:00:00Z',title:head,summary:'Vlada je iznijela prijedlog'},
   {id:'b',url:'https://medij-b.hr/vijest/2',published_at:'2026-11-13T09:00:00Z',title:'Porezni zakon',summary:'O prijedlogu se raspravlja'}
  ],
  claims:[
   {text:'Prvi relevantni nalaz zahtijeva provjeru',evidence:['a','b']},
   {text:'Drugi relevantni nalaz zahtijeva kontekst',evidence:['a','b']}
  ],
  humanEditorialReview:{substantive:true,reviewer:'Odgovorni urednik',approvedAt:'2026-11-13T11:00:00Z',editorialResponsibilityAccepted:true},
  privacyAndRightsReviewed:true,
  correctionsUrl:'https://gnk-asg.hr/gnk-aktual/metodologija/'
 };
}
test('quality gate only qualifies well-documented draft for manual release',()=>{
 const a=assessDraft(draft(),{now:NOW});
 assert.equal(a.eligible,true);
 assert.equal(a.stage,'eligible-for-manual-release');
 assert.ok(a.assessment_note.includes('not proved'));
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
