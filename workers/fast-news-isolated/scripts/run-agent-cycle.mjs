// Execute WORLD coordinator with an explicit degraded collection mode when publishing is unavailable.
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isAbsolute} from 'node:path';
const registry=JSON.parse(await readFile(new URL('../agents/registry.json',import.meta.url),'utf8'));
const desks=registry.agents.filter(a=>a.kind==='country');
const shared=registry.agents.filter(a=>a.kind==='shared');
if(desks.length!==201||shared.length!==24||registry.agents.length!==225||new Set(registry.agents.map(a=>a.id)).size!==225)throw Error('Invalid registry');
const authorized=Boolean(process.env.FAST_NEWS_PUBLISH_TOKEN)&&process.env.FAST_NEWS_DEV_ORIGIN==='https://dev.gnk-asg.hr';
const cache=process.env.FAST_NEWS_WORLD_CACHE_PATH||'';
if(!authorized&&!isAbsolute(cache))throw Error('Publisher unavailable; configure an absolute private cache path for collection-only recovery');
const mode=authorized?'sync':'collect-only';
const started=new Date().toISOString();
const args=[fileURLToPath(new URL('./hourly-world.mjs',import.meta.url)),...(!authorized?['--collect-only']:[])];
const result=spawnSync(process.execPath,args,{stdio:'inherit',timeout:23*60*1000});
console.log(JSON.stringify({started,finished:new Date().toISOString(),mode,configuredDesks:desks.length,configuredShared:shared.length,coordinatorExit:result.status,coordinatorCompleted:result.status===0&&!result.error,publicationBlocked:!authorized,individualAgentExecutionVerified:false,publicVerification:false}));
if(result.error)throw result.error;
process.exitCode=result.status===0?0:1;
