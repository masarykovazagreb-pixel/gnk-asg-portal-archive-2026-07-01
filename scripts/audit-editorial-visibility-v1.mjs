import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, indexablePages: 0, sitemapMembers: 0, registryUrlMismatches: 0, pagesWithImages: 0, sameOriginImagesChecked: 0, missingSameOriginImages: 0, pagesWithArticleSchema: 0, pagesWithStructuredImageSignal: 0, advancedSocialGaps: 0, hreflangGaps: 0, imageMetadataGaps: 0, structuredImageGaps: 0, responsiveImageGaps: 0, lazyLoadingGaps: 0, decorativeImages: 0 };
const fail = message => failures.push(message);
const warn = message => warnings.push(message);
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const hasAttr = (tag, name) => new RegExp(`\\b${name}(?:\\s*=|\\s|>|/)`, 'i').test(tag);
const attr = (tag, name) => extract(tag, new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["'][^>]*>`, 'i'));
const property = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const absolute = (value, route) => { if (!value) return ''; try { return new URL(value, `${ORIGIN}${route}`).href; } catch { return value; } };
const sameOriginAssetFile = value => { try { const url = new URL(value, ORIGIN); if (url.origin !== ORIGIN) return null; return path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\/+/, '')); } catch { return null; } };
if (!fs.existsSync(REGISTRY) || !fs.existsSync(SITEMAP)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;
const sitemapXml = fs.readFileSync(SITEMAP, 'utf8');
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim()));
const seenTitles = new Map(), seenDescriptions = new Map(), seenCanonicals = new Map();
for (const item of items) {
  const route = String(item.path || ''); if (!route.startsWith('/')) { fail(`Invalid route: ${route || '(missing)'}`); continue; }
  const expectedUrl = `${ORIGIN}${route}`; if (item.url && item.url !== expectedUrl) { stats.registryUrlMismatches++; fail(`${route}: registry url mismatch`); }
  const file = routeFile(route); if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8'); stats.checkedPages++;
  const title = extract(html, /<title>([\s\S]*?)<\/title>/i), description = meta(html,'description'), robots = meta(html,'robots'), pageCanonical = canonical(html), h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if(!title) fail(`${route}: missing title`); if(!description) fail(`${route}: missing meta description`); if(pageCanonical!==expectedUrl) fail(`${route}: canonical mismatch`); if(!sitemapUrls.has(expectedUrl)) fail(`${route}: canonical URL missing from sitemap.xml`); else stats.sitemapMembers++;
  if(!/\bindex\b/i.test(robots)||!/\bfollow\b/i.test(robots)) fail(`${route}: robots must include index,follow`); else stats.indexablePages++;
  if(!/max-image-preview:large/i.test(robots)) warn(`${route}: robots lacks max-image-preview:large`); if(h1s.length!==1) fail(`${route}: expected exactly one H1, found ${h1s.length}`);
  for (const [value,map,label] of [[title,seenTitles,'title'],[description,seenDescriptions,'meta description'],[pageCanonical,seenCanonicals,'canonical']]) if(value){const key=label==='canonical'?value:value.toLowerCase().replace(/\s+/g,' ').trim(); if(map.has(key)) fail(`${route}: duplicate ${label} with ${map.get(key)}`); else map.set(key,route);}
  for(const [name,value] of [['og:title',property(html,'og:title')],['og:description',property(html,'og:description')],['og:url',property(html,'og:url')],['og:image',property(html,'og:image')],['twitter:card',meta(html,'twitter:card')]]) if(!value) fail(`${route}: missing ${name}`);
  if(property(html,'og:url')&&property(html,'og:url')!==pageCanonical) fail(`${route}: og:url must match canonical`);
  for(const name of ['twitter:title','twitter:description','twitter:image']) if(!meta(html,name)){stats.advancedSocialGaps++;warn(`${route}: missing ${name}`);}
  for(const name of ['og:image:alt','og:image:width','og:image:height','og:image:type','twitter:image:alt']){const value=name.startsWith('og:')?property(html,name):meta(html,name);if(!value){stats.imageMetadataGaps++;warn(`${route}: missing ${name}`);}}
  const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]); if(images.length) stats.pagesWithImages++;
  for(const tag of images){
    const src=attr(tag,'src'); const altPresent=hasAttr(tag,'alt'); const alt=attr(tag,'alt');
    if(src&&!altPresent) fail(`${route}: image ${src} is missing alt attribute`); else if(src&&altPresent&&alt==='') stats.decorativeImages++;
    if(src&&(!attr(tag,'width')||!attr(tag,'height'))){stats.imageMetadataGaps++;warn(`${route}: image ${src} lacks explicit width/height`);}
    const srcset=attr(tag,'srcset'), sizes=attr(tag,'sizes'), loading=attr(tag,'loading'), fetchpriority=attr(tag,'fetchpriority').toLowerCase();
    if(srcset&&!sizes){stats.responsiveImageGaps++;warn(`${route}: image ${src} has srcset without sizes`);}
    if(src&&!loading&&fetchpriority!=='high'){stats.lazyLoadingGaps++;warn(`${route}: image ${src} has neither loading policy nor high fetchpriority`);}
    if(src){const assetFile=sameOriginAssetFile(absolute(src,route));if(assetFile){stats.sameOriginImagesChecked++;if(!fs.existsSync(assetFile)||!fs.statSync(assetFile).isFile()){stats.missingSameOriginImages++;fail(`${route}: same-origin image asset missing on disk: ${src}`);}}}
  }
  const ogImage=property(html,'og:image'); if(ogImage){const assetFile=sameOriginAssetFile(absolute(ogImage,route));if(assetFile){stats.sameOriginImagesChecked++;if(!fs.existsSync(assetFile)||!fs.statSync(assetFile).isFile()){stats.missingSameOriginImages++;fail(`${route}: same-origin og:image asset missing on disk: ${ogImage}`);}}}
  if(ogImage&&!/^https?:\/\//i.test(ogImage)){stats.imageMetadataGaps++;warn(`${route}: og:image should use an absolute crawlable URL`);}
  const twitterImage=meta(html,'twitter:image'); if(twitterImage&&!/^https?:\/\//i.test(twitterImage)){stats.imageMetadataGaps++;warn(`${route}: twitter:image should use an absolute crawlable URL`);}
  if(ogImage&&images.length&&!images.some(tag=>absolute(attr(tag,'src'),route)===absolute(ogImage,route))) warn(`${route}: og:image is not represented by a page content image`);
  const blocks=[...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]; if(!blocks.length) fail(`${route}: missing JSON-LD`); let articleSchema=false, structuredImageSignal=false;
  for(const [i,b] of blocks.entries()){
    try{
      const parsed=JSON.parse(b[1]);
      const nodes=Array.isArray(parsed?.['@graph'])?parsed['@graph']:[parsed];
      if(nodes.some(n=>['Article','NewsArticle','BlogPosting'].includes(n?.['@type']))) articleSchema=true;
      if(nodes.some(n=>n?.['@type']==='ImageObject'||n?.primaryImageOfPage||n?.image?.['@type']==='ImageObject')) structuredImageSignal=true;
    }catch(e){fail(`${route}: invalid JSON-LD block ${i+1}: ${e.message}`);}
  }
  if(!articleSchema) fail(`${route}: missing Article/NewsArticle/BlogPosting schema`); else stats.pagesWithArticleSchema++;
  if(images.length){if(structuredImageSignal) stats.pagesWithStructuredImageSignal++; else {stats.structuredImageGaps++;warn(`${route}: page has content images but no ImageObject/primaryImageOfPage structured image signal`);}}
  if(!property(html,'article:published_time')) warn(`${route}: missing article:published_time`); if(!property(html,'article:author')&&!meta(html,'author')) warn(`${route}: missing truthful author signal`);
  const lang=String(item.language||'').toLowerCase(); if((lang==='hr'||lang==='en')&&!/<link\s+[^>]*hreflang=/i.test(html)){stats.hreflangGaps++;warn(`${route}: no hreflang links; pair only when a real reciprocal translation exists`);}
}
const report={version:'GNK_ASG_EDITORIAL_VISIBILITY_AUDIT_V1',scope:'editorial registry routes with materialized HTML',terminology:{indexablePages:'Pages whose local robots directive permits index,follow. This is not evidence that a search engine has indexed the page.'},ok:failures.length===0,stats,failures,warnings};
const out=path.join(ROOT,'artifacts','editorial-visibility');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));if(failures.length) process.exit(1);
