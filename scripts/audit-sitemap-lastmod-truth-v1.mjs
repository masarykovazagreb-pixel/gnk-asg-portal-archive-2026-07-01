import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const PORTAL=path.join(ROOT,'apps','portal');
const failures=[]; const checked=[];
const sitemapFiles=fs.existsSync(PORTAL)?fs.readdirSync(PORTAL).filter(n=>/sitemap.*\.xml$/i.test(n)):[];
const iso=/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/;
for(const name of sitemapFiles){
  const file=path.join(PORTAL,name); const xml=fs.readFileSync(file,'utf8');
  for(const m of xml.matchAll(/<(?:url|sitemap)>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?(?:<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/(?:url|sitemap)>/gi)){
    const loc=m[1].trim(); const lastmod=(m[2]||'').trim();
    checked.push({sitemap:name,loc,lastmod:lastmod||null});
    if(lastmod && !iso.test(lastmod)) failures.push(`${name}: invalid lastmod format for ${loc}: ${lastmod}`);
    if(lastmod){ const t=Date.parse(lastmod); if(Number.isNaN(t)) failures.push(`${name}: unparsable lastmod for ${loc}`); else if(t>Date.now()+86400000) failures.push(`${name}: future lastmod for ${loc}: ${lastmod}`); }
  }
}
const report={version:'GNK_ASG_SITEMAP_LASTMOD_TRUTH_V1',ok:failures.length===0,stats:{sitemapsChecked:sitemapFiles.length,entriesChecked:checked.length,entriesWithLastmod:checked.filter(x=>x.lastmod).length},semantics:'This gate validates date shape and rejects future lastmod values; it does not infer content modification time when source provenance is unavailable.',failures,checked};
const out=path.join(ROOT,'artifacts','sitemap-lastmod-truth');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
