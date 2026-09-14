import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT,'apps','portal');
const failures=[];
const checked=[];
const isIndexable = html => !/(<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex)/i.test(html);
const routeFromFile = file => { const rel=path.relative(PORTAL,path.dirname(file)).split(path.sep).join('/'); return rel?`/${rel}/`:'/'; };
const inspect=(route,html)=>{
  const nav = /<nav\b[^>]*(?:aria-label=["'][^"']*(?:breadcrumb|kruš|krus)[^"']*["'])[^>]*>/i.test(html) || /class=["'][^"']*breadcrumb[^"']*["']/i.test(html);
  let schema=false;
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const parsed=JSON.parse(m[1]);
      const nodes=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.['@graph'])?parsed['@graph']:[parsed]);
      if(nodes.some(n=>n && (n['@type']==='BreadcrumbList' || (Array.isArray(n['@type'])&&n['@type'].includes('BreadcrumbList'))))) schema=true;
    }catch{}
  }
  checked.push({route,visibleBreadcrumb:nav,breadcrumbSchema:schema});
  if(route!=='/' && nav!==schema) failures.push(`${route}: visible breadcrumb/schema parity mismatch`);
};
const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||['data','assets','_headers'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.isFile()&&e.name==='index.html'){const h=fs.readFileSync(f,'utf8');if(isIndexable(h))inspect(routeFromFile(f),h);}}};
if(!fs.existsSync(PORTAL))process.exit(1);walk(PORTAL);
const report={version:'GNK_ASG_BREADCRUMB_NAVIGATION_PARITY_V1',ok:failures.length===0,stats:{pagesChecked:checked.length,withVisibleBreadcrumb:checked.filter(x=>x.visibleBreadcrumb).length,withBreadcrumbSchema:checked.filter(x=>x.breadcrumbSchema).length},failures,checked};
const out=path.join(ROOT,'artifacts','breadcrumb-navigation-parity');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
