#!/usr/bin/env node
/* Validate captured public responses. This proves only what the responses
   actually show; workflow success and ancestry are checked separately. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export function checkPublicResponse({name, headers, body, expectedSha}) {
  const errors=[];
  if(!/^[a-f0-9]{40}$/.test(expectedSha)) errors.push('invalid expected SHA');
  // curl -L writes a header block per redirect; only the final response counts.
  const blocks=String(headers).replace(/\r/g,'').trim().split(/\n\n+/);
  const final=blocks.at(-1)||'';
  if(!/^HTTP\/\S+ 200(?:\s|$)/i.test(final)) errors.push(`${name}: final HTTP status is not 200`);
  const map=new Map();for(const line of final.split('\n').slice(1)){const i=line.indexOf(':');if(i>0)map.set(line.slice(0,i).toLowerCase(),line.slice(i+1).trim())}
  if(map.get('x-gnk-deploy-revision')!==expectedSha) errors.push(`${name}: missing or different revision header`);
  const type=(map.get('content-type')||'').toLowerCase();
  if(name==='html'){
    if(!type.includes('text/html'))errors.push('html: unexpected content type');
    if(!/<html\b/i.test(body)||!/aktual/i.test(body)||!body.includes('https://gnk-asg.hr/gnk-aktual/media/hrvatska/')||/\b404\b|stranica nije pronađena/i.test(body))errors.push('html: expected edition content absent');
  }else if(name==='feed'){
    if(!/(xml|rss|atom)/.test(type))errors.push('feed: unexpected content type');
    if(!/<rss\b/i.test(body)||!body.includes('https://gnk-asg.hr/gnk-aktual/media/hrvatska/'))errors.push('feed: missing expected channel');
  }else if(name==='sitemap'){
    if(!/xml/.test(type))errors.push('sitemap: unexpected content type');
    if(!/<urlset\b/i.test(body)||!body.includes('https://gnk-asg.hr/gnk-aktual/media/hrvatska/'))errors.push('sitemap: expected canonical entries absent');
  }else errors.push('unknown response');
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [dir,sha]=process.argv.slice(2);if(!dir||!sha){console.error('Usage: node scripts/world201-release-proof-v1.mjs <response-directory> <full-sha>');process.exit(2)}
  let errors=[];for(const name of ['html','feed','sitemap']){
    try{errors.push(...checkPublicResponse({name,headers:readFileSync(join(dir,`${name}.headers`),'utf8'),body:readFileSync(join(dir,`${name}.body`),'utf8'),expectedSha:sha}))}
    catch{errors.push(`${name}: response files unavailable`)}
  }
  console.log(JSON.stringify({ok:!errors.length,errors},null,2));if(errors.length)process.exitCode=1;
}
