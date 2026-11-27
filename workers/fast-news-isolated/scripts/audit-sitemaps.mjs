// Read-only sitemap audit. Invoke twice daily from the existing authorized scheduler.
// No submission, indexing claim, crawler spoofing or external-domain requests.
import {countries} from "../src/world-registry.mjs";
const origin=new URL(process.env.FAST_NEWS_DEV_ORIGIN||"");
if(origin.protocol!=="https:"||origin.pathname!=="/"||origin.username||origin.password||origin.search||origin.hash)throw Error("Invalid authorized origin");
const get=async path=>{const u=new URL(path,origin);if(u.origin!==origin.origin)throw Error("Unexpected origin");const r=await fetch(u,{redirect:"error",signal:AbortSignal.timeout(20000),headers:{"cache-control":"no-cache"}});if(!r.ok)throw Error("HTTP "+r.status+" "+u.pathname);return {text:await r.text(),noindex:r.headers.get("x-robots-tag")==="noindex"}};
const locations=s=>[...s.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,"&"));
const check=(x,m)=>{if(!x)throw Error(m)};
const index=await get("/sitemap.xml"),world=await get("/sitemap-world.xml"),news=await get("/news-sitemap.xml"),robots=await get("/robots.txt");
check(index.text.includes("<sitemapindex"),"Missing sitemap index");
check(locations(index.text).includes(origin.origin+"/sitemap-world.xml"),"Missing WORLD sitemap in index");
const expected=countries.flatMap(c=>[...new Set([c.language,"hr","en"])].map(l=>origin.origin+"/world/"+c.slug+"/"+(l===c.language?"":l+"/")));
const actual=locations(world.text),unique=new Set(actual);
check(unique.size===actual.length,"Duplicate WORLD URLs");check(expected.every(u=>unique.has(u)),"Missing language editions");
check(robots.text.includes(origin.origin+"/sitemap.xml"),"Missing robots sitemap declaration");
check(robots.text.includes(origin.origin+"/news-sitemap.xml"),"Missing robots news sitemap declaration");
check(news.text.includes("<urlset")||news.text.includes("<sitemapindex"),"Invalid news sitemap format");
const parts=news.text.includes("<sitemapindex")?locations(news.text):[];
// Bound the audit to avoid unapproved large scheduled fetches.
const sample=parts.slice(0,10);let checked=0;
for(const p of sample){const u=new URL(p);check(u.origin===origin.origin&&/^\/news-sitemap-[1-9]\d*\.xml$/.test(u.pathname),"Invalid news shard URL");const r=await get(u.href);check(locations(r.text).length<=1000,"Oversize News sitemap");checked++}
if(!parts.length)check(locations(news.text).length<=1000,"Oversize News sitemap");
console.log(JSON.stringify({verifiedAt:new Date().toISOString(),worldURLs:actual.length,languageEditions:expected.length,newsShardsDeclared:parts.length,newsShardsChecked:checked,developmentNoindex:world.noindex,indexingConfirmed:false}));
