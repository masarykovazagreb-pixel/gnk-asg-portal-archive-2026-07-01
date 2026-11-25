#!/usr/bin/env node
/**
 * Priority brand-search gate: SEO signals are verifiable in source.
 * This checks indexability instructions, not real Google index status or ranking.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE='apps/portal/';
const pages=[
  {path:'index.html',canonical:'https://gnk-asg.hr/',label:'GNK ASG'},
  {path:'gnk-aktual/index.html',canonical:'https://gnk-asg.hr/gnk-aktual/',label:'AKTUAL MEDIA'},
  {path:'nermin-sefic/index.html',canonical:'https://gnk-asg.hr/nermin-sefic/',label:'Nermin Sefić'}
];
function title(s){return /<title[^>]*>([^<]+)<\/title>/i.exec(s)?.[1]||''}
function description(s){return /<meta\s+name="description"\s+content="([^"]+)"/i.exec(s)?.[1]||''}
for(const page of pages){
  const html=fs.readFileSync(BASE+page.path,'utf8');
  const ts=title(html),desc=description(html);
  assert.ok(ts.includes(page.label),page.path+': missing brand in title');
  assert.ok(desc.length>=70 && desc.length<=165,page.path+': concise unique meta description required ('+desc.length+')');
  assert.equal([...html.matchAll(/<link\s+rel="canonical"/gi)].length,1,page.path+': one canonical');
  assert.ok(html.includes('rel="canonical" href="'+page.canonical+'"'),page.path+': exact canonical mismatch');
  assert.ok(!/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),page.path+': accidentally noindex');
  assert.ok(html.includes('<main'),page.path+': must contain user-visible main content');
}
const home=fs.readFileSync(BASE+'index.html','utf8');
const aktual=fs.readFileSync(BASE+'gnk-aktual/index.html','utf8');
const nermin=fs.readFileSync(BASE+'nermin-sefic/index.html','utf8');
assert.match(home,/id="am-brand-home-heading"/,'Home page must expose a permanent, semantic brand link');
assert.match(home,/href="\/nermin-sefic\/"/,'Home page must link to Nermin profile');
assert.match(aktual,/id="am-brand-search-heading"/,'AKTUAL MEDIA needs on-page editorial identity');
assert.match(aktual,/href="\/nermin-sefic\/"/,'Editorial identity must link to Nermin');
assert.match(nermin,/href="\/gnk-aktual\/"/,'Person page must link back to editorial portal');
assert.ok(!description(aktual).includes('38003'),'Meta description must not depend on generated article counter');
const robots=fs.readFileSync(BASE+'robots.txt','utf8');
assert.match(robots,/User-agent: \*\s+Allow: \//,'Public crawl must be allowed');
const sitemap=fs.readFileSync(BASE+'sitemap.xml','utf8');
for(const page of pages){
  assert.ok(sitemap.includes('<loc>'+page.canonical+'</loc>'),page.path+': canonical URL absent from sitemap');
}
console.log(JSON.stringify({ok:true,checked:pages.length,canonical:true,publicCrawlerAllowed:true,brandIdentityLinks:true,googleRankingGuaranteed:false}));
