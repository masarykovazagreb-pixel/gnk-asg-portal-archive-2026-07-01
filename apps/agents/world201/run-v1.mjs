#!/usr/bin/env node
// JSON briefing only. It never fetches, publishes, changes source files or grants approval.
import fs from 'node:fs';
import {masterAgent} from './coordinator-v1.mjs';
const data=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const readArg=(name)=>{const at=process.argv.indexOf(name);if(at<0)return null;const value=process.argv[at+1];if(!value||value.startsWith('--'))throw Error(`Missing value: ${name}`);return value;};
const file=readArg('--cache')||process.env.AKTUAL_WORLD_CACHE_OUT||'apps/portal/data/aktual-world-headlines-v1.json';
const slug=readArg('--country');
const cache=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
console.log(JSON.stringify(masterAgent(data,cache,{slug}),null,2));
