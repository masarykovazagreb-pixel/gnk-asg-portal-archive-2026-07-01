import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {writeRoundups,renderPreview} from '../apps/agents/world201/writer-v1.mjs';
import {killSwitchState} from '../apps/agents/lib/policy-v1.mjs';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const now=Date.parse('2026-01-10T12:00:00Z'), slug=registry.countries[0].slug;
const row={title:'<script>alert(1)</script> & "title"',source:'Publisher <x>',url:'https://publisher.org/news?a=1&b=2',publishedAt:'2026-01-10T11:00:00Z',body:'SECRET_ARTICLE_BODY'};
const cache={scopeUpdatedAt:{countries:{[slug]:'2026-01-10T11:50:00Z'}},countries:{[slug]:[row,{...row,title:'bad',url:'javascript:alert(1)'}]}};
test('writes bilingual attributed source roundups only from fresh safe leads',()=>{
 const result=writeRoundups(registry,cache,{now});assert.equal(result.countriesConsidered,201);assert.equal(result.countriesWithDrafts,1);assert.equal(result.automaticPublication,false);assert.equal(result.published,false);
 const draft=result.drafts[0];assert.equal(draft.state,'review-required');assert.equal(draft.leads.length,1);assert.equal(draft.leads[0].title,row.title);assert.ok(draft.hr.paragraphs.length&&draft.en.paragraphs.length);
 assert.ok(!JSON.stringify(result).includes('SECRET_ARTICLE_BODY'));
 const old=writeRoundups(registry,cache,{now:now+48*3600000});assert.equal(old.drafts.length,0);
 assert.equal(writeRoundups(registry,null,{now}).drafts.length,0);
 assert.throws(()=>writeRoundups(registry,cache,{now,slug:'not-a-country'}));
});
test('preview is noindex, escapes untrusted fields and refuses unsafe hrefs',()=>{
 const result=writeRoundups(registry,cache,{now,slug});const html=renderPreview(result);
 assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/a=1&amp;b=2/);assert.match(html,/review before publication/);assert.match(html,/lang="hr"/);assert.match(html,/lang="en"/);
 result.drafts[0].leads[0].url='javascript:alert(1)';assert.throws(()=>renderPreview(result),/Invalid preview leads/);
});
test('CLI produces scoped HTML without writing to the portal and rejects invalid options',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-writer-'));
 try{
  const file=path.join(tmp,'cache.json'),time=new Date(Date.now()-5000).toISOString();
  fs.writeFileSync(file,JSON.stringify({scopeUpdatedAt:{countries:{[slug]:time}},countries:{[slug]:[{...row,publishedAt:time}]}}));
  const run=spawnSync(process.execPath,['apps/agents/world201/writer-run-v1.mjs','--cache',file,'--country',slug,'--format','html'],{encoding:'utf8'});
  if(killSwitchState().enabled){assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/Interni pregled nacrta/);assert.match(run.stdout,/&lt;script&gt;/);}else{assert.equal(run.status,2);assert.equal(run.stdout,'');}
  assert.deepEqual(fs.readdirSync(tmp),['cache.json']);
  const bad=spawnSync(process.execPath,['apps/agents/world201/writer-run-v1.mjs','--publish'],{encoding:'utf8'});assert.notEqual(bad.status,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('writer CLI fails closed when editorial switch is missing, disabled or corrupt',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-switch-'));
 try{
  for(const file of ['apps/agents/world201/writer-run-v1.mjs','apps/agents/world201/writer-v1.mjs','apps/agents/world201/coordinator-v1.mjs','apps/agents/lib/policy-v1.mjs','scripts/lib/aktual-world-feed-http-v1.mjs','scripts/lib/aktual-world-selection-v1.mjs']){
   const dst=path.join(tmp,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(file,dst);
  }
  fs.mkdirSync(path.join(tmp,'ops'));
  const sw=path.join(tmp,'ops/agent-editorial-kill-switch.json');
  for(const content of [null,'{"enabled":false}','invalid']){
   if(content!==null)fs.writeFileSync(sw,content);
   const run=spawnSync(process.execPath,[path.join(tmp,'apps/agents/world201/writer-run-v1.mjs')],{cwd:tmp,encoding:'utf8'});
   assert.equal(run.status,2);assert.equal(run.stdout,'');assert.match(run.stderr,/paused/);
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
