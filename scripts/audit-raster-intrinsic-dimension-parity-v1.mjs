#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd(), PORTAL=path.join(ROOT,'apps','portal');
const failures=[], warnings=[]; const stats={htmlFiles:0,localRasterImages:0,checked:0,mismatches:0,unsupported:0,missing:0};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]});
const attr=(tag,n)=>tag.match(new RegExp(`\\s${n}=["']([^"']*)["']`,'i'))?.[1]?.trim()??null;
function dims(buf,ext){
  if(ext==='.png'&&buf.length>=24&&buf.toString('ascii',1,4)==='PNG') return [buf.readUInt32BE(16),buf.readUInt32BE(20)];
  if((ext==='.jpg'||ext==='.jpeg')&&buf[0]===0xff&&buf[1]===0xd8){let i=2;while(i+9<buf.length){if(buf[i]!==0xff){i++;continue;}const m=buf[i+1];if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(m)){return [buf.readUInt16BE(i+7),buf.readUInt16BE(i+5)];}const len=buf.readUInt16BE(i+2);if(!len)break;i+=2+len;} }
  if(ext==='.gif'&&buf.length>=10&&buf.toString('ascii',0,3)==='GIF') return [buf.readUInt16LE(6),buf.readUInt16LE(8)];
  return null;
}
for(const file of walk(PORTAL).filter(f=>f.endsWith('.html'))){stats.htmlFiles++;const rel='/'+path.relative(PORTAL,file).replaceAll(path.sep,'/');const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<img\b[^>]*>/gi)){const tag=m[0],src=attr(tag,'src'),w=attr(tag,'width'),h=attr(tag,'height');if(!src||!w||!h||/^(?:https?:|data:|blob:|\/\/)/i.test(src))continue;const clean=src.split(/[?#]/)[0];const ext=path.extname(clean).toLowerCase();if(!['.png','.jpg','.jpeg','.gif','.webp'].includes(ext))continue;stats.localRasterImages++;const asset=path.resolve(path.dirname(file),clean);if(!asset.startsWith(PORTAL+path.sep)){warnings.push(`${rel}: image escapes portal root: ${src}`);continue;}if(!fs.existsSync(asset)){stats.missing++;failures.push(`${rel}: local image missing for dimension parity: ${src}`);continue;}const actual=dims(fs.readFileSync(asset),ext);if(!actual){stats.unsupported++;warnings.push(`${rel}: intrinsic dimensions not decoded for ${src}`);continue;}stats.checked++;if(Number(w)!==actual[0]||Number(h)!==actual[1]){stats.mismatches++;failures.push(`${rel}: ${src} declares ${w}x${h} but asset is ${actual[0]}x${actual[1]}`);}}
}
const report={version:'GNK_ASG_RASTER_INTRINSIC_DIMENSION_PARITY_V1',scope:'LOCAL_PUBLIC_RASTER_IMAGES',ok:failures.length===0,stats,failures,warnings};const out=path.join(ROOT,'artifacts','raster-intrinsic-dimension-parity');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
