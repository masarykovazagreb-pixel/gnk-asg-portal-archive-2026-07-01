#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(), PORTAL=path.join(ROOT,'apps','portal');
const failures=[]; const stats={htmlFiles:0,pictures:0,sources:0,missingFallback:0,invalidSource:0,missingLocalCandidate:0,typeMismatch:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(tag,n)=>tag.match(new RegExp(`\\s${n}=["']([^"']+)["']`,'i'))?.[1]?.trim()||'';
const exists=u=>{if(!u||/^(?:https?:|data:|blob:|\/\/)/i.test(u))return true;const clean=u.split(/[?#]/)[0].replace(/^\/+/, '');return fs.existsSync(path.join(PORTAL,clean));};
const ext=u=>path.extname((u||'').split(/[?#]/)[0]).toLowerCase();
const typeOk=(t,e)=>!t||({'.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'}[e]===t.toLowerCase());
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)){stats.pictures++;const body=m[1];if(!/<img\b[^>]*>/i.test(body)){stats.missingFallback++;failures.push(`${file}: <picture> missing <img> fallback`);}for(const sm of body.matchAll(/<source\b[^>]*>/gi)){stats.sources++;const tag=sm[0],srcset=attr(tag,'srcset'),type=attr(tag,'type');if(!srcset){stats.invalidSource++;failures.push(`${file}: <source> missing srcset`);continue;}for(const raw of srcset.split(',')){const u=raw.trim().split(/\s+/)[0];if(!u)continue;if(!exists(u)){stats.missingLocalCandidate++;failures.push(`${file}: local <source> candidate missing: ${u}`);}if(!typeOk(type,ext(u))){stats.typeMismatch++;failures.push(`${file}: source type ${type} mismatches ${u}`);}}}}}
const report={version:'GNK_ASG_PICTURE_SOURCE_CONTRACT_V1',semantics:'STATIC_RESPONSIVE_IMAGE_INTEGRITY_NOT_INDEXED_PROOF',ok:!failures.length,stats,failures};const out=path.join(ROOT,'artifacts','picture-source-contract');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
