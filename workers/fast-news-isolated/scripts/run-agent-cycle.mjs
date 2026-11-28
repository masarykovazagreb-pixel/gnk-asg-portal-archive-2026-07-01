// Execute the existing authorized WORLD coordinator; report actual outcomes, never simulated agent success.
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const registry=JSON.parse(await readFile(new URL('../agents/registry.json',import.meta.url),'utf8'));
const desks=registry.agents.filter(a=>a.kind==='country');
if(desks.length!==201||new Set(registry.agents.map(a=>a.id)).size!==225)throw Error('Invalid registry');
if(!process.env.FAST_NEWS_PUBLISH_TOKEN||process.env.FAST_NEWS_DEV_ORIGIN!=='https://dev.gnk-asg.hr')throw Error('Authorized isolated publisher required');
const started=new Date().toISOString();
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./hourly-world.mjs',import.meta.url))],{stdio:'inherit',timeout:23*60*1000});
console.log(JSON.stringify({started,finished:new Date().toISOString(),configuredDesks:desks.length,configuredShared:24,coordinatorExit:result.status,individualAgentExecutionVerified:false,publicVerification:false}));
if(result.error)throw result.error;
process.exitCode=result.status===0?0:1;
