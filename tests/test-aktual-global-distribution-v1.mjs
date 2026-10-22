#!/usr/bin/env node
// Offline contract: international distribution is a safe preview unless
// per-run confirmation and repository external-distribution gate both apply.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script='scripts/aktual-global-distribution-v1.mjs';
const manifest=JSON.parse(fs.readFileSync('ops/aktual-global-distribution-v1.json','utf8'));
assert.equal(manifest.existingFour.length,4);
assert(manifest.newChannels.length>=6);
assert(Object.keys(manifest.languages).length>=15);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aktual-global-'));
try{
 const out=path.join(dir,'preview.json');
 const languages=Object.keys(manifest.languages).join(',');
 const platforms=manifest.newChannels.map(x=>x.id).join(',');
 let r=spawnSync(process.execPath,[script,'--platforms',platforms,'--languages',languages,
  '--article','/gnk-aktual/kolumne/tisina-nakon-pitanja/','--out',out],{
  encoding:'utf8',env:{PATH:process.env.PATH,HOME:process.env.HOME}});
 assert.equal(r.status,0,'preview failed '+r.stderr);
 const parsed=JSON.parse(fs.readFileSync(out,'utf8'));
 assert.equal(parsed.entries.length,manifest.newChannels.length*Object.keys(manifest.languages).length);
 assert(parsed.entries.every(x=>x.canonical==='https://gnk-asg.hr/gnk-aktual/kolumne/tisina-nakon-pitanja/'));
 assert(parsed.entries.every(x=>x.text.includes(x.canonical)));
 assert(parsed.entries.every(x=>x.localization.startsWith('intro-only')));
 assert(parsed.entries.every(x=>x.platform==='bluesky'?[...x.text].length<=300:true));
 assert(parsed.entries.every(x=>!x.imageUrl||x.imageUrl.startsWith('https://gnk-asg.hr/assets/')));
 assert(parsed.entries.every(x=>x.editor==='Nermin Sefić'));
 const keys=new Set(parsed.entries.map(x=>x.key));assert.equal(keys.size,parsed.entries.length);
 r=spawnSync(process.execPath,[script,'--platforms','bluesky','--languages','en',
  '--article','/kanal/zagreb/clanak/fake-third-party/','--out',out],{encoding:'utf8'});
 assert.notEqual(r.status,0,'disallowed third-party source must be rejected');
 r=spawnSync(process.execPath,[script,'--live','--platforms','bluesky','--languages','en',
  '--article','/gnk-aktual/kolumne/tisina-nakon-pitanja/'],{
  encoding:'utf8',env:{PATH:process.env.PATH,HOME:process.env.HOME,
   GNK_ASG_EXTERNAL_DISTRIBUTION:'false'}});
 assert.notEqual(r.status,0,'live mode without owner approval must be refused');
 console.log(JSON.stringify({pass:true,platforms:manifest.newChannels.length,
  languages:Object.keys(manifest.languages).length,prepared:parsed.entries.length,
  verified:['no-unapproved-live','canonical','language-localization','editor-not-author','owned-image-url','dedupe-key']}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
