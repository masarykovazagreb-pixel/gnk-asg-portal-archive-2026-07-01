import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORTAL_ROOT=path.resolve('apps/portal');
const REPORT_ROOT=path.join(PORTAL_ROOT,'test-results','visual-contrast');
const PROJECTS=['chromium-desktop','chromium-mobile'];
const IGNORED_DIRECTORIES=new Set(['node_modules','test-results','playwright-report','.git']);
function walkHtml(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&&IGNORED_DIRECTORIES.has(entry.name))continue;
    const absolute=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walkHtml(absolute));
    else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))out.push(absolute);
  }
  return out;
}
function routeForFile(file){
  const relative=path.relative(PORTAL_ROOT,file).split(path.sep).join('/');
  if(relative==='index.html')return '/';
  if(relative.endsWith('/index.html'))return `/${relative.slice(0,-'index.html'.length)}`;
  return `/${relative}`;
}
const safeName=value=>value.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9._-]+/gi,'-')||'index';
const reportName=value=>`${safeName(value)}-${crypto.createHash('sha1').update(value).digest('hex').slice(0,12)}`;
const routes=[...new Set(walkHtml(PORTAL_ROOT).map(routeForFile))].sort();
const errors=[];
let reports=0;
for(const project of PROJECTS){
  const projectDir=path.join(REPORT_ROOT,project);
  for(const route of routes){
    const stem=reportName(route),failure=path.join(projectDir,`${stem}.failure.json`),report=path.join(projectDir,`${stem}.json`);
    if(fs.existsSync(failure)){errors.push(`${project} ${route}: failure evidence exists`);continue;}
    if(!fs.existsSync(report)){errors.push(`${project} ${route}: missing report`);continue;}
    reports++;
    let data;
    try{data=JSON.parse(fs.readFileSync(report,'utf8'));}catch(error){errors.push(`${project} ${route}: invalid JSON ${error.message}`);continue;}
    if(data?.runtime?.state!=='hardened-v4')errors.push(`${project} ${route}: runtime=${data?.runtime?.state||'missing'}`);
    if(Number(data?.totalViolations||0)!==0)errors.push(`${project} ${route}: violations=${data.totalViolations}`);
  }
}
const expected=routes.length*PROJECTS.length;
if(reports!==expected)errors.push(`report count ${reports}/${expected}`);
const summary={ok:errors.length===0,version:'GNK_VISUAL_CONTRAST_RESULT_VALIDATOR_V1',routes:routes.length,projects:PROJECTS.length,expectedReports:expected,reports,errors:errors.slice(0,100)};
console.log(JSON.stringify(summary,null,2));
if(errors.length)process.exitCode=1;
