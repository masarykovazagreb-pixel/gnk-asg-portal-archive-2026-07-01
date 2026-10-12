#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const failures=[];
const files={
  colHr:'apps/portal/gnk-aktual/kolumne/index.html',
  colEn:'apps/portal/en/gnk-aktual/columns/index.html',
  authHr:'apps/portal/autorske-objave/index.html',
  authEn:'apps/portal/en/autorske-objave/index.html',
  profileHr:'apps/portal/nermin-sefic/index.html',
  profileEn:'apps/portal/en/nermin-sefic/index.html',
  approved:'apps/portal/data/approved_mentions.json'
};
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

for(const [name,p] of Object.entries({colHr:files.colHr,colEn:files.colEn,authHr:files.authHr,authEn:files.authEn})){
  const html=read(p);
  if(/<meta\s+name=["']keywords["']/i.test(html)) failures.push(name+': meta keywords are forbidden');
  if(!html.includes('rel="author"')) failures.push(name+': rel=author missing');
  if(!html.includes('"@type":"Person"')) failures.push(name+': Person schema missing');
  if(!html.includes('"@type":"CollectionPage"')) failures.push(name+': CollectionPage schema missing');
  if(!html.includes('"@type":"ItemList"')) failures.push(name+': ItemList schema missing');
  if(!html.includes('Nermin Sefić')) failures.push(name+': canonical author spelling missing');
  if(/#NerminSefi[cć][A-Za-zČĆŽŠĐčćžšđ]+/.test(html)) failures.push(name+': unsupported author hashtag variant');
}

for(const [name,p] of Object.entries({profileHr:files.profileHr,profileEn:files.profileEn})){
  const html=read(p);
  if(!html.includes('gnk-aktual/')) failures.push(name+': AKTUAL author hub link missing');
  if(!html.includes('autorske-objave/')) failures.push(name+': author publications link missing');
  if(!html.includes('"subjectOf"')) failures.push(name+': Person subjectOf graph missing');
}

const approved=JSON.parse(read(files.approved));
if(approved.approved_scope!=='all_articles_with_author_box') failures.push('approved_mentions: approved_scope changed');
if(!Array.isArray(approved.approved_urls)||approved.approved_urls.length<1) failures.push('approved_mentions: approved URLs missing');

console.log(JSON.stringify({version:'NERMIN_AUTHOR_SEO_V1',approved_urls:approved.approved_urls.length,failures},null,2));
if(failures.length) process.exit(1);
