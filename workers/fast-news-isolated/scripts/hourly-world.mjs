// Run from the existing authorized scheduler. A collection-only cycle needs no publisher token.
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../../../",import.meta.url));
const collectOnly=process.argv[2]==="--collect-only";
const persistent=process.env.FAST_NEWS_WORLD_CACHE_PATH||"";
if(process.argv.length>2&&!collectOnly)throw Error("Unsupported argument");
if(persistent&&!isAbsolute(persistent))throw Error("Cache path must be absolute");
if(collectOnly&&!persistent)throw Error("Collection-only mode requires a persistent cache path");
const dir=mkdtempSync(join(tmpdir(),"fast-news-world-"));
const cache=persistent||join(dir,"headlines.json");
try{
 const collectorEnv={...process.env,AKTUAL_WORLD_CACHE_OUT:cache,AKTUAL_WORLD_RUN_REPORT:join(dir,"report.json"),AKTUAL_FEEDS_PER_COUNTRY:"30",AKTUAL_ITEMS_PER_COUNTRY:"100",AKTUAL_FETCH_CONCURRENCY:"12"};
 delete collectorEnv.FAST_NEWS_PUBLISH_TOKEN;
 delete collectorEnv.FAST_NEWS_DEV_ORIGIN;
 execFileSync(process.execPath,["scripts/refresh-aktual-world-headlines-v1.mjs"],{cwd:root,env:collectorEnv,stdio:"inherit",timeout:12*60*1000});
 if(collectOnly){console.log(JSON.stringify({status:"collected-only",publicationVerified:false}));}
 else{
  if(process.env.FAST_NEWS_DEV_ORIGIN!=="https://dev.gnk-asg.hr"||!process.env.FAST_NEWS_PUBLISH_TOKEN)throw Error("Authorized isolated publisher required; use collection-only with persistent cache to continue collecting");
  execFileSync(process.execPath,[fileURLToPath(new URL("./sync-world.mjs",import.meta.url)),cache],{cwd:root,stdio:"inherit",timeout:10*60*1000});
 }
}finally{rmSync(dir,{recursive:true,force:true})}
