#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const reg=JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json','utf8'));
const sitemap=fs.readFileSync('apps/portal/editorial-sitemap.xml','utf8');
const indexes={
  objava:fs.readFileSync('apps/portal/objave/index.html','utf8'),
  komentar:fs.readFileSync('apps/portal/komentari/index.html','utf8'),
  analiza:fs.readFileSync('apps/portal/analize/index.html','utf8')
};
const missingFiles=[],missingIndex=[],missingSitemap=[],seo=[],authorSignal=[];
const images=new Map();

for(const item of reg.items||[]){
  const file='apps/portal'+item.path+'index.html';
  if(!fs.existsSync(file)){missingFiles.push(item.path);continue;}
  const html=fs.readFileSync(file,'utf8');
  for(const [label,rx] of [
    ['title',/<title>[^<]+<\/title>/i],
    ['description',/<meta\s+name=["']description["'][^>]+content=["'][^"']+/i],
    ['canonical',/<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/gnk-asg\.hr\//i],
    ['robots',/<meta\s+name=["']robots["'][^>]+content=["'][^"']*index/i],
    ['og:title',/<meta\s+property=["']og:title["']/i],
    ['og:image',/<meta\s+property=["']og:image["']/i],
    ['jsonld',/application\/ld\+json/i]
  ]) if(!rx.test(html))seo.push(item.path+': '+label);
  if(item.language==='hr'&&indexes[item.type]&&!indexes[item.type].includes('href="'+item.path+'"'))missingIndex.push(item.path);
  if(!sitemap.includes('<loc>'+item.url+'</loc>'))missingSitemap.push(item.url);
  if(item.image)images.set(item.image,(images.get(item.image)||0)+1);
  if(/<meta\s+name=["']author["']\s+content=["']Nermin Sefić["']/i.test(html)){
    const hasAuthor=/rel=["']author["']|article:author|"author"\s*:\s*\{/i.test(html);
    const hasTag=/#NerminSefić|#NerminSefic/.test(html);
    if(!hasAuthor||!hasTag)authorSignal.push({path:item.path,hasAuthor,hasTag});
  }
}
const reused=[...images.entries()].filter(([,n])=>n>3).sort((a,b)=>b[1]-a[1]);
const maxReuse=reused[0]?.[1]||0;
const report={version:'EDITORIAL_PUBLICATION_COMPLETENESS_V1',total:reg.total,missingFiles,missingIndex,missingSitemap,seo,authorSignal,maxImageReuse:maxReuse,reusedImages:reused.slice(0,30)};
fs.mkdirSync('artifacts/editorial',{recursive:true});
fs.writeFileSync('artifacts/editorial/publication-completeness-v1.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,reusedImages:report.reusedImages.slice(0,10)},null,2));
assert.equal(missingFiles.length,0,'published registry routes missing HTML');
assert.equal(missingIndex.length,0,'published HR routes missing collection listing');
assert.equal(missingSitemap.length,0,'published routes missing editorial sitemap');
assert.equal(seo.length,0,'published routes have incomplete SEO');
assert.ok(maxReuse<=33,'image reuse exceeded current all-language baseline; do not worsen duplication');
