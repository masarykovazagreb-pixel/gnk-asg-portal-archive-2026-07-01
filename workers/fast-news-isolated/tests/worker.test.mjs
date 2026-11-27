import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {handle} from "../src/index.mjs";
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const origin="https://example.org",env={PUBLIC_ORIGIN:origin,PUBLISH_ENABLED:"true",PUBLISH_TOKEN:"fixture-not-a-production-secret"};
const store=new Map();
const DB={prepare(sql){let args=[];return {bind(...a){args=a;return this},async run(){if(sql.startsWith("INSERT")){const [slug,title,description,payload,digest,published_at]=args;if(!store.has(slug))store.set(slug,{slug,title,description,payload,digest,published_at});return{success:true}}throw Error("unknown SQL")},async first(){if(sql.includes("count(*)"))return{n:sql.includes("published_at >= ?")?[...store.values()].filter(x=>x.published_at>=args[0]).length:store.size};return store.get(args[0])??null},async all(){const [cutoff,limit,offset]=args;return{results:[...store.values()].filter(x=>x.published_at>=cutoff).sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.slug.localeCompare(b.slug)).slice(offset,offset+limit)}}}}};
const input={slug:"test-vijest",title:"Sintetička vijest za lokalni regresijski test",body:"Ovo je isključivo sintetički tekst za testiranje. ".repeat(20)+"<script>alert(1)</script>",sources:["https://example.org/source","https://example.net/source"],editorial_verified:true,section:"Tehnologija",tags:["Tehnologija"]};
const get=(path,method="GET",e={...env,DB})=>handle(new Request(origin+path,{method}),e);
const post=(data=input,e={...env,DB},token=env.PUBLISH_TOKEN)=>handle(new Request(origin+"/api/publish",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(data)}),e);
assert.equal((await get("/", "GET",env)).status,503);
assert.equal((await get("/health","HEAD",env)).status,503);
assert.equal((await get("/")).status,200);
assert.equal((await post(input,{...env,DB,PUBLISH_ENABLED:"false"})).status,403);
assert.equal((await post(input,{...env,DB},"wrong")).status,403);
assert.equal((await post({...input,editorial_verified:false})).status,400);
assert.equal((await post({...input,sources:["https://example.org/a","https://example.org/b"]})).status,400);
assert.equal(store.size,0);
const first=await post();assert.equal(first.status,200);const saved=await first.json();assert.equal(saved.status,"stored");assert.equal(saved.requiresPublicVerification,true);
const replay=await post();assert.equal(replay.status,200);assert.equal((await replay.json()).publishedAt,saved.publishedAt);assert.equal(store.size,1);
assert.equal((await post({...input,title:input.title+" izmjena"})).status,409);
const page=await get("/novosti/test-vijest/");assert.equal(page.status,200);const html=await page.text();assert.match(html,/NewsArticle/);assert.match(html,/&lt;script&gt;alert/);assert.ok(!html.includes("<script>alert(1)</script>"));
assert.match(html,/rel="canonical" href="https:\/\/example.org\/novosti\/test-vijest\/"/);
assert.equal((await get("/novosti/test-vijest")).status,308);
assert.equal((await get("/novosti/nepostojeca")).status,404);
assert.equal(await (await get("/novosti/test-vijest/","HEAD")).text(),"");
assert.match(await (await get("/")).text(),/test-vijest/);
assert.match(await (await get("/news-sitemap.xml")).text(),/test-vijest/);
assert.match(await (await get("/sitemap-1.xml")).text(),/test-vijest/);
assert.match(await (await get("/rss.xml")).text(),/test-vijest/);
assert.equal((await get("/slika/test-vijest.svg")).status,200);
assert.equal((await handle(new Request("https://wrong.example/"),{...env,DB})).status,421);
console.log("FAST NEWS regression checks passed; fixture DB only, no real publication.");

const dev=await get("/");assert.equal(dev.headers.get("x-robots-tag"),"noindex");assert.match(await dev.text(),/content="noindex,follow"/);
const prod=await get("/","GET",{...env,DB,INDEX_ENABLED:"true"});assert.equal(prod.headers.get("x-robots-tag"),null);assert.match(await prod.text(),/content="index,follow,max-image-preview:large"/);


// Large rolling news sitemap: verify every fresh article is covered once.
const sampleRow=store.get("test-vijest");
for(let i=0;i<2000;i++){
 const slug="fixture-volume-"+i;
 store.set(slug,{...sampleRow,slug,title:"Fixture "+i,published_at:new Date(Date.now()-1000-i).toISOString()});
}
store.set("fixture-stale",{...sampleRow,slug:"fixture-stale",published_at:new Date(Date.now()-49*3600000).toISOString()});
const sitemapIndex=await (await get("/news-sitemap.xml")).text();
assert.equal((sitemapIndex.match(/<sitemap>/g)||[]).length,3);
const sitemapURLs=new Set();
for(let i=1;i<=3;i++){
 const response=await get("/news-sitemap-"+i+".xml");assert.equal(response.status,200);
 const xml=await response.text(),urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);
 assert.equal(urls.length,i===3?1:1000);
 for(const url of urls){assert.ok(!sitemapURLs.has(url));sitemapURLs.add(url)}
}
assert.equal(sitemapURLs.size,2001);
assert.ok(!sitemapURLs.has(origin+"/novosti/fixture-stale/"));
assert.equal((await get("/news-sitemap-4.xml")).status,404);
