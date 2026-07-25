import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPORT_ROOT=path.resolve('apps/portal/test-results/visual-contrast');
const PROJECTS=['chromium-desktop','chromium-mobile'];
const ROUTES=['/','/en/'];
const safeName=value=>value.replace(/^\/+|\/+$/g,'').replace(/[^a-z0-9._-]+/gi,'-')||'index';
const stemFor=value=>`${safeName(value)}-${crypto.createHash('sha1').update(value).digest('hex').slice(0,12)}`;
const removed=[];
const preserved=[];
for(const project of PROJECTS){
 for(const route of ROUTES){
  const stem=stemFor(route);
  const failure=path.join(REPORT_ROOT,project,`${stem}.failure.json`);
  const report=path.join(REPORT_ROOT,project,`${stem}.json`);
  if(fs.existsSync(failure)){fs.unlinkSync(failure);removed.push(path.relative(process.cwd(),failure))}
  if(fs.existsSync(report))preserved.push(path.relative(process.cwd(),report));
 }
}
console.log(JSON.stringify({ok:true,scope:'homepage-retry-only',routes:ROUTES,projects:PROJECTS,removed,preserved},null,2));
