#!/usr/bin/env node
/**
 * One-command HR News publication builder.
 *
 * Usage:
 *   node scripts/hr-news-one-command-v1.mjs content/hr-news/approved/example.json
 *
 * Creates an original (not syndicated) HTML report with an original SVG cover
 * and source citations. Refuses publication when provenance or approval missing.
 * Git merge, protected Cloudflare deploy and public HTTP proof remain separate.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const input=process.argv[2];
if(!input){console.error('usage: node scripts/hr-news-one-command-v1.mjs <reviewed-submission.json>');process.exit(64);}
const item=JSON.parse(fs.readFileSync(input,'utf8'));
const required=(condition,message)=>{if(!condition)throw new Error('HR NEWS release gate: '+message);};
const safeUrl=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!u.hostname)return null;return u.href;}catch{return null;}};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=String(item.slug||'');
required(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),'slug must be safe');
required(item.approvedForPublication===true,'explicit editorial release approval required');
required(item.originalWork===true,'text must be original');
required(typeof item.title==='string'&&item.title.length>=18&&item.title.length<=135,'title length 18-135');
required(typeof item.description==='string'&&item.description.length>=80&&item.description.length<=240,'original description 80-240');
required(Array.isArray(item.paragraphs)&&item.paragraphs.length>=4,'at least four original paragraphs');
required(item.paragraphs.every(x=>typeof x==='string'&&x.length>=100),'every paragraph at least 100 characters');
required(item.paragraphs.join(' ').length>=650,'article text too short');
required(Array.isArray(item.sources)&&item.sources.length>=2,'at least two source references');
const hosts=new Set();
for(const source of item.sources){
 required(source&&source.name&&safeUrl(source.url),'each source requires name and HTTPS URL');
 required(source.checkedAt&&Number.isFinite(Date.parse(source.checkedAt)),'each source requires checkedAt timestamp');
 required(typeof source.factSupported==='string'&&source.factSupported.length>=15,'source must identify supported fact');
 hosts.add(new URL(source.url).hostname.toLowerCase());
}
required(hosts.size>=2,'at least two independent source domains');
required(item.editorialEvidenceReviewed===true,'fact verification requires human editorial review');
required(Array.isArray(item.hashtags)&&item.hashtags.length<=5,'at most five hashtags');
required(item.hashtags.every(x=>/^#[\p{L}\p{N}_]+$/u.test(x)),'invalid hashtag');
required(typeof item.publishedAt==='string'&&item.publishedAt.length>=20,'explicit immutable publishedAt timestamp required');
const date=new Date(item.publishedAt);
required(Number.isFinite(date.getTime()),'publication timestamp invalid');
const base='https://gnk-asg.hr/news/clanci/'+slug+'/';
const cover='/assets/editorial/hr-news/'+slug+'.svg';
const hash=crypto.createHash('sha256').update(slug+item.title).digest('hex');
const hue=parseInt(hash.slice(0,2),16)%65+192;
const art=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="a b"><title id="a">${esc(item.title)}</title><desc id="b">Izvorna konceptualna ilustracija AKTUAL MEDIA, izrađena za članak.</desc><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},65%,21%)"/><stop offset="1" stop-color="#06111f"/></linearGradient><radialGradient id="r"><stop stop-color="#ebc678" stop-opacity=".8"/><stop offset="1" stop-color="#ebc678" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="960" cy="300" r="380" fill="url(#r)" opacity=".28"/><circle cx="950" cy="300" r="250" fill="none" stroke="#e8c073" stroke-opacity=".65" stroke-width="3"/><circle cx="950" cy="300" r="170" fill="none" stroke="#e8c073" stroke-opacity=".35" stroke-width="2"/><path d="M80 450 Q370 120 700 425 T1160 180" fill="none" stroke="#e8c073" stroke-opacity=".45" stroke-width="4"/><path d="M100 100 L600 100" stroke="#ffffff" stroke-opacity=".3"/><path d="M100 520 L600 520" stroke="#ffffff" stroke-opacity=".3"/><text x="96" y="170" font-family="system-ui, sans-serif" font-weight="800" font-size="56" fill="#ffffff">AKTUAL</text><text x="96" y="235" font-family="system-ui, sans-serif" font-weight="800" font-size="56" fill="#ebc678">HR NEWS</text><text x="96" y="485" font-family="system-ui, sans-serif" font-weight="650" font-size="22" fill="#dce5ef">Izvorna urednička ilustracija</text></svg>`;
const sources=item.sources.map((x,i)=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(x.name)}</a> — ${esc(x.factSupported)}</li>`).join('');
const paragraphs=item.paragraphs.map(x=>'<p>'+esc(x)+'</p>').join('\n');
const schema={ '@context':'https://schema.org','@type':'NewsArticle',headline:item.title,description:item.description,inLanguage:'hr',url:base,datePublished:date.toISOString(),dateModified:date.toISOString(),image:'https://gnk-asg.hr'+cover,publisher:{'@type':'Organization',name:'AKTUAL MEDIA',url:'https://gnk-asg.hr/gnk-aktual/'},author:item.authorName?{'@type':'Person',name:item.authorName}:{'@type':'Organization',name:'Uredništvo AKTUAL MEDIA'}};
const html=`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.title)} | HR News</title><meta name="description" content="${esc(item.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${base}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><meta property="og:type" content="article"><meta property="og:title" content="${esc(item.title)}"><meta property="og:description" content="${esc(item.description)}"><meta property="og:url" content="${base}"><meta property="og:image" content="https://gnk-asg.hr${cover}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><style>:root{color-scheme:dark}*{box-sizing:border-box}body{background:#08131e;color:#f2f5f8;font:17px/1.78 system-ui,sans-serif;margin:0}main{max-width:900px;padding:30px 18px 70px;margin:auto}a{color:#f2cc85}header{padding:20px;border-bottom:1px solid #2e4556}header a{text-decoration:none;font-weight:800}h1{font:700 clamp(32px,5vw,55px)/1.14 Georgia,serif;letter-spacing:-.02em}h2{font:700 25px Georgia,serif;margin-top:40px}p{margin:20px 0}figure{margin:30px 0}figure img{width:100%;height:auto;border-radius:12px}figcaption{color:#9fb3c7;font-size:13px}.lead{font-size:21px;color:#d0dce8}.meta{color:#aabaca;font-size:13px}li{margin:10px 0}</style></head><body><header><a href="/news/">AKTUAL MEDIA · HR NEWS</a></header><main><p class="meta">AUTORSKI ČLANAK · ${esc(date.toISOString().slice(0,10))} · ${esc(item.authorName||'Uredništvo AKTUAL MEDIA')}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.description)}</p><figure><img src="${cover}" alt="Izvorna ilustracija: ${esc(item.title)}" width="1200" height="630"><figcaption>Originalna urednička ilustracija AKTUAL MEDIA. Fotografije drugih izdavača nisu preuzete.</figcaption></figure><article>${paragraphs}</article><h2>Provjerljivi izvori</h2><ol>${sources}</ol><p class="meta">Izvori su navedeni radi provjere iznesenih činjenica. Izvorni tekst i ilustracija pripadaju AKTUAL MEDIA; ne tvrdimo da su vanjski izdavači partneri.</p><p>${(item.hashtags||[]).map(esc).join(' ')}</p><p><a href="/news/">Natrag na HR News</a></p></main></body></html>`;
const siteRoot=process.env.HR_NEWS_BUILD_ROOT||'apps/portal';
const dir=path.join(siteRoot,'news/clanci',slug);
const img=path.join(siteRoot,'assets/editorial/hr-news',slug+'.svg');
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.dirname(img),{recursive:true});
fs.writeFileSync(path.join(dir,'index.html'),html);
fs.writeFileSync(img,art);
const indexPath=path.join(siteRoot,'data/hr-news-original-v1.json');
fs.mkdirSync(path.dirname(indexPath),{recursive:true});
let existing=[];if(fs.existsSync(indexPath)){try{const body=JSON.parse(fs.readFileSync(indexPath,'utf8'));existing=Array.isArray(body.items)?body.items:[];}catch{}}
const itemInfo={slug,title:item.title,description:item.description,url:base,image:cover,imageRights:'AKTUAL MEDIA original SVG illustration',author:item.authorName||'Uredništvo AKTUAL MEDIA',publishedAt:date.toISOString(),sourceCount:item.sources.length};
existing=[itemInfo,...existing.filter(x=>x.slug!==slug)].sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0,250);
fs.writeFileSync(indexPath,JSON.stringify({version:1,originalReviewedArticles:existing.length,items:existing},null,2)+'\n');
console.log(JSON.stringify({ok:true,url:base,created:[path.join(dir,'index.html'),img],sourceDomains:hosts.size,originalArtwork:true,requiresProtectedMergeAndDeploy:true}));
