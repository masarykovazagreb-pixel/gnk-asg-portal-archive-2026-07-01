import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateLead,parseResponse,makeDraft,runDrafts} from './original-draft-agent-v1.mjs';
const now=Date.parse('2026-11-13T12:00:00Z');
const lead={
 id:'am-zagreb-aabbcc',kind:'research_lead',status:'research_required',publishable:false,
 title_hint:'Porezna reforma prikazana u hrvatskim medijima',
 sources:[
  {outlet:'Prvi',title:'Dva medija izvijestila o mogućem prijedlogu reforme',url:'https://prvi.example.hr/vijest/1',published_at:'2026-11-13T09:00:00Z'},
  {outlet:'Drugi',title:'Dva medija navode da se razmatra reforma',url:'https://drugi.example.hr/vijest/2',published_at:'2026-11-13T08:00:00Z'}
 ]
};
const claims=[
 {text:'Dva medija objavila su naslove o mogućoj reformi',evidence:['s1','s2']},
 {text:'Objavljeni naslovi otvaraju potrebu provjere izvornika',evidence:['s1','s2']}
];
const body=Array.from({length:50},(_,i)=>'Urednička analiza '+i+' razmatra što se može zaključiti iz samih naslova, a što ostaje otvoreno za provjeru u primarnim dokumentima.').join(' ');
const response={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({
 title:'Kako hrvatski mediji pristupaju temi mogući poreznih promjena',
 dek:'Analiza objavljenih naslova, bez predstavljanja tvrdnji kao utvrđenih činjenica.',
 body,claims,research_gaps:['Pribaviti izvornu službenu dokumentaciju']
})}]}]};
test('rejects single outlet, unsafe URL, future dated and publishable leads',()=>{
 assert.equal(validateLead(lead,now).length,2);
 assert.throws(()=>validateLead({...lead,publishable:true},now),/not-an-unpublished-lead/);
 assert.throws(()=>validateLead({...lead,sources:[lead.sources[0],{...lead.sources[1],url:lead.sources[0].url}]},now),/insufficient-outlets/);
 assert.throws(()=>validateLead({...lead,sources:[{...lead.sources[0],url:'http://prvi.example.hr'},lead.sources[1]]},now),/invalid-source-url/);
 assert.throws(()=>validateLead({...lead,sources:[{...lead.sources[0],published_at:'2026-12-01T00:00:00Z'},lead.sources[1]]},now),/invalid-source-date/);
});
test('refuses incomplete, refusal and ambiguous model responses',()=>{
 assert.throws(()=>parseResponse({...response,status:'incomplete'}),/incomplete-response/);
 assert.throws(()=>parseResponse({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'blocked'}]}]}),/model-refusal/);
 assert.throws(()=>parseResponse({status:'completed',output:[]}),/missing-or-ambiguous-output/);
});
test('uses structured responses without storage and creates blocked private draft',async()=>{
 let called=0;
 const transport=async(url,opts)=>{
  called++;
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(opts.headers.authorization,'Bearer test-token');
  const req=JSON.parse(opts.body);
  assert.equal(req.store,false);
  assert.equal(req.text.format.type,'json_schema');
  assert.equal(req.text.format.strict,true);
  assert.ok(!opts.body.includes('API_SECRET_SHOULD_NOT_LEAK'));
  return {ok:true,json:async()=>response};
 };
 const result=await makeDraft(lead,{apiKey:'test-token',model:'gpt-6-astra',now,transport});
 assert.equal(called,1);
 assert.equal(result.candidate.status,'draft');
 assert.equal(result.candidate.publication_enabled,false);
 assert.equal(result.prepublication_gate.eligible,false);
 assert.ok(result.prepublication_gate.problems.includes('missing-substantive-human-review'));
 assert.ok(result.prepublication_gate.problems.includes('privacy-rights-screen-missing'));
 assert.equal(result.candidate.research_gaps.length,1);
});
test('no secret means no model call and no files',async()=>{
 const result=await runDrafts({apiKey:'',input:'does-not-exist',outDir:'also-does-not-exist',transport:()=>{throw Error('network not allowed')}});
 assert.equal(result.generated,0);
 assert.equal(result.status,'disabled');
});
test('at most one draft, idempotent same candidate; never publishes',async()=>{
 const base=mkdtempSync(join(tmpdir(),'aktual-original-'));
 try{
  const queueFile=join(base,'queue.json'),dir=join(base,'drafts');
  writeFileSync(queueFile,JSON.stringify({
   publication_enabled:false,totals:{publishable:0},
   channels:[{channel:'zagreb',leads:[lead,lead]}]
  }));
  const transport=async()=>({ok:true,json:async()=>response});
  const first=await runDrafts({apiKey:'test-key',input:queueFile,outDir:dir,now,transport,limit:1});
  assert.equal(first.generated,1);
  assert.equal(readdirSync(dir).length,1);
  const second=await runDrafts({apiKey:'test-key',input:queueFile,outDir:dir,now,transport,limit:1});
  assert.equal(second.outputs[0].status,'already-present');
  const saved=JSON.parse(readFileSync(join(dir,readdirSync(dir)[0]),'utf8'));
  assert.equal(saved.publication,false);
  assert.equal(saved.candidate.publication_enabled,false);
  assert.equal(saved.prepublication_gate.eligible,false);
  await assert.rejects(runDrafts({apiKey:'test-key',input:queueFile,outDir:dir,now,limit:3}),/invalid-run-config/);
 }finally{rmSync(base,{recursive:true,force:true})}
});
