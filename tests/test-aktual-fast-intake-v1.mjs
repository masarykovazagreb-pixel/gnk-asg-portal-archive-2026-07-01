import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { prepareFastPublication } from "../scripts/aktual-fast-intake-v1.mjs";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"aktual-fast-intake-"));
try{
  fs.mkdirSync(path.join(temp,"content/factory-queue"),{recursive:true});
  fs.writeFileSync(path.join(temp,"content/factory-queue/queue.json"),JSON.stringify({version:"test",items:[],skipped:[]}));
  const env={
    FAST_TITLE:"Jedinstveni izvještaj o energetskom tržištu Hrvatske",
    FAST_SLUG:"energetsko-trziste-probni-clanak",
    FAST_BODY:("Originalan redakcijski izvještaj s provjerenim podacima i analizom javnih brojki. ").repeat(28),
    FAST_SOURCES:"https://example.org/official-data\nhttps://example.net/independent-report",
    FAST_APPROVAL:"OBJAVI",FAST_FACTS_VERIFIED:"true",FAST_ORIGINALITY_VERIFIED:"true"
  };
  const published=prepareFastPublication(env,{root:temp,now:new Date("2026-11-25T08:15:00Z")});
  assert.equal(published.queued,true);
  assert.equal(published.claim,"QUEUED_NOT_YET_LIVE");
  assert.equal(published.sourceCount,2);
  const q=JSON.parse(fs.readFileSync(path.join(temp,"content/factory-queue/queue.json")));
  assert.equal(q.items.length,1);
  const html=fs.readFileSync(path.join(temp,"content/factory-queue/objave/"+env.FAST_SLUG+".html"),"utf8");
  assert.match(html,/<link rel="canonical" href="https:\/\/gnk-asg.hr\/objave\/energetsko-trziste-probni-clanak\/">/);
  assert.match(html,/"@type":"NewsArticle"/);
  assert.match(html,/example\.org/);
  assert.match(html,/article:published_time/);
  assert.ok(fs.existsSync(path.join(temp,"apps/portal/assets/editorial/aktual-fast-"+env.FAST_SLUG+".svg")));
  assert.throws(()=>prepareFastPublication(env,{root:temp}),/već postoji/);
  const noApproval={...env,FAST_SLUG:"test-no-approval",FAST_APPROVAL:""};
  assert.throws(()=>prepareFastPublication(noApproval,{root:temp}),/potvrda urednika/);
  const noSources={...env,FAST_SLUG:"test-one-domain",FAST_SOURCES:"https://example.org/a\nhttps://example.org/b"};
  assert.throws(()=>prepareFastPublication(noSources,{root:temp}),/dvije različite/);
  const badImage={...env,FAST_SLUG:"test-no-photo-rights",FAST_IMAGE_PATH:"/assets/test.jpg"};
  assert.throws(()=>prepareFastPublication(badImage,{root:temp}),/nije prenesena/);
  console.log("AKTUAL FAST PUBLISH: 8 tests passed; NO production write.");
}finally{fs.rmSync(temp,{recursive:true,force:true})}
