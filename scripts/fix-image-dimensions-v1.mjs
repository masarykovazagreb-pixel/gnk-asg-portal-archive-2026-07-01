// GNK ASG — fix-image-dimensions-v1.mjs
// Adds explicit width/height attributes to <img> tags missing them (CLS / Core Web Vitals).
// Only touches local assets whose intrinsic size can be read from file headers. Safe:
// width/height attributes define intrinsic ratio only; CSS sizing still wins.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('apps/portal');

function pngSize(b){ if(b.length<24||b.readUInt32BE(0)!==0x89504e47) return null; return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)}; }
function gifSize(b){ if(b.length<10||b.toString('ascii',0,3)!=='GIF') return null; return {w:b.readUInt16LE(6),h:b.readUInt16LE(8)}; }
function jpgSize(b){
  if(b.length<4||b[0]!==0xFF||b[1]!==0xD8) return null;
  let i=2;
  while(i+9<b.length){
    if(b[i]!==0xFF){i++;continue;}
    const m=b[i+1];
    if(m===0xD8||m===0x01||(m>=0xD0&&m<=0xD7)){i+=2;continue;}
    const len=b.readUInt16BE(i+2);
    if((m>=0xC0&&m<=0xCF)&&m!==0xC4&&m!==0xC8&&m!==0xCC){
      return {h:b.readUInt16BE(i+5),w:b.readUInt16BE(i+7)};
    }
    i+=2+len;
  }
  return null;
}
function webpSize(b){
  if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP') return null;
  const fmt=b.toString('ascii',12,16);
  if(fmt==='VP8 '){ return {w:b.readUInt16LE(26)&0x3fff,h:b.readUInt16LE(28)&0x3fff}; }
  if(fmt==='VP8L'){ const n=b.readUInt32LE(21); return {w:(n&0x3FFF)+1,h:((n>>14)&0x3FFF)+1}; }
  if(fmt==='VP8X'){ return {w:1+((b[24])|(b[25]<<8)|(b[26]<<16)),h:1+((b[27])|(b[28]<<8)|(b[29]<<16))}; }
  return null;
}
function svgSize(b){
  const s=b.toString('utf8', 0, Math.min(b.length, 4096));
  const wm=s.match(/<svg[^>]*\swidth="([0-9.]+)(?:px)?"/i), hm=s.match(/<svg[^>]*\sheight="([0-9.]+)(?:px)?"/i);
  if(wm&&hm) return {w:Math.round(+wm[1]),h:Math.round(+hm[1])};
  const vb=s.match(/<svg[^>]*\sviewBox="[0-9.\-]+[ ,]+[0-9.\-]+[ ,]+([0-9.]+)[ ,]+([0-9.]+)"/i);
  if(vb) return {w:Math.round(+vb[1]),h:Math.round(+vb[2])};
  return null;
}
function imgSize(path){
  try{
    const b=readFileSync(path);
    if(path.endsWith('.svg')) return svgSize(b);
    return pngSize(b)||webpSize(b)||jpgSize(b)||gifSize(b);
  }catch{ return null; }
}

function* htmlFiles(dir){
  for(const n of readdirSync(dir)){
    const p=join(dir,n);
    const st=statSync(p);
    if(st.isDirectory()) yield* htmlFiles(p);
    else if(n.endsWith('.html')) yield p;
  }
}

const cache=new Map();
function sizeFor(src){
  let s=src.split('?')[0].split('#')[0];
  if(!s||/^(https?:)?\/\//.test(s)||s.startsWith('data:')) return null;
  if(!s.startsWith('/')) return null; // only root-relative; relative paths are rare and dir-dependent
  const p=join(ROOT, s);
  if(cache.has(p)) return cache.get(p);
  const d=existsSync(p)?imgSize(p):null;
  cache.set(p,d);
  return d;
}

let filesChanged=0, imgsFixed=0, skipped=0;
for(const file of htmlFiles(ROOT)){
  let html=readFileSync(file,'utf8');
  // protect <script> blocks from regex edits
  const scripts=[];
  html=html.replace(/<script[\s\S]*?<\/script>/gi, m=>{scripts.push(m);return `\u0000SCRIPT${scripts.length-1}\u0000`;});
  let changed=false;
  html=html.replace(/<img\b[^>]*>/gi, tag=>{
    if(/\bwidth\s*=/.test(tag)&&/\bheight\s*=/.test(tag)) return tag;
    const sm=tag.match(/\bsrc\s*=\s*"([^"]+)"/i)||tag.match(/\bsrc\s*=\s*'([^']+)'/i);
    if(!sm) return tag;
    const d=sizeFor(sm[1]);
    if(!d||!d.w||!d.h){ skipped++; return tag; }
    changed=true; imgsFixed++;
    let out=tag.replace(/\bwidth\s*=\s*("[^"]*"|'[^']*')\s*/i,'').replace(/\bheight\s*=\s*("[^"]*"|'[^']*')\s*/i,'');
    return out.replace(/<img\b/i, `<img width="${d.w}" height="${d.h}"`);
  });
  html=html.replace(/\u0000SCRIPT(\d+)\u0000/g,(_,i)=>scripts[+i]);
  if(changed){ writeFileSync(file, html); filesChanged++; }
}
console.log(JSON.stringify({filesChanged, imgsFixed, skippedNoDims:skipped},null,2));
