// Hourly coordinator, to be invoked only by the existing authorized scheduler.
// RSS collection and snapshot synchronization are separate from original publication.
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../../../",import.meta.url));
const dir=mkdtempSync(join(tmpdir(),"fast-news-world-"));
const cache=join(dir,"headlines.json");
try{
 const collectorEnv={...process.env,AKTUAL_WORLD_CACHE_OUT:cache,AKTUAL_WORLD_RUN_REPORT:join(dir,"report.json"),AKTUAL_FEEDS_PER_COUNTRY:"30",AKTUAL_ITEMS_PER_COUNTRY:"100",AKTUAL_FETCH_CONCURRENCY:"12"};
 delete collectorEnv.FAST_NEWS_PUBLISH_TOKEN;
 delete collectorEnv.FAST_NEWS_DEV_ORIGIN;
 execFileSync(process.execPath,["scripts/refresh-aktual-world-headlines-v1.mjs"],{cwd:root,env:collectorEnv,stdio:"inherit",timeout:12*60*1000});
 execFileSync(process.execPath,[fileURLToPath(new URL("./sync-world.mjs",import.meta.url)),cache],{cwd:root,stdio:"inherit",timeout:10*60*1000});
}finally{rmSync(dir,{recursive:true,force:true})}
