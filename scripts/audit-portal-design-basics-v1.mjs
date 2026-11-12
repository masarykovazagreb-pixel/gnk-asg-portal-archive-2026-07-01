#!/usr/bin/env node
// Read-only source inventory, not a rendered or comprehensive accessibility audit.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] || 'apps/portal');
const groups={};
function category(rel){
 const parts=rel.split(path.sep),first=parts[0];
 if(first==='assets'||first==='data')return 'assets-and-data';
 if(first==='__preview')return 'preview';
 if(/^(admin|admin-center|admin-login|automation-status|webmail|mail-studio|campaign-mailer|worker-ops|operator-dashboard|api)$/.test(first))return 'admin-and-tools';
 if(first==='gnk-aktual'&&(parts[1]==='media'||parts[1]==='grad'))return 'world-directory-and-editions';
 return 'other-portal-routes';
}
const ignored=new Set(['node_modules','test-results','playwright-report','.git']);
function* walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name)||entry.name.startsWith('.'))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())yield*walk(p);else if(entry.isFile()&&entry.name.toLowerCase().endsWith('.html'))yield p;}}
const metrics=['missingViewport','missingMain','missingH1','missingSkipCandidate'];
for(const file of walk(root)){
 const rel=path.relative(root,file),html=fs.readFileSync(file,'utf8');if(!/<html\b/i.test(html))continue;
 const group=groups[category(rel)] ||= {htmlFiles:0,redirectCandidates:0,counts:Object.fromEntries(metrics.map(x=>[x,0])),examples:Object.fromEntries(metrics.map(x=>[x,[]]))};
 group.htmlFiles++;
 const content=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 if(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(content)){group.redirectCandidates++;continue;}
 const checks={missingViewport:!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(content),missingMain:!/<main\b/i.test(content),missingH1:!/<h1\b/i.test(content),missingSkipCandidate:!/<a\b[^>]*(?:class\s*=\s*["'][^"']*(?:skip|preskok)|>\s*(?:preskoči|skip to))/i.test(content)};
 for(const name of metrics)if(checks[name]){group.counts[name]++;if(group.examples[name].length<12)group.examples[name].push(rel.split(path.sep).join('/'));}
}
console.log(JSON.stringify({scope:'Static HTML heuristics, not browser rendering, live deployment, or WCAG conformance. Examples are not complete lists.',root,groups},null,2));
