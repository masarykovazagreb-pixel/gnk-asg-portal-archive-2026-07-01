#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOTS=['apps/portal/gnk-aktual','apps/portal/en/gnk-aktual'];
const WRITE=process.argv.includes('--write');
const PERSON='https://gnk-asg.hr/nermin-sefic/';
const AUTHOR_MARK='<p class="article-author-mark" data-author-mark="nermin-sefic">#NerminSefić #NerminSefic</p>';

function walk(dir,out=[]){
  if(!fs.existsSync(dir)) return out;
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
function canonicalAuthorMark(html){
  html=html.replace(/<p[^>]*class=["'][^"']*(?:article-author-mark|author-hashtags)[^"']*["'][^>]*>[^<]*(?:#NerminSefić|#NerminSefic|#SefićNermin|#SeficNermin)[^<]*<\/p>/gi,'');
  if(html.includes('</article>')) return html.replace('</article>',AUTHOR_MARK+'</article>');
  if(html.includes('</main>')) return html.replace('</main>',AUTHOR_MARK+'</main>');
  return html+AUTHOR_MARK;
}
function addRelAuthor(html){
  if(/<link\s+rel=["']author["']/i.test(html)) return html;
  const canonical=html.match(/<link\s+rel=["']canonical["'][^>]*>/i);
  return canonical?html.replace(canonical[0],canonical[0]+'<link rel="author" href="'+PERSON+'">'):html.replace('</head>','<link rel="author" href="'+PERSON+'"></head>');
}
function ensureOgSite(html){
  if(/<meta\s+property=["']og:site_name["']/i.test(html)) return html;
  return html.replace('</head>','<meta property="og:site_name" content="AKTUAL MEDIA"></head>');
}

const files=ROOTS.flatMap(r=>walk(r));
const report={version:'AKTUAL_SEO_V2',scanned:files.length,authorPages:0,changed:0,violations:[]};

for(const file of files){
  const original=fs.readFileSync(file,'utf8');
  let html=cleanKeywords(original);
  html=ensureOgSite(html);
  const hasCanonical=/<link\s+rel=["']canonical["']/i.test(html);
  const hasDescription=/<meta\s+name=["']description["']/i.test(html);
  if(!hasCanonical) report.violations.push(file+': canonical missing');
  if(!hasDescription) report.violations.push(file+': meta description missing');

  const authorPage=/<meta\s+name=["']author["']\s+content=["']Nermin Sefić["']/i.test(html)
    || /data-author-box/i.test(html)
    || /class=["'][^"']*author-box/i.test(html);
  if(authorPage){
    report.authorPages++;
    html=addRelAuthor(html);
    html=canonicalAuthorMark(html);
    const marks=[...html.matchAll(/data-author-mark=["']nermin-sefic["']/g)].length;
    if(marks!==1) report.violations.push(file+': expected exactly one canonical author mark, found '+marks);
    if(!html.includes('rel="author" href="'+PERSON+'"')) report.violations.push(file+': rel=author missing');
  }

  const kw=html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
  if(kw&&/(?:nermin|sefi[cć])/i.test(kw[1])) report.violations.push(file+': author remains in meta keywords');
  if(html!==original){
    report.changed++;
    if(WRITE) fs.writeFileSync(file,html);
  }
}
console.log(JSON.stringify(report,null,2));
if(report.violations.length) process.exit(1);
