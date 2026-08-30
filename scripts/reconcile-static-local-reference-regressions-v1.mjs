// GNK ASG — idempotent static local-reference reconciler.
// Repairs only known, proven stale local references discovered by the strict
// static-page audit. It does not weaken the audit and does not claim INDEXED.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT='apps/portal';
const retiredScripts=new Set([
  '/assets/gallery-bootstrap.js?v=20260626-v3',
  '/assets/gallery-brand-safety.js?v=20260626-v1'
]);
const stats={scanned:0,filesChanged:0,retiredScriptTagsRemoved:0,legacyMarketsLinksRewritten:0};

function assetExists(url){
  const clean=url.split(/[?#]/,1)[0];
  return existsSync(join(ROOT,clean.replace(/^\//,'')));
}

const pages=[];
(function walk(dir){
  for(const name of readdirSync(dir)){
    const path=join(dir,name); let st;
    try{ st=statSync(path); } catch { continue; }
    if(st.isDirectory()) walk(path);
    else if(name==='index.html') pages.push(path);
  }
})(ROOT);

for(const file of pages){
  stats.scanned++;
  let html=readFileSync(file,'utf8');
  const before=html;

  html=html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,(tag,src)=>{
    if(retiredScripts.has(src) && !assetExists(src)){
      stats.retiredScriptTagsRemoved++;
      return '';
    }
    return tag;
  });

  // One proven stale Croatian editorial alias from the detailed audit.
  // Keep EN /en/markets/ untouched; normalize only the exact legacy root alias.
  if(relative(ROOT,file)==='objave/koncar-gnk-asg-504-milijuna-ai-radna-snaga-izvoz/index.html'){
    html=html.replace(/href=["']\/markets\/["']/g,()=>{
      stats.legacyMarketsLinksRewritten++;
      return 'href="/trzista/"';
    });
  }

  if(html!==before){
    writeFileSync(file,html);
    stats.filesChanged++;
  }
}

console.log(JSON.stringify({policy:'static-local-reference-regressions-v1',...stats},null,2));
