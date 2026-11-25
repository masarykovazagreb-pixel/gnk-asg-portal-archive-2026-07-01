#!/usr/bin/env node
/** Canonical deterministic English country-directory generator.
 * Research source links only. NEVER claims RSS leads are our articles.
 * HTML paths match apps/portal/en/gnk-aktual/media/<country>/index.html.
 * Existing pages: update only source catalogue, edition facts and directory list;
 * preserve editorial layers, metadata, robots and hashtags. A missing page is
 * generated in full. All pages are validated before any write.
 * --check checks these managed blocks and the sitemap, not whole-page equality.
 * Optional isolated output: AKTUAL_EN_OUT=<directory>.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {countryDirectoryDescription, englishWorldDirectoryDescription} from '../apps/shared/aktual-world-meta-v1.mjs';
import {worldHashtagBlock} from '../apps/shared/aktual-world-hashtags-v1.mjs';
const ROOT = 'https://gnk-asg.hr';


function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function goodUrl(value){
  try{let u=new URL(value);if(u.protocol!=="https:"||u.username||u.password||u.hash||!u.hostname)return null;return u.href;}catch{return null;}
}

function providers(c){
 const seen=new Set();
 return (c.sourcesList||[]).filter(s=>{
  const url=goodUrl(s.url);
  if(!url||!s.name)return false;
  const key=s.name.toLowerCase()+"|"+new URL(url).hostname;
  if(seen.has(key))return false;seen.add(key);return true;
 }).map(s=>({name:s.name,url:goodUrl(s.url),rss:goodUrl(s.rss),aggregator:/\bgoogle\b/i.test(s.name)||new URL(s.url).hostname==="news.google.com",category:s.category||"news"}));
}

function indexEligible(c){const p=providers(c).filter(s=>!s.aggregator);return new Set(p.map(s=>new URL(s.url).hostname.replace(/^www\./,""))).size>=2;}

function renderCountry(c){
 const url=ROOT+"/en/gnk-aktual/media/"+c.slug+"/";
 const hr=ROOT+"/gnk-aktual/media/"+c.slug+"/";
 const p=providers(c);
 const real=p.filter(x=>!x.aggregator);
 const directHosts=new Set(real.map(s=>new URL(s.url).hostname.replace(/^www\./,''))).size;
 const index=indexEligible(c);
 const title="AKTUAL MEDIA "+c.nameEn+" | Independent sources, news & radio";
 const desc="Explore independent news sources for "+c.nameEn+". Discover local publishers, current RSS sources and AKTUAL MEDIA global radio. External reports remain with their publishers.";
 const metaDesc=countryDirectoryDescription(c.nameEn);
 const pairs='<link rel="alternate" hreflang="en" href="'+url+'"><link rel="alternate" hreflang="hr" href="'+hr+'"><link rel="alternate" hreflang="x-default" href="'+url+'">';
 const cards=p.map(s=>'<li class="am-source-card"><span class="am-source-kind">'+(s.aggregator?"News aggregator":"External publisher")+'</span><h3><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(s.name)+'</a></h3><p>Source for '+esc(c.nameEn)+' · '+esc(s.category)+'. Content and media rights remain with the source.</p>'+(s.rss?'<a class="am-small-link" href="'+esc(s.rss)+'" target="_blank" rel="noopener noreferrer nofollow">RSS source ↗</a>':"")+'</li>').join("\n");
 const schema=JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","@id":url+"#page",url,name:title,description:desc,inLanguage:"en",isPartOf:{"@id":ROOT+"/#website"},publisher:{"@id":ROOT+"/gnk-aktual/#news-organization"},editor:{"@type":"Person","@id":ROOT+"/#nermin-sefic",name:"Nermin Sefić"},about:{"@type":"Place",name:c.nameEn,alternateName:c.nameLocal,address:{"@type":"PostalAddress",addressCountry:c.code}}}).replace(/</g,"\\u003c");
 return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(metaDesc)}">
<meta name="robots" content="${index?"index,follow,max-image-preview:large":"noindex,follow"}">
<meta name="publisher" content="AKTUAL MEDIA d.o.o."><meta name="editor" content="Nermin Sefić">
<link rel="canonical" href="${url}">${pairs}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/aktual-world-premium-en-v1.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${url}"><meta property="og:locale" content="en_GB">
<meta property="og:image" content="${ROOT}/assets/editorial/aktual-media-800.webp">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(metaDesc)}">
<meta name="twitter:image" content="${ROOT}/assets/editorial/aktual-media-800.webp">
<script type="application/ld+json">${schema}</script>
</head><body>
<a href="#content" class="am-skip">Skip to content</a>
<div class="am-top"><div class="am-container"><a class="am-brand" href="/en/gnk-aktual/">AKTUAL <em>MEDIA</em><span class="am-brand-sub">WORLD NEWSROOM</span></a><nav aria-label="Site navigation"><a href="/en/gnk-aktual/media/">201 editions</a><a href="/en/gnk-aktual/">Newsroom</a><a href="/en/radio/">◉ RADIO</a><a class="am-lang" href="${hr}" hreflang="hr" lang="hr">HR · Hrvatski</a><span class="am-lang current" aria-current="page">EN · English</span></nav></div></div>
<main id="content" class="am-container">
<div class="am-hero"><div><p class="am-kicker">AKTUAL MEDIA / GLOBAL EDITIONS / ${esc(c.code)}</p>
<h1><span aria-hidden="true">${esc(c.flag||"🌍")}</span> ${esc(c.nameEn)}<br><span class="am-light">News &amp; sources</span></h1>
<p class="am-lead">A focused gateway to news sources serving ${esc(c.nameEn)}. Follow original publishers, explore relevant RSS feeds and discover independent AKTUAL MEDIA coverage as it becomes verified and published.</p>
<div class="am-cta"><a class="am-button" href="/en/gnk-aktual/">Explore the newsroom ↗</a><a class="am-button am-ghost" href="${hr}" hreflang="hr">Croatian directory</a></div></div>
<aside class="am-hero-panel" aria-label="Edition facts"><p class="am-kicker">EDITION PROFILE</p><strong>${esc(c.code)}</strong><dl><div><dt>Registered sources</dt><dd>${p.length}</dd></div><div><dt>Direct publisher hosts</dt><dd>${directHosts}</dd></div><div><dt>Edition language</dt><dd>English</dd></div><div><dt>Regional research</dt><dd>${esc(c.language||"—").toUpperCase()}</dd></div></dl><span class="am-dot">●</span> Source catalogue — not a live article feed</aside></div>
<section class="am-section"><div class="am-section-head"><div><p class="am-kicker">RESEARCH / SOURCE DIRECTORY</p><h2>Where to follow the story</h2></div><span class="am-counter">${p.length} listed sources</span></div>
<p class="am-explainer">These external publishers are research leads, not AKTUAL MEDIA partners. We do not reproduce their articles or photographs. A news report appears on AKTUAL MEDIA only after independent verification and original editorial writing.</p>
<ul class="am-source-grid">${cards||'<li class="am-source-card"><h3>Sources being assessed</h3><p>No suitable registered source is currently available for this edition.</p></li>'}</ul></section>
<section class="am-section am-radio"><div><p class="am-kicker">LISTEN / GLOBAL RADIO</p><h2>AKTUAL MEDIA Radio</h2><p>Open the radio player and browse stations. Some audio streams are operated by independent third parties; playback is user-initiated, never automatic.</p></div><a class="am-button am-radio-button" href="/en/radio/">◉ Open radio player ↗</a></section>
<section class="am-section am-edit"><p class="am-kicker">EDITORIAL RESPONSIBILITY</p><h2>Source-first reporting</h2><p>All factual claims require provenance. Headlines from RSS are only topic prompts. Reports must be independently written and reviewed. Editorial lead: <a href="/nermin-sefic/">Nermin Sefić</a>; articles carry their own truthful bylines.</p><p><a href="/en/gnk-aktual/media/">Browse all 201 country directories</a> · <a href="/gnk-aktual/">Croatian newsroom</a></p></section>
</main>
${worldHashtagBlock}
<footer class="am-footer"><div class="am-container"><span>© AKTUAL MEDIA · GNK ASG</span><span>${esc(c.nameEn)} · Independent external source directory · <a href="/en/gnk-aktual/">Network</a></span></div></footer></body></html>
`;
}

function renderDirectory(registry){
 const sorted=[...registry.countries].sort((a,b)=>a.code==="HR"?-1:b.code==="HR"?1:a.nameEn.localeCompare(b.nameEn,"en"));
 const items=sorted.map(c=>'<li data-search="'+esc((c.nameEn+" "+c.nameLocal+" "+c.code).toLowerCase())+'"><a href="/en/gnk-aktual/media/'+esc(c.slug)+'/"><span>'+esc(c.flag||"🌍")+' '+esc(c.nameEn)+'</span><small>'+esc(c.code)+' · '+providers(c).length+' sources</small></a></li>').join("\n");
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>AKTUAL MEDIA WORLD | 201 English country directories</title>
<meta name="description" content="${esc(englishWorldDirectoryDescription)}">
<meta name="robots" content="index,follow"><meta name="editor" content="Nermin Sefić">
<link rel="canonical" href="${ROOT}/en/gnk-aktual/media/"><link rel="alternate" hreflang="en" href="${ROOT}/en/gnk-aktual/media/"><link rel="alternate" hreflang="hr" href="${ROOT}/gnk-aktual/media/"><link rel="alternate" hreflang="x-default" href="${ROOT}/en/gnk-aktual/media/">
<link rel="stylesheet" href="/assets/aktual-world-premium-en-v1.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA"><meta property="og:title" content="AKTUAL MEDIA WORLD — 201 English editions"><meta property="og:description" content="${esc(englishWorldDirectoryDescription)}"><meta property="og:url" content="${ROOT}/en/gnk-aktual/media/">
<meta property="og:image" content="${ROOT}/assets/editorial/aktual-media-800.webp"><meta property="og:image:alt" content="AKTUAL MEDIA country directories">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="AKTUAL MEDIA WORLD — 201 English editions"><meta name="twitter:description" content="${esc(englishWorldDirectoryDescription)}"><meta name="twitter:image" content="${ROOT}/assets/editorial/aktual-media-800.webp">
</head><body><a href="#content" class="am-skip">Skip to content</a>
<div class="am-top"><div class="am-container"><a class="am-brand" href="/en/gnk-aktual/">AKTUAL <em>MEDIA</em><span class="am-brand-sub">GLOBAL / 201 EDITIONS</span></a><nav aria-label="Site navigation"><a href="/en/gnk-aktual/">Newsroom</a><a href="/en/radio/">◉ RADIO</a><a class="am-lang" href="/gnk-aktual/media/" hreflang="hr" lang="hr">HR · Hrvatski</a><span class="am-lang current" aria-current="page">EN · English</span></nav></div></div>
<main class="am-container" id="content"><div class="am-hero"><div><p class="am-kicker">INTERNATIONAL EDITIONS / ENGLISH</p><h1>The world.<br><span class="am-light">201 perspectives.</span></h1><p class="am-lead">Choose a country or territory to find its source directory. AKTUAL MEDIA does not claim ownership of linked publishers. Original news articles appear only after source verification.</p><div class="am-cta"><a class="am-button" href="/en/radio/">◉ Listen to AKTUAL RADIO</a><a class="am-button am-ghost" href="/en/gnk-aktual/">Explore news</a></div></div><aside class="am-hero-panel"><p class="am-kicker">AT A GLANCE</p><strong>201</strong><p>Country and territory directories</p><p class="am-explainer">Coverage and source freshness vary by edition. All links and publication rights require verification.</p></aside></div>
<section class="am-section" aria-labelledby="dir-heading"><div class="am-section-head"><div><p class="am-kicker">COUNTRY DIRECTORY</p><h2 id="dir-heading">Choose a destination</h2></div><span class="am-counter">Croatia first</span></div><label for="amFilter" class="am-search-label">Search countries</label><input type="search" id="amFilter" placeholder="Search country or code" autocomplete="off" aria-controls="amCountryList"><ul class="am-directory-grid" id="amCountryList">${items}</ul></section>
<section class="am-section am-radio"><div><p class="am-kicker">GLOBAL RADIO</p><h2>AKTUAL MEDIA Radio</h2><p>Stations are opened on demand; no autoplay.</p></div><a class="am-button" href="/en/radio/">Open radio ↗</a></section></main><footer class="am-footer"><div class="am-container">AKTUAL MEDIA · Editorial lead <a href="/nermin-sefic/">Nermin Sefić</a> · <a href="/gnk-aktual/media/">Hrvatski imenik</a></div></footer>
<script>const q=document.getElementById('amFilter');const rows=[...document.querySelectorAll('#amCountryList li')];q.addEventListener('input',()=>{const term=q.value.toLocaleLowerCase().trim();for(const row of rows)row.hidden=!row.dataset.search.includes(term)});</script>
</body></html>`;
}

function renderSitemap(registry, isIndexable=indexEligible){
 const urls=[ROOT+"/en/gnk-aktual/media/",...registry.countries.filter(isIndexable).map(c=>ROOT+"/en/gnk-aktual/media/"+c.slug+"/")];
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+url+'</loc></url>').join("\n")+'\n</urlset>\n';
}

const registry=JSON.parse(readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
if(!Array.isArray(registry.countries)||registry.countries.length!==201 || new Set(registry.countries.map(c=>c.slug)).size!==201 || registry.countries.some(c=>!c||typeof c.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug)))throw Error('201 canonical country slugs required');
const out=resolve(process.env.AKTUAL_EN_OUT||'apps/portal/en/gnk-aktual/media');
const check=process.argv.includes('--check');
// Do not rebuild existing pages wholesale: later layers include attribution,
// accessibility, hashtags, legal notices and reviewed metadata.
const factsPattern=/<aside class="am-hero-panel" aria-label="Edition facts">[\s\S]*?<\/aside>/g;
const sourcesPattern=/<section class="am-section"><div class="am-section-head"><div><p class="am-kicker">RESEARCH \/ (?:VERIFIED )?SOURCE DIRECTORY<\/p>[\s\S]*?<\/ul><\/section>/g;
const directoryPattern=/<ul class="am-directory-grid" id="amCountryList">[\s\S]*?<\/ul>/g;
function replaceOne(existing,generated,pattern,file){
 const old=[...existing.matchAll(pattern)], fresh=[...generated.matchAll(pattern)];
 if(old.length!==1||fresh.length!==1)throw Error(`Unexpected managed block in ${file}; no files written`);
 return existing.slice(0,old[0].index)+fresh[0][0]+existing.slice(old[0].index+old[0][0].length);
}
function pageIndexable(html,file){
 const matches=[...html.matchAll(/<meta name="robots" content="([^"]*)"\s*\/?\s*>/g)];
 if(matches.length!==1)throw Error(`Unexpected robots metadata in ${file}; no files written`);
 const tokens=matches[0][1].toLowerCase().split(',').map(x=>x.trim());
 const disabled=tokens.includes('noindex')||tokens.includes('none');
 if((disabled&&tokens.includes('index'))||(!disabled&&!tokens.includes('index')))throw Error(`Ambiguous robots metadata in ${file}; no files written`);
 return !disabled;
}
// Construct and validate all outputs before touching any file.
const indexed=new Set(),expected=[];
for(const c of registry.countries){
 const file=join(out,c.slug,'index.html'),generated=renderCountry(c);
 let content=generated;
 if(existsSync(file)){
  const old=readFileSync(file,'utf8');
  content=replaceOne(old,generated,factsPattern,file);
  content=replaceOne(content,generated,sourcesPattern,file);
 }
 if(pageIndexable(content,file))indexed.add(c.slug);
 expected.push([file,content]);
}
const dirFile=join(out,'index.html'),dirGenerated=renderDirectory(registry);
expected.push([dirFile,existsSync(dirFile)?replaceOne(readFileSync(dirFile,'utf8'),dirGenerated,directoryPattern,dirFile):dirGenerated]);
expected.push([join(out,'sitemap.xml'),renderSitemap(registry,c=>indexed.has(c.slug))]);
let differences=0;
for(const [file,content] of expected){
 if(check){if(!existsSync(file)||readFileSync(file,'utf8')!==content){differences++;console.error('DRIFT '+file)}}
 else if(!existsSync(file)||readFileSync(file,'utf8')!==content){mkdirSync(dirname(file),{recursive:true});writeFileSync(file,content);}
}
console.log(JSON.stringify({countryPages:201,directory:1,indexableCountryPages:indexed.size,sitemapUrls:indexed.size+1,mode:check?'check':'build',checkScope:'managed source blocks, country list and sitemap; other existing content preserved',drift:differences}));
if(differences)process.exitCode=1;
