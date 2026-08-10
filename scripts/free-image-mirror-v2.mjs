// GNK ASG — Besplatno objavljivanje slika bez logiranja.
// Cilj: dodatni javno-dostupni URL-ovi za World Topics chartove i autorske
// fotke, koje ne traže login, i mogu se linkati odakle god.
//
// Kanali:
//  - 0x0.st  (anonimni, direktni URL-ovi, bez API ključa — pripitomljen za CI use)
// Napomena: catbox NE prihvaća EU multipart bez ključne riječi 'reqtype'.
//           Stanje u apps/portal/data/free-image-mirrors/published.json.
// Dedupe po SHA-256; svaka slika se šalje najviše jednom.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const STATE='apps/portal/data/free-image-mirrors/published.json';
const PER_RUN=parseInt(process.env.MIRROR_PER_RUN||'20',10);
const PAUSE=parseInt(process.env.MIRROR_PAUSE_MS||'5000',10);

const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,typeof s==='string'?s:JSON.stringify(s,null,2)+'\n')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=b=>createHash('sha256').update(b).digest('hex');

const state=read(STATE,{version:'GNK_ASG_FREE_IMAGE_MIRRORS_V1',hashByFile:{},'0x0':{}});
if(!state['0x0']) state['0x0']={};

function collect(){
  const roots=[
    'apps/portal/assets/editorial/world-topics',
    'apps/portal/assets/people/nermin-sefic',
    'apps/portal/assets/people/nermin-sefic/og'
  ];
  const files=[];
  for(const r of roots){
    if(!existsSync(r))continue;
    for(const n of readdirSync(r)){
      if(!/\.(webp|jpg|jpeg|png|svg)$/i.test(n))continue;
      files.push(join(r,n));
    }
  }
  return files;
}

async function upload0x0(buf, filename){
  const form=new FormData();
  form.append('file', new Blob([buf]), filename);
  form.append('expires','8640'); // hours (360 days) — 0x0 max is 365
  const r=await fetch('https://0x0.st',{method:'POST',body:form,headers:{'User-Agent':'GNK-ASG-mirror/1.0 (contact: it@gnk-asg.hr)'}});
  const txt=(await r.text()).trim();
  if(!/^https?:\/\/0x0\.st\//.test(txt)) throw new Error('0x0.st: '+r.status+' '+txt.slice(0,140));
  return txt;
}

const files=collect();
console.log(`local images found: ${files.length}`);
const todo=[];
for(const f of files){
  const buf=readFileSync(f);
  const h=sha(buf);
  state.hashByFile[f]=h;
  if(state['0x0'][h]) continue;
  todo.push({file:f, buf, h});
  if(todo.length>=PER_RUN) break;
}
console.log(`to upload this run: ${todo.length}`);
let ok=0, fail=0;
for(const it of todo){
  try{
    const url=await upload0x0(it.buf, it.file.split('/').pop());
    state['0x0'][it.h]={url, file:it.file, at:new Date().toISOString()};
    ok++; console.log('OK', it.file, '->', url);
  }catch(e){ fail++; console.log('FAIL', it.file, String(e.message||e).slice(0,140)); }
  write(STATE,state);
  await sleep(PAUSE);
}
write(STATE,state);
console.log(JSON.stringify({channel:'0x0.st',ok,fail,totalMirrored:Object.keys(state['0x0']).length},null,2));
