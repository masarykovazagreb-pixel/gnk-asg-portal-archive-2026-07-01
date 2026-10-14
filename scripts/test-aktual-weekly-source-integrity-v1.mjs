#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const seed=JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly-curation.json','utf8'));
const issue=JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly.json','utf8'));

assert.equal(issue.issue_week,seed.issue_week,'weekly issue must match the current curated week');
assert.ok(Array.isArray(seed.items)&&seed.items.length>=8,'curation seed must contain at least eight sourced items');
assert.ok(Array.isArray(issue.sections)&&issue.sections.length>=1,'weekly issue must contain sections');

const stories=issue.sections.flatMap(section=>
  section.items.map(item=>({...item,section:section.id}))
);
assert.equal(issue.counts?.selected_items,stories.length,'selected_items must equal rendered weekly stories');

const keyOf=item=>item.section+'|'+item.title;
const seedMap=new Map(seed.items.map(item=>[keyOf(item),item]));
assert.equal(seedMap.size,seed.items.length,'curation seed keys must be unique');

const cover={...issue.cover,section:issue.cover.category};
const coverOriginal=seedMap.get(keyOf(cover));
assert.ok(coverOriginal,'weekly cover must exist in curation seed: '+cover.title);
for(const field of ['url','source','published_at','image','imageAlt','image_credit']){
  assert.equal(cover[field],coverOriginal[field],cover.title+': cover '+field+' must match curation seed');
}
assert.match(cover.url,/^https:\/\//,'cover source URL must be absolute HTTPS');

const urls=new Set();
for(const story of stories){
  const original=seedMap.get(keyOf(story));
  assert.ok(original,'published story must exist in curation seed: '+story.title);
  for(const field of ['url','source','published_at','image','imageAlt','image_credit']){
    assert.equal(story[field],original[field],story.title+': '+field+' must match curation seed');
  }
  assert.match(story.url,/^https:\/\//,'source URL must be absolute HTTPS: '+story.title);
  assert.ok(!urls.has(story.url),'duplicate weekly story source URL: '+story.url);
  urls.add(story.url);
}
assert.ok(stories.some(story=>keyOf(story)===keyOf(cover)),'cover must promote one of the selected weekly stories');
const uniqueImages=new Set(stories.map(story=>story.image));
assert.ok(uniqueImages.size>=Math.ceil(stories.length*0.8),'weekly story images must be sufficiently diverse');
for(const story of stories){
  assert.match(story.image,/^\/assets\//,'weekly story image must be a local editorial asset: '+story.title);
  assert.equal(story.image_credit,'Ilustracija: GNK ASG','local weekly art must carry GNK ASG image credit');
}
console.log(JSON.stringify({ok:true,issue_week:issue.issue_week,stories:stories.length,cover:issue.cover.title,sources:urls.size},null,2));
