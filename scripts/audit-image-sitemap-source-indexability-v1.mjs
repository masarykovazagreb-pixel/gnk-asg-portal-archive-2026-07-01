import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),SITEMAP=path.join(PORTAL,'image-sitemap.xml'),failures=[];const stats={sourceUrls:0,resolvedPages:0,unresolvedPages:0,noindexSources:0};
if(!fs.existsSync(SITEMAP)){console.error('image-sitemap.xml missing');process.exit(1)}
const xml=fs.readFileSync(SITEMAP,'utf8');
const blocks=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(m=>m[1]);
const locOf=b=>b.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim()||'';
const hasNoindex=html=>/<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])/i.test(html);
const candidates=p=>{let q=decodeURIComponent(p||'/');if(!q.startsWith('/'))q='/'+q;q=q.replace(/\/+$/,'');if(!q)q='/';const out=[];if(q==='/')out.push(path.join(PORTAL,'index.html'));else{const rel=q.replace(/^\//,'');out.push(path.join(PORTAL,rel,'index.html'));out.push(path.join(PORTAL,rel+'.html'));out.push(path.join(PORTAL,rel));}return out;};
for(const b of blocks){const loc=locOf(b);if(!loc)continue;stats.sourceUrls++;let pathname='';try{pathname=new URL(loc).pathname}catch{failures.push(`invalid source loc: ${loc}`);continue}const file=candidates(pathname).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());if(!file){stats.unresolvedPages++;failures.push(`${loc}: source page cannot be resolved to local portal HTML`);continue}stats.resolvedPages++;const html=fs.readFileSync(file,'utf8');if(hasNoindex(html)){stats.noindexSources++;failures.push(`${loc}: image sitemap source page is noindex`);}}
const report={version:'GNK_ASG_IMAGE_SITEMAP_SOURCE_INDEXABILITY_V1',ok:failures.length===0,stats,failures};const out=path.join(ROOT,'artifacts','image-sitemap-source-indexability');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
