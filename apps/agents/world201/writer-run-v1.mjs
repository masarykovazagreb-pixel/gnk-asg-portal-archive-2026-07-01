#!/usr/bin/env node
// JSON or HTML preview on stdout. No public files or publish actions.
import fs from 'node:fs';
import {killSwitchState} from '../lib/policy-v1.mjs';
import {writeRoundups,renderPreview} from './writer-v1.mjs';
const args=process.argv.slice(2), opts={};
for(let i=0;i<args.length;i++){
 const key=args[i];
 if(!['--cache','--country','--format'].includes(key)||opts[key]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error(`Invalid argument: ${key}`);
 opts[key]=args[++i];
}
const format=opts['--format']||'json';if(!['json','html'].includes(format))throw Error('Invalid format');
const state=killSwitchState();if(!state.enabled){console.error(`Editorial workflow paused: ${state.reason}`);process.exit(2);}
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const file=opts['--cache']||process.env.AKTUAL_WORLD_CACHE_OUT||'apps/portal/data/aktual-world-headlines-v1.json';
const cache=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const result=writeRoundups(registry,cache,{slug:opts['--country']||null});
process.stdout.write(format==='html'?renderPreview(result):JSON.stringify(result,null,2)+'\n');
