#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='apps/portal';
const OUT='artifacts/seo/aktual-all-pages-matrix-v2.json';
const roots=[path.join(ROOT,'gnk-aktual'),path.join(ROOT,'en','gnk-aktual')];

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p,out);
    else if(ent.isFile()&&ent.name==='index.html')out.push(p);
  }
  return out;
}
const pages=[...new Set(roots.flatMap(r=>walk(r)))].sort();
const critical=[],review=[],rows=[],canonicalOwners=new Map();
const approvals=JSON.parse(fs.readFileSync(path.join(ROOT,'data','approved_mentions.json'),'utf8'));
const normalizeApproved=value=>{
  try{
    const raw=String(value||'').trim();
    const pathname=/^https?:\/\//i.test(raw)?new URL(raw).pathname:raw;
    return pathname.replace(/\/+$/,'')+'/';
  }catch{return '';}
};
const approved=new Set([...(approvals.approved_urls||[]),...(approvals.approved_items||[])]
  .map(x=>normalizeApproved(typeof x==='string'?x:(x?.url||x?.route||''))).filter(Boolean));
const extract=(html,rx)=>(html.match(rx)||[])[1]||'';
const has=(html,rx)=>rx.test(html);
const norm=s=>String(s||'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;|&#160;/g,' ').trim();
const attrValue=(tag,name)=>{
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,'i'));
  return match?norm(match[2]):'';
};
const metaValue=(html,keyAttribute,key)=>{
  for(const match of html.matchAll(/<meta\b[^>]*>/gi)){
    if(attrValue(match[0],keyAttribute).toLowerCase()===key.toLowerCase())return attrValue(match[0],'content');
  }
  return '';
};
const linkValue=(html,rel,key)=>{
  for(const match of html.matchAll(/<link\b[^>]*>/gi)){
    const rels=attrValue(match[0],'rel').toLowerCase().split(/\s+/);
    if(rels.includes(rel.toLowerCase()))return attrValue(match[0],key);
  }
  return '';
};

for(const file of pages){
  const html=fs.readFileSync(file,'utf8');
  const title=norm(extract(html,/<title>([^<]+)<\/title>/i));
  const desc=metaValue(html,'name','description');
  const robots=metaValue(html,'name','robots').toLowerCase();
  const canonical=linkValue(html,'canonical','href');
  const ogTitle=metaValue(html,'property','og:title');
  const ogDesc=metaValue(html,'property','og:description');
  const ogUrl=metaValue(html,'property','og:url');
  const ogImage=metaValue(html,'property','og:image');
  const twCard=metaValue(html,'name','twitter:card');
  const keywords=metaValue(html,'name','keywords');
  const isIndexable=!/\bnoindex\b/.test(robots);
  const relative=path.relative(ROOT,file).replace(/\\/g,'/').replace(/index\.html$/,'');
  const route=`/${relative}`;
  const selfCanonical=canonical===`https://gnk-asg.hr${route}`;
  const hasArticleSchema=/"@type"\s*:\s*"(?:Article|NewsArticle|OpinionNewsArticle)"/.test(html);
  const hasCollectionSchema=/"@type"\s*:\s*"(?:CollectionPage|WebPage)"/.test(html);
  // Listing cards commonly use <article> for semantic markup. Treat a page as
  // article-like only when it has Article schema, or when no page/collection
  // schema exists to describe its actual role.
  const looksArticle=hasArticleSchema||(!hasCollectionSchema&&/<article\b/i.test(html));
  const hasHr=/<link\s+rel=["']alternate["'][^>]+hreflang=["']hr["']/i.test(html);
  const hasEn=/<link\s+rel=["']alternate["'][^>]+hreflang=["']en["']/i.test(html);
  const hasX=/<link\s+rel=["']alternate["'][^>]+hreflang=["']x-default["']/i.test(html);

  if(!title)critical.push(file+': missing title');
  if(!desc)critical.push(file+': missing meta description');
  if(!robots)critical.push(file+': missing robots');
  if(!canonical||!/^https:\/\/gnk-asg\.hr\//i.test(canonical))critical.push(file+': missing/invalid canonical');
  if(keywords&&/(?:nermin|sefi[cć])/i.test(keywords))critical.push(file+': author name present in meta keywords');

  const canonicalMarks=[...html.matchAll(/<p[^>]*data-author-mark=["']nermin-sefic["'][^>]*>\s*#NerminSefić\s+#NerminSefic\s*<\/p>/gi)];
  const withoutCanonicalMark=html.replace(/<p[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi,'');
  // Owner decision (2026-10-20): #SeficNermin and #SEFICNERMIN are supported author hashtags,
  // but only on pages approved in data/approved_mentions.json — same rule as #NerminSefić/#NerminSefic.
  const supportedReverse=/#(?:SeficNermin|SEFICNERMIN)(?![A-Za-zČĆŽŠĐčćžšđ])/gi;
  const authorHashtag=/#(?:NerminSefić|NerminSefic|SeficNermin|SEFICNERMIN)/i;
  const hashtagsEverywhere=approvals.hashtag_scope==='all_pages';
  if(authorHashtag.test(withoutCanonicalMark)&&!hashtagsEverywhere&&!approved.has(normalizeApproved(canonical)))critical.push(file+': Nermin author hashtag exists on an unapproved page');
  const variantProbe=html.replace(supportedReverse,'');
  if(/#(?:SefićNermin|SeficNermin|NerminSefi[cć][A-Za-zČĆŽŠĐčćžšđ]+)/i.test(variantProbe))critical.push(file+': unsupported Nermin author hashtag variant');
  if(canonicalMarks.length>1)critical.push(file+': multiple canonical Nermin author marks');

  if(isIndexable){
    if(!/\bindex\b/.test(robots))critical.push(file+': indexable page lacks explicit index robots');
    if(!ogTitle)critical.push(file+': missing og:title');
    if(!ogDesc)critical.push(file+': missing og:description');
    if(!ogUrl)critical.push(file+': missing og:url');
    if(!ogImage)critical.push(file+': missing og:image');
    if(!twCard)critical.push(file+': missing twitter:card');
    if(canonical){
      const owners=canonicalOwners.get(canonical)||[];
      owners.push(file);canonicalOwners.set(canonical,owners);
    }
    if(looksArticle&&!hasArticleSchema)review.push({file,type:'schema',issue:'article-like page lacks Article/NewsArticle schema'});
    if(!looksArticle&&!hasCollectionSchema)review.push({file,type:'schema',issue:'hub/non-article page lacks CollectionPage/WebPage schema'});
    if(selfCanonical&&!(hasHr&&hasEn&&hasX))review.push({file,type:'hreflang',issue:'self-canonical indexable page lacks complete hr/en/x-default hreflang set'});
  }else if(!/\bfollow\b/.test(robots)){
    review.push({file,type:'robots',issue:'noindex page is not explicitly follow'});
  }

  if(title&&title.length>60)review.push({file,type:'title_length',value:title.length,title});
  if(title&&title.length<20)review.push({file,type:'title_length',value:title.length,title});
  if(desc&&(desc.length<70||desc.length>180))review.push({file,type:'description_length',value:desc.length});
  if(isIndexable&&!/AKTUAL MEDIA/i.test(title+' '+html.slice(0,14000)))review.push({file,type:'brand',issue:'weak AKTUAL MEDIA brand signal'});
  if(isIndexable&&ogUrl&&canonical&&ogUrl!==canonical)review.push({file,type:'og_url',issue:'og:url differs from canonical',canonical,ogUrl});

  rows.push({file,indexable:isIndexable,title_length:title.length,description_length:desc.length,canonical,self_canonical:selfCanonical,article_like:looksArticle,article_schema:hasArticleSchema,hreflang_required:selfCanonical,hreflang_complete:hasHr&&hasEn&&hasX,og_complete:!!(ogTitle&&ogDesc&&ogUrl&&ogImage),twitter_card:!!twCard});
}
for(const [canonical,owners] of canonicalOwners){
  if(owners.length>1)critical.push('duplicate indexable canonical '+canonical+': '+owners.join(', '));
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
const report={version:'AKTUAL_ALL_PAGES_META_MATRIX_V2_CURRENT_MAIN',generatedAt:new Date().toISOString(),counts,critical,review,rows};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:report.version,counts,critical,review_sample:review.slice(0,20)},null,2));
if(critical.length)process.exit(1);
