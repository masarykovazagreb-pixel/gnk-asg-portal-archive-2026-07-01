#!/usr/bin/env node
// Writes JSON to stdout only. Does not fetch, publish or grant approval.
import fs from 'node:fs';
import {runFleet} from './fleet-v1.mjs';
const args=process.argv.slice(2), opts={};
for(let i=0;i<args.length;i++){
 const name=args[i];
 if(!['--cache','--country'].includes(name)||opts[name]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Invalid argument: ${name}`);
 opts[name]=args[++i];
}
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const file=opts['--cache']||process.env.AKTUAL_WORLD_CACHE_OUT||'apps/portal/data/aktual-world-headlines-v1.json';
const cache=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
console.log(JSON.stringify(runFleet(registry,cache,{slug:opts['--country']||null}),null,2));
