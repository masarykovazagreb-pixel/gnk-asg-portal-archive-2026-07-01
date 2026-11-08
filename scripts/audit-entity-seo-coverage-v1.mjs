#!/usr/bin/env node
/* GNK ASG / AKTUAL MEDIA SEO quality gate. Read-only; no keyword stuffing.
   Usage: node scripts/audit-entity-seo-coverage-v1.mjs
   Optional: SEO_REPORT_PATH=/tmp/seo.json node ...
   Inspects all static HTML pages and linked XML sitemaps, including images. */
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';
const root='apps/portal';
const entities=[
 {id:'nermin-sefic',re:/\bNermin\s+Sefi[cć]\b|\bSefi[cć]\s+Nermin\b/iu,profile:'/nermin-sefic/'},
 {id:'aktual-media',re:/\bAktual\s+Media\b/iu,profile:'/gnk-aktual/'},
 {id:'gnk-asg',re:/\bGNK\s+ASG\b/iu,profile:'/'},
 {id:'gnk-dinamo-ltd',re:/\bGNK\s+DINAMO\s+Ltd\.?\b/iu,profile:'/usa/'}
];
const results={generatedAt:new Date().toISOString(),pages:0,images:0,entityPages:{},issues:[],sitemaps:[]};
async function walk(path){let out=[];for(const entry of await readdir(path,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const full=join(path,entry.name);if(entry.isDirectory())out.push(...await walk(full));else out.push(full);}return out}
const files=await walk(root);
const xmlFiles=files.filter(f=>/(^|\/)sitemap[^/]*\.xml$|\/[^/]+-sitemap\.xml$/i.test(f));
const sitemapText=(await Promise.all(xmlFiles.map(x=>readFile(x,'utf8')))).join('\n');
for(const f of xmlFiles){const t=await readFile(f,'utf8');results.sitemaps.push({file:relative(root,f).split(sep).join('/'),urls:(t.match(/<loc>/g)||[]).length});}
for(const f of files.filter(f=>/\/index\.html$/.test(f)||/\.html$/.test(f))){const s=await readFile(f,'utf8');results.pages++;const p=relative(root,f).split(sep).join('/');const head=s.split(/<\/head\s*>/i)[0];const plain=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ');
const add=(type,details)=>results.issues.push({page:p,type,...(details?{details}:{})});
const excluded=/\bnoindex\b/i.test(head)||/(^|\/)(admin|control|api)\//.test(p);
const canon=head.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
if(!excluded){if(!canon)add('missing-canonical');if(!(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()))add('missing-title');if(!/<meta\b[^>]*name=["']description["']/i.test(head))add('missing-description');
if(!/property=["']og:image["']/i.test(head))add('missing-og-image');if(!/application\/ld\+json/i.test(head))add('missing-jsonld');
if(canon&&!sitemapText.includes('<loc>'+canon+'</loc>'))add('missing-primary-sitemap-entry',{canonical:canon});}
for(const e of entities){if(e.re.test(plain)){results.entityPages[e.id]=(results.entityPages[e.id]||0)+1;if(!plain.includes(e.profile)&&!excluded)add('entity-unlinked',{entity:e.id,target:e.profile});}}
for(const m of s.matchAll(/<img\b[^>]*>/gi)){results.images++;if(!/\balt\s*=\s*(["'][^"']*["']|[^\s>]+)/i.test(m[0]))add('image-missing-alt',{image:m[0].slice(0,160)});}
if((head.match(/<link\b[^>]*rel=["']canonical["']/gi)||[]).length>1)add('multiple-canonicals');
if((head.match(/<meta\b[^>]*name=["']description["']/gi)||[]).length>1)add('multiple-descriptions');
}
const report=JSON.stringify(results,null,2)+'\n';
if(process.env.SEO_REPORT_PATH)await writeFile(process.env.SEO_REPORT_PATH,report);
console.log(JSON.stringify({pages:results.pages,images:results.images,entityPages:results.entityPages,sitemaps:results.sitemaps.length,issueCount:results.issues.length,issuesByType:results.issues.reduce((a,v)=>(a[v.type]=(a[v.type]||0)+1,a),{})},null,2));
if(process.env.SEO_STRICT==='1'&&results.issues.length)process.exitCode=1;
