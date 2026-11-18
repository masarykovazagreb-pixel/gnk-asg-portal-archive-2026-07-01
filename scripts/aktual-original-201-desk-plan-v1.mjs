#!/usr/bin/env node
/** Generates audit-only planning report, not articles. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {planCountryDesks} from './lib/aktual-original-desk-v1.mjs';
const config=JSON.parse(readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const cachePath=process.env.AKTUAL_ORIGINAL_TOPIC_CACHE || 'apps/portal/data/aktual-world-headlines-v1.json';
let cache=null;
if (existsSync(cachePath)) {
  try { cache=JSON.parse(readFileSync(cachePath,'utf8')); }
  catch { console.error('Invalid source-lead cache; reporting zero validated topics.'); }
}
const result=planCountryDesks(config,cache);
const file=resolve('artifacts/aktual-original-201-desks.json');
mkdirSync(dirname(file),{recursive:true});
writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({countries:result.countries,plannedDrafts:result.plannedDailyDrafts,
  published:result.published,countriesBelow15Sources:result.countriesBelow15Sources,
  countriesWith15Topics:result.countriesWith15Topics}));
