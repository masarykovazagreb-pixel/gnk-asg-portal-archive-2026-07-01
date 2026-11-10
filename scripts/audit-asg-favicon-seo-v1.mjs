#!/usr/bin/env node
/**
 * Read-only ASG favicon + technical SEO inventory across public portal roots.
 * No generated page edits, backlinks, search submissions or deploy operations.
 * Usage: node scripts/audit-asg-favicon-seo-v1.mjs [--strict]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITES = ['apps/portal','apps/sites/site','apps/world/site','apps/arhiva/site','apps/dnevnik/site','apps/kanal/site','apps/tjednik/site'];
const SKIP = new Set(['.git','node_modules','assets','data','admin','admin-center','admin-login','webmail','mail-studio','api','__preview','operator-dashboard','workers']);
const canonical = readFileSync(join(ROOT,'apps/shared/brand/favicon.svg'),'utf8');
const issues = [];
const stats = {pages:0, withIcon:0, faviconMatches:0, titles:0, descriptions:0, canonicals:0, ogTitles:0, jsonLd:0, internalLinks:0, externalLinks:0, nofollowExternalLinks:0};
if (!/stroke="#(?:d4af37|f0c94c)"/i.test(canonical) || !/>ASG<\/text>/.test(canonical)) {
  throw new Error('Canonical ASG favicon has lost the gold border or centered ASG lettering');
}
function* pages(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir,{withFileTypes:true})) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name) && !e.name.startsWith('.')) yield* pages(join(dir,e.name));
    } else if (e.isFile() && e.name.endsWith('.html')) yield join(dir,e.name);
  }
}
function record(file, kind) {
  issues.push({file:relative(ROOT,file).split(sep).join('/'), issue:kind});
}
function getIcon(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(s=>/\brel=["'](?:shortcut )?icon["']/i.test(s));
}
function findWebRoot(file, base) {
  if (base==='apps/portal') return join(ROOT,base);
  let dir=dirname(file);
  while (dir!==ROOT && !existsSync(join(dir,'assets','favicon.svg'))) dir=dirname(dir);
  return dir===ROOT ? null : dir;
}
for (const base of SITES) {
  for (const file of pages(join(ROOT,base))) {
    const html=readFileSync(file,'utf8');
    if (!/<html\b/i.test(html)) continue;
    stats.pages++;
    const icon=getIcon(html);
    if (!icon) record(file,'favicon missing');
    else {
      stats.withIcon++;
      const href=icon.match(/\bhref=["']([^"']+)/i)?.[1]?.split('?')[0];
      const webRoot=findWebRoot(file,base);
      let target=null;
      if (href && webRoot) {
        try {
          const u=new URL(href,'https://example.invalid');
          if (u.host==='example.invalid') {
            target=href.startsWith('/') ? join(webRoot,u.pathname) : resolve(dirname(file),u.pathname);
          } else if (base==='apps/portal' && u.host==='gnk-asg.hr') target=join(webRoot,u.pathname);
          else if (base!=='apps/portal' && u.pathname.endsWith('/assets/favicon.svg')) target=join(webRoot,'assets/favicon.svg');
        } catch {}
      }
      if (target && existsSync(target) && readFileSync(target,'utf8')===canonical) stats.faviconMatches++;
      else record(file,'favicon missing, foreign or differs from canonical ASG asset');
    }
    const has=(r)=>r.test(html);
    if (has(/<title>\s*[^<\s][^<]*<\/title>/i)) stats.titles++; else record(file,'title missing');
    if (has(/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+/i)) stats.descriptions++; else record(file,'meta description missing');
    if (has(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']https?:\/\//i)) stats.canonicals++; else record(file,'absolute canonical missing');
    if (has(/<meta\b[^>]*property=["']og:title["']/i)) stats.ogTitles++;
    if (has(/application\/ld\+json/i)) stats.jsonLd++;
    for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
      const href=match[1], tag=match[0];
      if (/^https?:\/\//i.test(href)) {stats.externalLinks++;if (/rel=["'][^"']*nofollow/i.test(tag)) stats.nofollowExternalLinks++;}
      else if (/^(\/|\.\/|\.\.\/)/.test(href)) stats.internalLinks++;
    }
  }
}
const report={version:'ASG_FAVICON_TECHNICAL_SEO_AUDIT_V1',mode:'read-only',stats,issueCount:issues.length,issues:issues.slice(0,100),notes:['Hashtags belong in social posts, not meta keywords or body stuffing.','External backlink acquisition requires editorial outreach and real third-party placements.','This local audit is not evidence of search-engine indexing or live deployment.']};
console.log(JSON.stringify(report,null,2));
if (process.argv.includes('--strict') && issues.length) process.exitCode=1;
