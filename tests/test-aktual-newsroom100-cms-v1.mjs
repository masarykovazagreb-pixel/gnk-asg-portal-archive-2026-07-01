import assert from "node:assert/strict";
import {validateArticle,handleNewsroom100,VERSION} from "../workers/gnk-asg-direct-operator/src/newsroom100-cms-v1.js";
const sample={
 title:"Provjereni gospodarski pokazatelji i analiza lokalnog tržišta",
 slug:"provjereni-gospodarski-pokazatelji",
 body:("Urednički izvorni tekst s činjenicama, kontekstom i analizom tržišnih kretanja. ").repeat(19),
 sources:"https://example.org/report\nhttps://example.net/independent-evidence",
 editorial_verified:"yes"
};
const normalized=validateArticle(sample);
assert.equal(normalized.slug,sample.slug);
assert.equal(normalized.sources.length,2);
assert.equal(normalized.title,sample.title);
assert.throws(()=>validateArticle({...sample,editorial_verified:"no"}),/potvrda/);
assert.throws(()=>validateArticle({...sample,slug:"../evil"}),/URL oznaka/);
assert.throws(()=>validateArticle({...sample,sources:"https://example.org/a\nhttps://example.org/b"}),/dvije neovisne/);
assert.throws(()=>validateArticle({...sample,body:"Prekratko"}),/najmanje 90/);
const app={fetch:async()=>new Response(JSON.stringify({authenticated:false}),{status:401,headers:{"content-type":"application/json"}})};
const restricted=await handleNewsroom100(new Request("https://gnk-asg.hr/api/newsroom100/status"),{},null,app);
assert.equal(restricted.status,401);
const sitemap=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/news-sitemap.xml"),{},null,app);
assert.equal(sitemap.status,200);
assert.match(await sitemap.text(),/xmlns:news=/);
const listing=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/novosti/"),{},null,app);
assert.equal(listing.status,200);
assert.match(await listing.text(),/AKTUAL MEDIA/);
const unknown=await handleNewsroom100(new Request("https://gnk-asg.hr/other-path/"),{},null,app);
assert.equal(unknown,null);
const baseXML='<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>';
const assets={ASSETS:{fetch:async()=>new Response(baseXML,{status:200})}};
const modified=await handleNewsroom100(new Request("https://gnk-asg.hr/sitemap-index.xml"),assets,null,app);
assert.equal(modified.status,200);
assert.match(await modified.text(),/\/gnk-aktual\/news-sitemap.xml/);
assert.match(VERSION,/NEWSROOM100/);
console.log("NEWSROOM100 CMS: 13 essential read-only and input validation assertions passed.");
