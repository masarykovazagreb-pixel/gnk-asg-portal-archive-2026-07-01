import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeMedia,approvedObject,imagePage,imageAsset} from "../src/media.mjs";
import {worldPage,worldSitemap} from "../src/world.mjs";
import {checkReady} from "../scripts/editorial-gate.mjs";
const sha="a".repeat(64);
const fixture={key:"approved/"+sha+".jpg",sha256:sha,mime:"image/jpeg",width:2400,height:1600,credit:"Test",license:"owned",alt:"Test",caption:"Test",rightsVerified:true};
test("media rights, resolution and approved object",async()=>{
 const media=normalizeMedia(fixture);
 assert.equal(imagePage("primjer"),"/slika/primjer/");
 assert.equal(imageAsset("primjer",media),"/slika/primjer/foto");
 for(const [field,value] of [["rightsVerified",false],["width",900],["mime","image/svg+xml"]])assert.throws(()=>normalizeMedia({...fixture,[field]:value}));
 const object={size:2000,httpMetadata:{contentType:"image/jpeg"},customMetadata:{sha256:sha,rightsApproved:"true",width:"2400",height:"1600"}};
 assert.equal(await approvedObject({head:async()=>object},media),object);
 await assert.rejects(()=>approvedObject({head:async()=>({...object,customMetadata:{}})},media));
});
test("Croatian section routes and sitemap",async()=>{
 const sample={slug:"primjer",title:"Testni naslov",published_at:"2026-11-27T12:00:00Z",payload:JSON.stringify({media:null})};
 const db={prepare(sql){return{bind(){return{all:async()=>({results:sql.includes("fast_news_articles")?[sample]:[]}),first:async()=>null}}}}};
 for(const s of ["politika","gospodarstvo","sport","kronika","zagreb","regije","svijet","tehnologija","kultura","zdravlje","zivot","zabava","znanost","turizam"]){
  const path="/world/hrvatska/rubrika/"+s+"/",page=await worldPage(path,"https://example.org",db);
  assert.ok(page.body.includes(path));assert.ok(page.body.includes("/slika/primjer.svg"));assert.ok(worldSitemap("https://example.org").includes(path));
 }
});
test("private editorial evidence required, international independence threshold",()=>{
 const now=Date.parse("2026-11-27T14:00:00Z"),urls=["https://example.org/a","https://example.net/b","https://example.com/c"];
 const evidence={topic:"Fixture",factSummary:"Synthetic fixture to exercise evidence record validation only.",factCheck:"passed",originality:"passed",languageCheck:"passed",international:true,imageDecision:"original-illustration",sources:urls.map((url,i)=>({url,checkedAt:new Date(now).toISOString(),supports:"Synthetic fact evidence for testing only",independenceGroup:"group-"+i}))};
 const a={editorial_verified:true,sources:urls,evidence};
 assert.equal(checkReady(a,now),true);
 assert.throws(()=>checkReady({...a,evidence:{...evidence,sources:evidence.sources.slice(0,2)}},now));
 assert.throws(()=>checkReady({...a,evidence:{...evidence,originality:"failed"}},now));
});
