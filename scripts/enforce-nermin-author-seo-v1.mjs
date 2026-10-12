#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='apps/portal/gnk-aktual/kolumne';
const WRITE=process.argv.includes('--write');
const PERSON='https://gnk-asg.hr/nermin-sefic/';
const PERSON_ID='https://gnk-asg.hr/nermin-sefic/#person';
const AUTHOR_MARK='<p class="article-author-mark" data-author-mark="nermin-sefic">#NerminSefić #NerminSefic</p>';

function walk(dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p,out);
    else if(ent.isFile()&&ent.name==='index.html') out.push(p);
  }
  return out;
}
function cleanKeywords(html){
  return html.replace(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']\s*\/?>/gi,(full,content)=>{
    const kept=String(content).split(',').map(x=>x.trim()).filter(Boolean).filter(x=>!/(?:nermin|sefi[cć])/i.test(x));
    return kept.length?'<meta name="keywords" content="'+kept.join(', ')+'">':'';
  });
}
function normalizeAuthorMarks(html){
  html=html.replace(/<p[^>]*class=["'][^"']*(?:article-author-mark|author-hashtags)[^"']*["'][^>]*>[^<]*(?:#NerminSefić|#NerminSefic|#SefićNermin|#SeficNermin)[^<]*<\/p>/gi,'');
  if(html.includes('</article>')) return html.replace('</article>',AUTHOR_MARK+'</article>');
  if(html.includes('</main>')) return html.replace('</main>',AUTHOR_MARK+'</main>');
  return html+AUTHOR_MARK;
}
function addRelAuthor(html){
  if(/<link\s+rel=["']author["']/i.test(html)) return html;
  const canonical=html.match(/<link\s+rel=["']canonical["'][^>]*>/i);
  if(canonical) return html.replace(canonical[0],canonical[0]+'<link rel="author" href="'+PERSON+'">');
  return html.replace('</head>','<link rel="author" href="'+PERSON+'"></head>');
}
function strengthenSchema(html){
  return html.replace(/"author"\s*:\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"Nermin Sefić"\s*\}/g,
    '"author":{"@type":"Person","@id":"'+PERSON_ID+'","name":"Nermin Sefić","url":"'+PERSON+'"}');
}

const files=walk(ROOT);
const report={version:'NERMIN_AUTHOR_SEO_V1',scanned:files.length,eligible:0,changed:0,violations:[]};
for(const file of files){
  const original=fs.readFileSync(file,'utf8');
  if(!/<meta\s+name=["']author["']\s+content=["']Nermin Sefić["']/i.test(original)) continue;
  report.eligible++;
  let html=original;
  html=cleanKeywords(html);
  html=addRelAuthor(html);
  html=strengthenSchema(html);
  html=normalizeAuthorMarks(html);
  const authorKeyword=html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
  if(authorKeyword&&/(?:nermin|sefi[cć])/i.test(authorKeyword[1])) report.violations.push(file+': author remains in meta keywords');
  const marks=[...html.matchAll(/data-author-mark=["']nermin-sefic["']/g)].length;
  if(marks!==1) report.violations.push(file+': expected exactly one canonical author mark, found '+marks);
  if(!html.includes('rel="author" href="'+PERSON+'"')) report.violations.push(file+': rel=author missing');
  if(html!==original){
    report.changed++;
    if(WRITE) fs.writeFileSync(file,html);
  }
}
console.log(JSON.stringify(report,null,2));
if(report.violations.length) process.exit(1);
