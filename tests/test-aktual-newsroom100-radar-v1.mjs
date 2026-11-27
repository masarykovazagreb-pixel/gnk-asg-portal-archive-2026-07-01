import assert from "node:assert/strict";
import {rankCandidates} from "../scripts/aktual-newsroom100-radar-v1.mjs";
const now=new Date("2026-11-25T09:00:00Z");
const data=[];
for(let i=0;i<140;i++){
  data.push({
    title:"Economic policy briefing on sector"+i+" market"+i+" outlook"+i+" has independent coverage",
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

// Freshness and safety regressions: old/future duplicates cannot shadow valid candidates.
const priorityFixtures=[
 {title:"Zagreb potres i prometna sigurnost: nove informacije javnih službi",url:"https://www.hrt.hr/vijest?utm_source=test&id=1",publishedAt:"2026-11-26T05:00:00Z"},
 {title:"Zagreb potres i prometna sigurnost: nove informacije javnih službi",url:"https://www.hrt.hr/vijest?id=1",publishedAt:"2026-11-25T08:00:00Z"},
 {title:"A distinct global business report for technology investors",url:"https://other.example.net/report",publishedAt:"2026-11-25T08:00:00Z"},
 {title:"Credential link must never enter the newsroom research queue",url:"https://user:password@example.net/report",publishedAt:"2026-11-25T08:00:00Z"},
 {title:"Another headline for a private address is not a public source",url:"https://127.0.0.1/report",publishedAt:"2026-11-25T08:00:00Z"},
 {title:"A different story identified by its query parameter",url:"https://www.hrt.hr/vijest?id=2",publishedAt:"2026-11-25T08:00:00Z"}
];
const ranked=rankCandidates(priorityFixtures,{now,limit:8});
assert.equal(ranked.candidateCount,3);
assert.equal(ranked.candidates[0].sourceUrl,"https://www.hrt.hr/vijest?id=1");
assert.equal(ranked.candidates[0].localPriorityHint,true);
assert.ok(ranked.candidates.every(x=>x.publicationState==="research-brief-only"));
