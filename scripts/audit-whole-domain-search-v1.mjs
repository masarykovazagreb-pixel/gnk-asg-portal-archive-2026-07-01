#!/usr/bin/env node
// Whole-domain SEO diagnostics. Read only: never edits HTML, changes robots,
// publishes, or sends audit data externally. Reports aggregate counts only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ORIGIN='https://gnk-asg.hr';
const PRIVATE=/^\/(?:en\/)?(?:admin(?:-[^/]+)?|api|control|automation-status|webmail|mail-studio|campaign-mailer|email-status|worker-ops|operator-dashboard|digital-headquarters|media-registration-admin|podijeli)(?:\/|$)/i;
const SKIP=new Set(['assets','node_modules','.git','.github','test-results','playwright-report']);
const decode=s=>String(s||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const normalize=s=>decode(s).replace(/\s+/g,' ').trim();
function attrs(tag){
 const out={};for(const m of tag.matchAll(/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))out[m[1].toLowerCase()]=normalize(m[2]??m[3]??m[4]);
 return out;
}
function readHead(html){
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 const meta=[...head.matchAll(/<meta\b[^>]*>/gi)].map(x=>attrs(x[0]));
 const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(x=>attrs(x[0]));
 const values=(key)=>meta.filter(x=>(x.name||x.property||'').toLowerCase()===key).map(x=>x.content||'');
 return {title:normalize(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]),description:values('description'),robots:values('robots').concat(values('googlebot')).join(', '),canonical:links.filter(x=>(x.rel||'').toLowerCase().split(/\s+/).includes('canonical')).map(x=>x.href),ogTitle:values('og:title'),ogDescription:values('og:description'),ogImage:values('og:image'),alternates:links.filter(x=>x.hreflang),lang:attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang||'',structured:/<script\b[^>]*type\s*=\s*["']application\/ld\+json["']/i.test(head)};
}
function localPath(value){
 try{const u=new URL(value);if(u.origin!==ORIGIN||u.username||u.password||u.search||u.hash)return null;const p=decodeURIComponent(u.pathname);if(p.includes('\\')||p.includes('\0')||p.split('/').includes('..'))return null;return p;}catch{return null}
}
function route(rel){return '/'+rel.replace(/(^|\/)index\.html$/,'$1')}
function* walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()&&!SKIP.has(e.name))yield* walk(p);else if(e.isFile()&&/\.html$/i.test(e.name))yield p;}}
function scan(root){
 const sitemapPages=new Set(),seenSitemaps=new Set(),pending=['/sitemap-index.xml'], sitemapErrors={missing:0,invalid:0,foreign:0,protected:0};
 while(pending.length){const rel=pending.pop();if(seenSitemaps.has(rel))continue;seenSitemaps.add(rel);
   const f=path.join(root,rel.slice(1));if(!fs.existsSync(f)){sitemapErrors.missing++;continue;}
   const xml=fs.readFileSync(f,'utf8');const isIndex=/<sitemapindex\b/i.test(xml);
   if(!isIndex&&!/<urlset\b/i.test(xml)){sitemapErrors.invalid++;continue;}
   for(const m of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)){const p=localPath(normalize(m[1]));if(!p){sitemapErrors.foreign++;continue;}if(PRIVATE.test(p)){sitemapErrors.protected++;continue;}if(isIndex){if(p.endsWith('.xml'))pending.push(p);else sitemapErrors.invalid++;}else sitemapPages.add(p);}
 }
 const counts={html:0,publicCandidates:0,excludedProtectedOrNoindex:0,protectedMissingNoindex:0,missingTitle:0,missingDescription:0,multipleDescriptions:0,longDescription:0,missingOrMultipleCanonical:0,nonLocalCanonical:0,nonSelfCanonical:0,missingLang:0,missingOG:0,missingStructuredData:0,selfCanonicalNotInSitemap:0,noindexInSitemap:0,sitemapWithoutStaticHtml:0,duplicateTitleGroups:0,duplicateDescriptionGroups:0};
 const titleCounts=new Map(),descCounts=new Map(),staticRoutes=new Set();
 for(const file of walk(root)){
   const rel=path.relative(root,file).split(path.sep).join('/'),p=route(rel);counts.html++;staticRoutes.add(p);
   const d=readHead(fs.readFileSync(file,'utf8')),isPrivate=PRIVATE.test(p),isNoindex=/(^|[\s,])(?:noindex|none)(?=$|[\s,])/i.test(d.robots);
   if(isPrivate&&!isNoindex)counts.protectedMissingNoindex++;
   if((isPrivate||isNoindex)&&sitemapPages.has(p))counts.noindexInSitemap++;
   if(isPrivate||isNoindex||/^\/google[a-z0-9]+\.html$/i.test(p)){counts.excludedProtectedOrNoindex++;continue;}
   counts.publicCandidates++;
   if(!d.title)counts.missingTitle++;else titleCounts.set(d.title,(titleCounts.get(d.title)||0)+1);
   if(!d.description[0])counts.missingDescription++;else descCounts.set(d.description[0],(descCounts.get(d.description[0])||0)+1);
   if(d.description.length>1)counts.multipleDescriptions++;
   if((d.description[0]||'').length>160)counts.longDescription++;
   if(d.canonical.length!==1||!d.canonical[0])counts.missingOrMultipleCanonical++;
   else {const cp=localPath(d.canonical[0]);if(!cp)counts.nonLocalCanonical++;else if(cp!==p)counts.nonSelfCanonical++;else if(!sitemapPages.has(p))counts.selfCanonicalNotInSitemap++;}
   if(!d.lang)counts.missingLang++;
   if(!d.ogTitle[0]||!d.ogDescription[0]||!d.ogImage[0])counts.missingOG++;
   if(!d.structured)counts.missingStructuredData++;
 }
 for(const p of sitemapPages)if(!staticRoutes.has(p))counts.sitemapWithoutStaticHtml++;
 counts.duplicateTitleGroups=[...titleCounts.values()].filter(n=>n>1).length;
 counts.duplicateDescriptionGroups=[...descCounts.values()].filter(n=>n>1).length;
 return {mode:'read-only-static-diagnostics',sitemaps:seenSitemaps.size,sitemapURLs:sitemapPages.size,sitemapErrors,counts,note:'Counts are review candidates, not all errors. Dynamic routes, redirects, intentional canonicals and structured-data eligibility need separate review. No Google indexing or ranking claim.'};
}
function selfTest(){
 const d=readHead('<html lang="hr"><head><title>Vijesti &amp; analiza</title><meta content="Opis" name="description"><link href="https://gnk-asg.hr/" rel="canonical"><meta name="robots" content="index,follow"></head></html>');
 assert.equal(d.title,'Vijesti & analiza');assert.equal(d.description[0],'Opis');assert.equal(d.canonical[0],ORIGIN+'/');assert.equal(d.lang,'hr');assert.equal(route('index.html'),'/');assert.equal(route('en/index.html'),'/en/');assert.equal(localPath(ORIGIN+'/en/'),'/en/');assert.equal(localPath('https://operator.gnk-asg.hr/en/'),null);assert.equal(localPath(ORIGIN+'/?q=1'),null);assert.ok(PRIVATE.test('/admin/newsroom100/'));assert.ok(!PRIVATE.test('/gnk-aktual/'));console.log('Whole-domain SEO: 11 parser and scope assertions passed.');
}
if(process.argv.includes('--self-test'))selfTest();else console.log(JSON.stringify(scan(path.resolve('apps/portal')),null,2));
