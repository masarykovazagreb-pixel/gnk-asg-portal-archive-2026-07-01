// Run after the existing safe RSS collector, using its per-country timestamps.
// Does not publish original articles or claim that a feed's configured language is verified.
import {readFile} from "node:fs/promises";
import {countries} from "../src/world-registry.mjs";
const input=process.argv[2];if(!input)throw Error("Pass the collector's JSON cache path");
const cache=JSON.parse(await readFile(input,"utf8"));
const origin=new URL(process.env.FAST_NEWS_DEV_ORIGIN||"");
if(origin.protocol!=="https:"||origin.pathname!=="/"||origin.username||origin.password||origin.search||origin.hash)throw Error("Invalid authorized DEV origin");
const token=process.env.FAST_NEWS_PUBLISH_TOKEN;if(!token)throw Error("Missing authorized publisher token");
let ok=0,failed=0,skipped=0;
for(const c of countries){
 const stamp=cache.scopeUpdatedAt?.countries?.[c.slug];
 if(!stamp||Date.now()-Date.parse(stamp)>6*3600000){skipped++;continue}
 const items=cache.countries?.[c.slug]||[];
 const checks=(cache.sourceChecks||[]).filter(x=>x.kind==="country"&&x.scope===c.slug);
 const complete=checks.length>0&&!checks.some(x=>x.status==="failed");
 if(!items.length&&!complete){skipped++;continue}
 try{const res=await fetch(new URL("/api/world/snapshot",origin),{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({country:c.slug,updatedAt:stamp,items:items.slice(0,100),complete}),redirect:"error",signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error("HTTP "+res.status);const result=await res.json();if(result.status!=="accepted"||result.country!==c.slug)throw Error("Unconfirmed receipt");ok++}catch{failed++}
}
console.log(JSON.stringify({acceptedSnapshots:ok,failedSnapshots:failed,skippedSnapshots:skipped,originalArticlesPublished:0}));if(failed)process.exitCode=1;
