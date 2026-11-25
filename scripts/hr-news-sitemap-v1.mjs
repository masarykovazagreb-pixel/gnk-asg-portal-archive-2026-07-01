#!/usr/bin/env node
/* Own HR News original-article sitemap. External source links are NEVER
 * included as our pages. No phantom URLs; all original routes must exist. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.HR_NEWS_BUILD_ROOT||'apps/portal';
const manifest=path.join(root,'data/hr-news-original-v1.json');
const items=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')).items||[]:[];
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const valid=items.filter(x=>{
 if(!x||!x.slug||!x.url||!x.publishedAt)return false;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug))return false;
 if(x.url!=='https://gnk-asg.hr/news/clanci/'+x.slug+'/')return false;
 return fs.existsSync(path.join(root,'news/clanci',x.slug,'index.html'));
});
const rows=['https://gnk-asg.hr/news/',...valid.map(x=>x.url)].map(url=>{
 const date=valid.find(x=>x.url===url)?.publishedAt||'2026-11-23';
 return '  <url><loc>'+esc(url)+'</loc><lastmod>'+new Date(date).toISOString().slice(0,10)+'</lastmod></url>';
});
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+rows.join('\n')+'\n</urlset>\n';
const out=path.join(root,'news/sitemap.xml');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,xml);
console.log(JSON.stringify({sitemap:'/news/sitemap.xml',urls:rows.length,reviewedOriginalArticles:valid.length,externalLinksExcluded:true}));
