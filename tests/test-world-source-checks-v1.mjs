import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('refresh records failed and no-eligible feeds separately without network',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-source-checks-'));
 try {
  const mock=path.join(tmp,'mock.mjs'),output=path.join(tmp,'cache.json');
  fs.writeFileSync(mock,`globalThis.fetch=async url=>{if(url.includes('topic=SPORT'))throw Error('offline');const xml=url.includes('rtvslo.si')?'<rss><channel></channel></rss>':('<rss><channel><item><title>Valid title</title><link>https://example.com/story</link><pubDate>'+new Date().toUTCString()+'</pubDate></item></channel></rss>');return {ok:true,headers:{get:()=>null},text:async()=>xml};};`);
  const run=spawnSync(process.execPath,['--import',mock,'scripts/refresh-aktual-world-headlines-v1.mjs'],{env:{...process.env,AKTUAL_COUNTRY_LIMIT:'1',AKTUAL_FEEDS_PER_COUNTRY:'3',AKTUAL_WORLD_CACHE_OUT:output},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(fs.readFileSync(output,'utf8'));const checks=result.sourceChecks.filter(c=>c.kind==='country'&&c.scope==='slovenija');
  assert.equal(checks.length,3);assert.deepEqual(checks.map(c=>c.status).sort(),['failed','headlines','no-eligible-headlines']);assert.equal(result.feedFailures,1);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
