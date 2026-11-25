#!/usr/bin/env node
// Scoped repair: only English country directories from the canonical registry.
// Default is read-only; --write inserts missing tags without replacing layers.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ensureWorldHashtags} from '../apps/shared/aktual-world-hashtags-v1.mjs';
const portal='apps/portal';
const policy=JSON.parse(readFileSync(join(portal,'data/approved_mentions.json'),'utf8'));
if(policy.hashtag_scope!=='all_pages') throw new Error('Hashtag policy does not permit all-pages scope');
const countries=JSON.parse(readFileSync(join(portal,'data/world-countries-v1.json'),'utf8')).countries;
if(countries.length!==201 || new Set(countries.map(c=>c.slug)).size!==201 || countries.some(c=>!/^[-a-z0-9]+$/.test(c.slug))) throw new Error('Invalid country registry');
const pending=[];
for(const c of countries){
 const file=join(portal,'en/gnk-aktual/media',c.slug,'index.html');
 const old=readFileSync(file,'utf8');const updated=ensureWorldHashtags(old);
 if(updated!==old)pending.push({file,updated});
}
const write=process.argv.includes('--write');
if(write)for(const entry of pending)writeFileSync(entry.file,entry.updated);
console.log(JSON.stringify({pages:countries.length,mode:write?'write':'check',changed:pending.length}));
if(!write && pending.length)process.exitCode=1;
