import assert from "node:assert/strict";
import {validateArticle,handleNewsroom100,VERSION,NEWSROOM_PUBLIC_LINKS,articleMetadata,renderArticle} from "../workers/gnk-asg-direct-operator/src/newsroom100-cms-v1.js";
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

assert.deepEqual(NEWSROOM_PUBLIC_LINKS,["/gnk-aktual/novosti/","/gnk-aktual/news-sitemap.xml"]);
const published={slug:"test-vijest",title:"Test uredničke vijesti & sigurnog prikaza",image_url:"/media/aktual100/test-vijest.svg",published_at:new Date().toISOString(),html:"<!doctype html><title>Test vijest</title>"};
const fakeDB={prepare(sql){return {bind(...params){return {all:async()=>({results:[published]}),first:async()=>params[0]===published.slug?published:null}}}}};
const environment={GNK_ASG_D1:fakeDB};
const front=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/novosti/"),environment,null,app);
assert.equal(front.status,200);
const frontHTML=await front.text();
assert.match(frontHTML,/class="stories"/);
assert.match(frontHTML,/class="story lead"/);
assert.match(frontHTML,/Test uredničke vijesti &amp; sigurnog prikaza/);
assert.match(frontHTML,/\/gnk-aktual\/novosti\/test-vijest\//);
assert.match(frontHTML,/loading="eager"/);
const live=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/novosti/test-vijest/"),environment,null,app);
assert.equal(live.headers.get("x-aktual-newsroom100-public"),"published-in-d1");
assert.match(await live.text(),/Test vijest/);
const missing=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/novosti/nepostojeca/"),environment,null,app);
assert.equal(missing,null);
const freshMap=await handleNewsroom100(new Request("https://gnk-asg.hr/gnk-aktual/news-sitemap.xml"),environment,null,app);
assert.match(await freshMap.text(),/https:\/\/gnk-asg\.hr\/gnk-aktual\/novosti\/test-vijest\//);
console.log("NEWSROOM100: public route contract, premium news cards, canonical URLs and D1-backed response proof tested with fixture data.");

const seo=articleMetadata("Gospodarstvo i investicije u Hrvatskoj",sample.body);
assert.ok(seo.description.length<=160);
assert.equal(seo.section,"Gospodarstvo");
assert.deepEqual(seo.tags,["AKTUALMEDIA","Gospodarstvo","Hrvatska"]);
assert.deepEqual(articleMetadata("Novi raspored događaja",sample.body).tags,["AKTUALMEDIA"]);
const metaPage=renderArticle({...normalized,title:"Gospodarstvo i investicije u Hrvatskoj"}, "/media/aktual100/test-vijest.svg","Originalna ilustracija","",published.published_at);
assert.match(metaPage,/property="og:description"/);
assert.match(metaPage,/name="twitter:image"/);
assert.match(metaPage,/property="article:section" content="Gospodarstvo"/);
assert.match(metaPage,/property="article:tag" content="AKTUALMEDIA"/);
assert.match(metaPage,/#Gospodarstvo/);
assert.match(metaPage,/"keywords":\["AKTUALMEDIA","Gospodarstvo","Hrvatska"\]/);
console.log("NEWSROOM100: deterministic SEO metadata and relevant topic tag assertions completed.");
