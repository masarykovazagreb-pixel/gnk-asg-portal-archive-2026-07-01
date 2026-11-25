import assert from "node:assert/strict";
import {rankCandidates} from "../scripts/aktual-newsroom100-radar-v1.mjs";
const now=new Date("2026-11-25T09:00:00Z");
const data=[];
for(let i=0;i<140;i++){
  data.push({
    title:"Economic policy briefing topic number "+i+" has independent coverage",
    url:"https://source"+(i%20)+".example.net/report-"+i,
    publishedAt:"2026-11-25T05:00:00Z",source:"Outlet "+(i%20)
  });
}
data.push({title:"Outdated historical news should never be pushed as fresh",url:"https://old.example.net/old",publishedAt:"2022-01-01T00:00:00Z"});
const result=rankCandidates(data,{now,limit:100});
assert.equal(result.candidateCount,100);
assert.equal(result.target,100);
assert.equal(result.notPublished,true);
assert.ok(result.coverageSources>=8);
assert.ok(result.candidates.every(x=>x.factsIndependentlyChecked===false && x.articleWritten===false && x.imageReuseAllowed===false));
assert.ok(result.candidates.every(x=>x.sourceDate.startsWith("2026-11-25")));
assert.equal(rankCandidates(data,{now,limit:8}).candidateCount,8);
assert.throws(()=>rankCandidates({},{now}),/array/);
console.log("NEWSROOM100 RADAR: seven checks passed.");
