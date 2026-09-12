import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),PORTAL=path.join(ROOT,'apps','portal'),failures=[];const stats={htmlFiles:0,pagesWithSocialImage:0,missingAlt:0,lowQualityAlt:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const metas=html=>[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
const attr=(t,n)=>t.match(new RegExp(`\\s${n}=["']([^"']*)["']`,'i'))?.[1]?.trim()||'';
const get=(tags,key)=>{for(const t of tags){const k=(attr(t,'property')||attr(t,'name')).toLowerCase();if(k===key.toLowerCase())return attr(t,'content');}return''};
const poor=s=>{const v=s.trim();return !v||v.length<5||/^(image|photo|picture|thumbnail|og image|twitter image|logo)$/i.test(v)||/\.(?:png|jpe?g|webp|gif|avif|svg)(?:\?.*)?$/i.test(v)};
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const html=fs.readFileSync(file,'utf8'),tags=metas(html);const og=get(tags,'og:image'),tw=get(tags,'twitter:image');if(!og&&!tw)continue;stats.pagesWithSocialImage++;for(const [kind,url,altKey] of [['og',og,'og:image:alt'],['twitter',tw,'twitter:image:alt']]){if(!url)continue;const alt=get(tags,altKey);if(!alt){stats.missingAlt++;failures.push(`${rel}: ${kind} image exists but ${altKey} is missing`);}else if(poor(alt)){stats.lowQualityAlt++;failures.push(`${rel}: ${altKey} is low-quality or filename-like: ${alt}`);}}}
const report={version:'GNK_ASG_SOCIAL_IMAGE_ALT_METADATA_V1',ok:failures.length===0,stats,failures};const out=path.join(ROOT,'artifacts','social-image-alt-metadata');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
