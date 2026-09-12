#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(), FILE=path.join(ROOT,'apps','portal','image-sitemap.xml');
const failures=[],warnings=[];const stats={images:0,captions:0,missingCaption:0,weakCaption:0};
if(!fs.existsSync(FILE)){console.error('image-sitemap.xml missing');process.exit(1);}const xml=fs.readFileSync(FILE,'utf8');
const clean=s=>String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').trim();
for(const block of xml.matchAll(/<image:image>([\s\S]*?)<\/image:image>/gi)){stats.images++;const body=block[1];const loc=clean(body.match(/<image:loc>([\s\S]*?)<\/image:loc>/i)?.[1]);const caption=clean(body.match(/<image:caption>([\s\S]*?)<\/image:caption>/i)?.[1]);if(!caption){stats.missingCaption++;warnings.push(`${loc||'(missing loc)'}: image:caption absent`);continue;}stats.captions++;const base=path.basename((loc||'').split(/[?#]/)[0],path.extname((loc||'').split(/[?#]/)[0])).replace(/[-_]+/g,' ').toLowerCase();const c=caption.toLowerCase();if(c.length<12||/^(image|photo|picture|logo|banner|hero)$/i.test(caption)||c===base){stats.weakCaption++;failures.push(`${loc}: weak or filename-like image:caption`);}}
const report={version:'GNK_ASG_IMAGE_SITEMAP_CAPTION_QUALITY_V1',semantics:'DISCOVERY_METADATA_QUALITY_NOT_INDEXED_PROOF',ok:!failures.length,stats,failures,warnings};const out=path.join(ROOT,'artifacts','image-sitemap-caption-quality');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
