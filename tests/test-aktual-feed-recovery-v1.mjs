import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderPage} from '../scripts/render-aktual-noscript-v1.mjs';

const code=fs.readFileSync('apps/portal/assets/aktual-media-world-v1.js','utf8');
async function run(lang,replies){
 const nodes=Object.fromEntries(['amLead','amFeedStatus','amEditionDate','amBreakingTrack','amLatestList','amGroups','amSectionNav'].map(id=>[id,{innerHTML:'',textContent:'',dataset:{}}]));
 let boot;const calls=[];
 const document={documentElement:{lang},body:{dataset:{aktualView:'home'}},readyState:'loading',getElementById:id=>nodes[id]||null,addEventListener:(event,fn)=>{if(event==='DOMContentLoaded')boot=fn;}};
 const fetch=async (url,options)=>{calls.push({url,options});const r=replies.shift();if(r instanceof Error)throw r;return r||{ok:false};};
 const context={document,fetch,URL,Date,Intl,AbortController,console:{warn(){},error(){}},setTimeout:(fn,ms)=>{if(ms<8000)fn();return 1},clearTimeout:()=>{}};
 vm.runInNewContext(code,context);assert.equal(typeof boot,'function');await boot();return {nodes,calls};
}
const item=(overrides={})=>({title:'Original report',source:'Example News',url:'https://example.org/news',published_at:new Date(Date.now()-60000).toISOString(),verified:true,...overrides});
const ok=data=>({ok:true,json:async()=>data});
test('retries network and invalid JSON, shows sourced news without requiring an image',async()=>{
 for(const first of [new Error('network down'),{ok:true,json:async()=>{throw Error('invalid JSON')}}]){
  const {nodes,calls}=await run('hr',[first,ok([item()])]);
  assert.equal(calls.length,2);assert.match(calls[1].url,/^\/data\/news\.json\?v=/);
  assert.match(nodes.amLead.innerHTML,/Original report/);assert.match(nodes.amLead.innerHTML,/https:\/\/example.org\/news/);
  assert.match(nodes.amLead.innerHTML,/class="am-plate"/);assert.match(nodes.amFeedStatus.textContent,/1 stavki/);
  assert.match(nodes.amSectionNav.innerHTML,/country=hrvatska/);
 }
});
test('rejects unsafe, unsourced, undated, unverified and future headlines',async()=>{
 const input=[item({title:'unsafe',url:'javascript:alert(1)'}),item({title:'no source',source:''}),item({title:'future',published_at:new Date(Date.now()+86400000).toISOString()}),item({title:'undated',published_at:'nonsense'}),item({title:'unverified',verified:false}),item({title:'safe headline'})];
 const {nodes}=await run('en',[ok(input)]);assert.match(nodes.amLead.innerHTML,/safe headline/);
 for(const text of ['unsafe','no source','future','undated','unverified'])assert.doesNotMatch(nodes.amLead.innerHTML,new RegExp(text));
 assert.equal(nodes.amFeedStatus.textContent.includes('1 stories'),true);
});
test('empty or unavailable feed gives explicit alternatives instead of blank space',async()=>{
 for(const lang of ['hr','en']){
  const {nodes,calls}=await run(lang,[{ok:false},{ok:false}]);assert.equal(calls.length,2);
  assert.match(nodes.amLead.innerHTML,/\/gnk-aktual\/media\/hrvatska\//);
  assert.match(nodes.amLead.innerHTML,/https:\/\/j1hex9qg03f0-d\.space-z\.ai\/\?country=hrvatska/);
  assert.match(nodes.amFeedStatus.textContent,lang==='hr'?/nema dostupnih naslova/:/No headlines/);
 }
});
test('old feeds disclose age rather than claiming freshness',async()=>{
 const {nodes}=await run('hr',[ok([item({published_at:new Date(Date.now()-72*3600000).toISOString()})])]);
 assert.match(nodes.amFeedStatus.textContent,/stariji od 48 sati/);
});
test('snapshot renderer does not accumulate whitespace across repeated builds',()=>{
 const shell='<!doctype html><html><head></head><body><section class="am-breaking"></section></body></html>';
 const news=[item(),item({title:'Second'}),item({title:'Third'})];
 for(const lang of ['hr','en']){const first=renderPage(shell,news,lang);assert.equal(renderPage(first,news,lang),first);}
});
