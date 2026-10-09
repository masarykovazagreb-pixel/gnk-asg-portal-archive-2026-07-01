import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const APPROVAL_FILE=path.join(ROOT,'data/approved_mentions.json');
const CANONICAL_AUTHOR_TAGS=['#NerminSefić','#NerminSefic'];
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const authorToken=value=>/nermin|sefic/.test(fold(value).replace(/[^a-z]/g,''));
const normalizePath=value=>{
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(/^https?:\/\//i.test(raw)){
    try{return new URL(raw).pathname.replace(/\/+$/,'')+'/';}catch{return ''}
  }
  if(raw.startsWith('/'))return raw.replace(/\/+$/,'')+'/';
  return raw;
};
const approval=JSON.parse(fs.readFileSync(APPROVAL_FILE,'utf8'));
if(approval.approved_scope!=='all_articles_with_author_box')throw new Error('Unexpected approved_scope');
const approved=new Set((approval.approved_urls||[]).map(normalizePath).filter(Boolean));
for(const item of approval.approved_items||[]){
  const value=typeof item==='string'?item:(item?.url||item?.route||'');
  const key=normalizePath(value); if(key)approved.add(key);
}

function walk(dir,out=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}
function canonicalPath(html){
  const match=html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ||html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return match?normalizePath(match[1]):'';
}
function cleanKeywordMeta(html){
  return html.replace(/<meta\b[^>]*\bname=["'](?:keywords|news_keywords)["'][^>]*>/gi,tag=>{
    const m=tag.match(/\bcontent=(["'])(.*?)\1/i);
    if(!m)return tag;
    const cleaned=m[2].split(',').map(x=>x.trim()).filter(Boolean).filter(x=>!authorToken(x)).join(', ');
    return tag.replace(m[0],`content=${m[1]}${cleaned}${m[1]}`);
  });
}
function normalizeHashtagBlock(inner,isApproved){
  const tokens=String(inner).match(/#[^\s<]+/g)||[];
  const topical=[]; const seen=new Set();
  for(const token of tokens){
    if(authorToken(token))continue;
    const key=fold(token);
    if(seen.has(key))continue;
    seen.add(key); topical.push(token);
  }
  if(isApproved){
    const gnkIndex=topical.findIndex(x=>fold(x)==='#gnkasg');
    if(gnkIndex>=0)topical.splice(gnkIndex+1,0,...CANONICAL_AUTHOR_TAGS);
    else topical.unshift(...CANONICAL_AUTHOR_TAGS);
  }
  return topical.join(' ');
}
let filesChanged=0,keywordTagsChanged=0,hashtagBlocksChanged=0,approvedTouched=0;
for(const file of walk(ROOT)){
  let html=fs.readFileSync(file,'utf8');
  const before=html;
  const route=canonicalPath(html);
  const isApproved=approved.has(route);
  const metaBefore=html;
  html=cleanKeywordMeta(html);
  if(html!==metaBefore)keywordTagsChanged++;
  html=html.replace(/<p\s+class=["']([^"']*\b(?:article-hashtags|article-tags)\b[^"']*)["']>([\s\S]*?)<\/p>/gi,(whole,cls,inner)=>{
    const next=normalizeHashtagBlock(inner,isApproved);
    const replacement=`<p class="${cls}">${next}</p>`;
    if(replacement!==whole)hashtagBlocksChanged++;
    return replacement;
  });
  if(isApproved&&html!==before)approvedTouched++;
  if(html!==before){fs.writeFileSync(file,html);filesChanged++;}
}
console.log(JSON.stringify({approved_scope:approval.approved_scope,approved_urls:approved.size,filesChanged,keywordTagsChanged,hashtagBlocksChanged,approvedTouched,legacyTouched:false},null,2));
