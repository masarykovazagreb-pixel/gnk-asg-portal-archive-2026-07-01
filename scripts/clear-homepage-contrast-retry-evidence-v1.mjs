import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPORT_ROOT=path.resolve('apps/portal/test-results/visual-contrast');
const PROJECTS=['chromium-desktop','chromium-mobile'];
const ROUTES=['/','/en/'];
const safeName=value=>value.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9._-]+/gi,'-')||'index';
const stemFor=value=>`${safeName(value)}-${crypto.createHash('sha1').update(value).digest('hex').slice(0,12)}`;
const removed=[];
for(const project of PROJECTS){
 for(const route of ROUTES){
  const stem=stemFor(route);
  for(const suffix of ['.failure.json','.json']){
   const file=path.join(REPORT_ROOT,project,`${stem}${suffix}`);
   if(fs.existsSync(file)){fs.unlinkSync(file);removed.push(path.relative(process.cwd(),file))}
  }
 }
}
console.log(JSON.stringify({ok:true,scope:'homepage-retry-only',routes:ROUTES,projects:PROJECTS,removed},null,2));
