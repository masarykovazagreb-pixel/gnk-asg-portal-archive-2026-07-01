#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root='apps/portal';
const reg=JSON.parse(fs.readFileSync(root+'/data/world-countries-v1.json','utf8'));
assert.equal(reg.countries.length,201);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world201-editor-'));
try {
 const output=path.join(tmp,'agents.json');
 const cache=path.join(tmp,'headlines.json');
 const now=new Date().toISOString();
 const source=(name,host)=>({title:name+' independently sourced public bulletin and associated context',url:'https://'+host+'/source/example',source:name,publishedAt:now});
 fs.writeFileSync(cache,JSON.stringify({countries:{hrvatska:[source('Source A','example.org'),source('Source B','example.net'),source('Google News','news.google.com')]},cities:{zagreb:[source('Source Zagreb','example.com')]}},null,2));
 const run=spawnSync(process.execPath,['scripts/world201-edition-agent-plan-v1.mjs'],{encoding:'utf8',env:{...process.env,WORLD201_SOURCE_CACHE:cache,WORLD201_AGENTS_OUT:output}});
 assert.equal(run.status,0,run.stderr);
 const j=JSON.parse(fs.readFileSync(output,'utf8'));
 assert.equal(j.countries,201);
 assert.equal(j.agents.length,201);
 assert.equal(new Set(j.agents.map(x=>x.agentId)).size,201);
 assert.equal(j.topicChoicesPerEdition,20);
 assert.equal(j.countryOriginalStoryTargetDaily,5);
 assert.equal(j.zagrebDailyStoryTarget,25);
 assert.equal(j.zagrebPriorityMultiplier,5);
 assert.equal(j.zagreb.priority,5);
 assert.equal(j.totalDailyArticleTarget,1030);
 assert.equal(j.executingLLMWorkers,0);
 assert.equal(j.realOriginalArticlesPublishedByThisPlanner,0);
 assert.equal(j.agents.find(x=>x.edition==='hrvatska').candidateCount,2);
 assert.equal(j.zagreb.candidateCount,1);
 assert.ok(j.agents.every(x=>x.approvedOriginalArticles===0&&x.dailyOriginalArticleTarget===5));
 assert.ok(j.agents.every(x=>x.tasks.every(t=>t.originalBody===null&&t.approved===false&&t.publish===false)));
 console.log(JSON.stringify({ok:true,editions:201,virtualAgents:201,zagrebMultiplier:5,publishedArticles:0,sourceOnly:true}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
