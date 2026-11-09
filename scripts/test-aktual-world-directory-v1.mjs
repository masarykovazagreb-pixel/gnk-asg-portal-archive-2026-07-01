#!/usr/bin/env node
/** Read-only integration contract for AKTUAL MEDIA WORLD 201 public directory.
 *  Ensures registry URLs resolve to actual HTML and 211 world sitemap entries;
 *  does not claim all 435 feed sources are online. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const PORTAL='apps/portal',BASE='https://gnk-asg.hr';
const read=p=>fs.readFileSync(p,'utf8');
const inv=JSON.parse(read(path.join(PORTAL,'data/world-countries-v1.json')));
const html=read(path.join(PORTAL,'gnk-aktual/media/index.html'));
const sitemap=read(path.join(PORTAL,'gnk-aktual/media/sitemap.xml'));
const generate=read('scripts/generate-world-countries-v1.mjs');
const unique=values=>new Set(values).size;
assert.equal(inv.countries.length,201,'exactly 201 countries and territories');
assert.equal(inv.cities.length,10,'exactly 10 configured city pages');
assert.equal(unique(inv.countries.map(c=>c.slug)),201,'unique country slugs');
assert.equal(unique(inv.cities.map(c=>c.slug)),10,'unique city slugs');
assert.equal(inv.countries.reduce((n,c)=>n+Number(c.sources||0),0),435,'435 configured source entries');
assert(!/gnk-aktual\/svijet\/\$\{slug\}/.test(generate),'generator must not emit unmaterialized /svijet/ URLs');
assert(/gnk-aktual\/media\/\$\{slug\}/.test(generate),'generator must emit real /media/ routes');
assert(html.includes('rel="canonical" href="'+BASE+'/gnk-aktual/media/"'),'canonical directory URL');
assert(html.includes('https://j1hex9qg03f0-d.space-z.ai/'),'user-supplied global world destination');
assert(html.includes('/tehnologija-buducnosti/'),'future technology cross-link');
assert(html.includes('/aktual-media/'),'data-desk cross-link');
assert.equal((html.match(/data-world-country\b/g)||[]).length,201,'visible country links');
assert.equal((html.match(/class="aw-city"/g)||[]).length,10,'visible city links');
for(const country of inv.countries){
 const url=`${BASE}/gnk-aktual/media/${country.slug}/`;
 assert.equal(country.url,url,`correct route for ${country.slug}`);
 assert(fs.existsSync(path.join(PORTAL,'gnk-aktual/media',country.slug,'index.html')),`country page exists: ${country.slug}`);
 assert.equal(country.rss,`${url}feed.xml`,`country-specific RSS link: ${country.slug}`);
 assert(fs.existsSync(path.join(PORTAL,'gnk-aktual/media',country.slug,'feed.xml')),`country RSS exists: ${country.slug}`);
 assert(html.includes(`href="/gnk-aktual/media/${country.slug}/"`),`directory contains country: ${country.slug}`);
 assert(sitemap.includes(`<loc>${url}</loc>`),`sitemap has country: ${country.slug}`);
}
for(const city of inv.cities){
 const url=`${BASE}/gnk-aktual/grad/${city.slug}/`;
 assert(fs.existsSync(path.join(PORTAL,'gnk-aktual/grad',city.slug,'index.html')),`city page exists: ${city.slug}`);
 assert.equal(city.rss,`${url}feed.xml`,`city-specific RSS link: ${city.slug}`);
 assert(fs.existsSync(path.join(PORTAL,'gnk-aktual/grad',city.slug,'feed.xml')),`city RSS exists: ${city.slug}`);
 assert(html.includes(`href="/gnk-aktual/grad/${city.slug}/"`),`directory contains city: ${city.slug}`);
 assert(sitemap.includes(`<loc>${url}</loc>`),`sitemap has city: ${city.slug}`);
}
assert(sitemap.includes('<loc>'+BASE+'/gnk-aktual/media/</loc>'),'directory entry in sitemap');
assert.equal((sitemap.match(/<loc>/g)||[]).length,212,'directory + 201 countries + 10 cities sitemap URLs');
assert(fs.existsSync(path.join(PORTAL,'assets/aktual-world-directory-v1.css')),'directory CSS');
assert(fs.existsSync(path.join(PORTAL,'assets/aktual-world-directory-v1.js')),'directory search JS');
for(const p of ['gnk-aktual/index.html','tehnologija-buducnosti/index.html','en/future-technology/index.html','aktual-media/index.html','en/aktual-media/index.html']){
 assert(read(path.join(PORTAL,p)).includes('href="/gnk-aktual/media/"'),`related page links to country directory: ${p}`);
}
console.log(JSON.stringify({ok:true,countries:201,cities:10,configuredSources:435,sitemapUrls:212,sourceAvailability:'not independently confirmed'}));
