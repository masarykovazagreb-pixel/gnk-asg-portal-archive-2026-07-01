#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='apps/portal';
const OUT='artifacts/seo/aktual-all-pages-matrix-v2.json';
const roots=[
  path.join(ROOT,'gnk-aktual'),
  path.join(ROOT,'en','gnk-aktual')
];

function walk(dir,out=[]){
  if(!fs.existsSync(dir)) return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p,out);
    else if(ent.isFile()&&ent.name==='index.html') out.push(p);
  }
  return out;
}
const pages=[...new Set(roots.flatMap(r=>walk(r)))].sort();
const critical=[],review=[],rows=[];
const canonicalOwners=new Map();

const extract=(html,rx)=>(html.match(rx)||[])[1]||'';
const has=(html,rx)=>rx.test(html);
const norm=s=>String(s||'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').trim();

for(const file of pages){
  const html=fs.readFileSync(file,'utf8');
  const title=norm(extract(html,/<title>([^<]+)<\/title>/i));
  const desc=norm(extract(html,/<meta\s+name=["']description["'][^>]+content=["']([^"']*)["']/i));
  const robots=norm(extract(html,/<meta\s+name=["']robots["'][^>]+content=["']([^"']*)["']/i)).toLowerCase();
  const canonical=norm(extract(html,/<link\s+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i));
  const ogTitle=norm(extract(html,/<meta\s+property=["']og:title["'][^>]+content=["']([^"']*)["']/i));
  const ogDesc=norm(extract(html,/<meta\s+property=["']og:description["'][^>]+content=["']([^"']*)["']/i));
  const ogUrl=norm(extract(html,/<meta\s+property=["']og:url["'][^>]+content=["']([^"']*)["']/i));
  const ogImage=norm(extract(html,/<meta\s+property=["']og:image["'][^>]+content=["']([^"']*)["']/i));
  const twCard=norm(extract(html,/<meta\s+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i));
  const keywords=norm(extract(html,/<meta\s+name=["']keywords["'][^>]+content=["']([^"']*)["']/i));
  const isNoindex=/\bnoindex\b/.test(robots);
  const isIndexable=!isNoindex;
  const looksArticle=/<article\b/i.test(html)||/"@type":"(?:Article|NewsArticle|OpinionNewsArticle)"/.test(html);
  const hasArticleSchema=/"@type":"(?:Article|NewsArticle|OpinionNewsArticle)"/.test(html);
  const hasCollectionSchema=/"@type":"(?:CollectionPage|WebPage)"/.test(html);
  const hasHr=/<link\s+rel=["']alternate["'][^>]+hreflang=["']hr["']/i.test(html);
  const hasEn=/<link\s+rel=["']alternate["'][^>]+hreflang=["']en["']/i.test(html);
  const hasX=/<link\s+rel=["']alternate["'][^>]+hreflang=["']x-default["']/i.test(html);

  if(!title) critical.push(file+': missing title');
  if(!desc) critical.push(file+': missing meta description');
  if(!robots) critical.push(file+': missing robots');
  if(!canonical||!/^https:\/\/gnk-asg\.hr\//i.test(canonical)) critical.push(file+': missing/invalid canonical');

  if(keywords&&/(?:nermin|sefi[cć])/i.test(keywords)) critical.push(file+': author name present in meta keywords');
  const canonicalMarks=[...html.matchAll(/<p[^>]*data-author-mark=["']nermin-sefic["'][^>]*>\s*#NerminSefić\s+#NerminSefic\s*<\/p>/gi)];
  const withoutCanonicalMark=html.replace(/<p[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi,'');
  if(/#NerminSefić|#NerminSefic/i.test(withoutCanonicalMark)) critical.push(file+': Nermin author hashtag exists outside canonical author mark');
  if(/#(?:SefićNermin|SeficNermin|NerminSefi[cć][A-Za-zČĆŽŠĐčćžšđ]+)/i.test(html)) critical.push(file+': unsupported Nermin author hashtag variant');
  if(canonicalMarks.length>1) critical.push(file+': multiple canonical Nermin author marks');

  if(isIndexable){
    if(!/\bindex\b/.test(robots)) critical.push(file+': indexable page lacks explicit index robots');
    if(!ogTitle) critical.push(file+': missing og:title');
    if(!ogDesc) critical.push(file+': missing og:description');
    if(!ogUrl) critical.push(file+': missing og:url');
    if(!ogImage) critical.push(file+': missing og:image');
    if(!twCard) critical.push(file+': missing twitter:card');
    if(canonical){
      const owners=canonicalOwners.get(canonical)||[];
      owners.push(file);canonicalOwners.set(canonical,owners);
    }
    if(looksArticle&&!hasArticleSchema) review.push({file,type:'schema',issue:'article-like page lacks Article/NewsArticle schema'});
    if(!looksArticle&&!hasCollectionSchema) review.push({file,type:'schema',issue:'hub/non-article page lacks CollectionPage/WebPage schema'});
    if(!(hasHr&&hasEn&&hasX)) review.push({file,type:'hreflang',issue:'indexable page lacks complete hr/en/x-default hreflang set'});
  } else {
    if(!/\bfollow\b/.test(robots)) review.push({file,type:'robots',issue:'noindex page is not explicitly follow'});
  }

  if(title&&title.length>60) review.push({file,type:'title_length',value:title.length,title});
  if(title&&title.length<20) review.push({file,type:'title_length',value:title.length,title});
  if(desc&&(desc.length<70||desc.length>180)) review.push({file,type:'description_length',value:desc.length});
  if(isIndexable&&!/AKTUAL MEDIA/i.test(title+' '+html.slice(0,14000))) review.push({file,type:'brand',issue:'weak AKTUAL MEDIA brand signal'});
  if(isIndexable&&ogUrl&&canonical&&ogUrl!==canonical) review.push({file,type:'og_url',issue:'og:url differs from canonical',canonical,ogUrl});

  rows.push({
    file,indexable:isIndexable,title_length:title.length,description_length:desc.length,
    canonical,article_like:looksArticle,article_schema:hasArticleSchema,
    hreflang_complete:hasHr&&hasEn&&hasX,og_complete:!!(ogTitle&&ogDesc&&ogUrl&&ogImage),twitter_card:!!twCard
  });
}

for(const [canonical,owners] of canonicalOwners){
  if(owners.length>1) critical.push('duplicate indexable canonical '+canonical+': '+owners.join(', '));
}

const counts={
  pages:pages.length,
  indexable:rows.filter(x=>x.indexable).length,
  noindex:rows.filter(x=>!x.indexable).length,
  critical:critical.length,
  review:review.length,
  long_titles:review.filter(x=>x.type==='title_length'&&x.value>60).length,
  description_review:review.filter(x=>x.type==='description_length').length,
  hreflang_review:review.filter(x=>x.type==='hreflang').length,
  schema_review:review.filter(x=>x.type==='schema').length
};
const report={version:'AKTUAL_ALL_PAGES_META_MATRIX_V2',generatedAt:new Date().toISOString(),counts,critical,review,rows};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:report.version,counts,critical,review_sample:review.slice(0,20)},null,2));
if(critical.length) process.exit(1);
