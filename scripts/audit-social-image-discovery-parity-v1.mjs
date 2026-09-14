#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),IMG_SITEMAP=path.join(PORTAL,'image-sitemap.xml');
const failures=[],warnings=[];const stats={htmlFiles:0,indexablePages:0,socialImages:0,sameOriginSocialImages:0,missingFromImageSitemap:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const meta=(html,key)=>html.match(new RegExp(`<meta\\s+[^>]*(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["'][^>]*>`,'i'))?.slice(1).find(Boolean)?.trim()||null;
if(!fs.existsSync(IMG_SITEMAP)){console.error('image-sitemap.xml is missing');process.exit(1);}const imageXml=fs.readFileSync(IMG_SITEMAP,'utf8');const discovered=new Set([...imageXml.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&').trim()));
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const html=fs.readFileSync(file,'utf8');const robots=meta(html,'robots')||'';if(/\bnoindex\b/i.test(robots))continue;stats.indexablePages++;const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const urls=[meta(html,'og:image'),meta(html,'twitter:image')].filter(Boolean);for(const raw of [...new Set(urls)]){stats.socialImages++;let u;try{u=new URL(raw,'https://gnk-asg.hr');}catch{failures.push(`${rel}: malformed social image URL ${raw}`);continue;}if(u.origin!=='https://gnk-asg.hr')continue;stats.sameOriginSocialImages++;if(!discovered.has(u.href)){stats.missingFromImageSitemap++;failures.push(`${rel}: same-origin social image is not discoverable in image-sitemap.xml: ${u.href}`);}}
}
const report={version:'GNK_ASG_SOCIAL_IMAGE_DISCOVERY_PARITY_V1',semantics:'DISCOVERABLE_ONLY_NOT_INDEXED',ok:failures.length===0,stats,failures,warnings};const out=path.join(ROOT,'artifacts','social-image-discovery-parity');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
