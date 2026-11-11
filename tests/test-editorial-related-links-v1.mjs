#!/usr/bin/env node
/** Guard: never advertise an unpublished local related article as a live link. */
import fs from 'node:fs';
import path from 'node:path';
const root='apps/portal/objave';
const problems=[];let checked=0,links=0;
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const file=path.join(root,entry.name,'index.html');
  if(!fs.existsSync(file))continue;
  const html=fs.readFileSync(file,'utf8');
  const blocks=[...html.matchAll(/<nav class="related-links">([\s\S]*?)<\/nav>/g)];
  checked++;
  for(const block of blocks)for(const m of block[1].matchAll(/<a\b[^>]*href="([^"]+)"/g)){
    const href=m[1];const target=href.match(/^https:\/\/(?:www\.)?gnk-asg\.hr\/objave\/([^/?#]+)\/$/);
    if(!target)continue;
    links++;
    if(!fs.existsSync(path.join(root,target[1],'index.html')))problems.push({source:entry.name,target:target[1]});
  }
}
const inv=fs.readFileSync('apps/portal/sve-stranice/index.html','utf8');
const generator=fs.readFileSync('scripts/build-pages-inventory-v1.mjs','utf8');
if(/href="https:\/\/gnk-asg\.hr\/svijet\/"/.test(inv))problems.push({source:'sve-stranice',target:'/svijet/ broken world destination'});
if(generator.includes("url: 'https://gnk-asg.hr/svijet/'"))problems.push({source:'inventory generator',target:'stale world route'});
const report={ok:problems.length===0,checked,relatedLinks:links,failures:problems};
console.log(JSON.stringify(report,null,2));
if(problems.length)process.exitCode=1;
