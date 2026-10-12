#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const seed=JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly-curation.json','utf8'));
const issue=JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly.json','utf8'));
assert.equal(issue.issue_week,seed.issue_week,'Weekly issue must match current curated week');
const stories=issue.sections.flatMap(s=>s.items.map(x=>({...x,section:s.id})));
assert.ok(stories.length>=8,'At least eight curated stories required');
assert.ok(issue.sections.some(s=>s.id==='kultura'&&s.items.length),'Culture section must contain a sourced story');
const sourceMap=new Map(seed.items.map(x=>[x.section+'|'+x.title,x]));
for(const story of stories){
 const original=sourceMap.get(story.section+'|'+story.title);
 assert.ok(original,'Published story must exist in the current curation seed: '+story.title);
 assert.equal(story.url,original.url,'Published URL must match source seed exactly: '+story.title);
 assert.equal(story.source,original.source,'Published source must match curation: '+story.title);
 assert.equal(story.published_at,original.published_at,'Do not invent publication dates: '+story.title);
 const u=new URL(story.url);
 assert.equal(u.protocol,'https:','Only HTTPS original sources allowed');
 assert.ok(u.pathname.length>5,'A specific article URL is required');
}
assert.equal(issue.counts.selected_items,stories.length);
assert.equal(issue.counts.sections,issue.sections.length);
assert.equal(issue.counts.sources,new Set(stories.map(x=>x.source)).size);
console.log(JSON.stringify({ok:true,issue:issue.issue_week,stories:stories.length,sections:issue.sections.length,sources:issue.counts.sources},null,2));
