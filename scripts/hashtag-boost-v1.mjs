// GNK ASG — Hashtag boost: osigurava vidljivi hashtag blok u tijelu svake editorial stranice.
// Aditivno: dodaje <p class="article-hashtags"> gdje ne postoji, ili nadopunjuje
// postojeći blok obveznim entitetskim tagovima. Ništa ne uklanja.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const registry=read('apps/portal/data/editorial-registry.json',{items:[]});
const MUST_EN=['NerminSefic','GNKASG','GNKDINAMOLtd'];
const MUST_HR=['NerminSefic','NerminSefić','GNKASG','GNKDINAMOLtd'];
const stats={added:0,boosted:0,skippedNoBody:0,files:0};

for(const item of registry.items||[]){
  if(!item?.path) continue;
  const file='apps/portal'+item.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  const isHr=(item.language||'hr')==='hr';
  const must=isHr?MUST_HR:MUST_EN;
  const topical=(item.hashtags||[]).filter(Boolean);
  const bodyM=html.match(/<article[^>]*class="[^"]*article-body[^"]*"[^>]*>[\s\S]*?<\/article>/i);
  if(!bodyM){stats.skippedNoBody++;continue;}
  const body=bodyM[0];
  let newBody=body;
  const tagPara=body.match(/<p class="article-hashtags">([\s\S]*?)<\/p>/i);
  if(tagPara){
    const existing=tagPara[1];
    const missing=must.filter(t=>!existing.includes('#'+t));
    if(missing.length){
      newBody=body.replace(tagPara[0], tagPara[0].replace('</p>',' '+missing.map(t=>'#'+t).join(' ')+'</p>'));
      stats.boosted++;
    }
  } else {
    const tags=[...new Set([...topical,...must])].slice(0,16);
    if(tags.length){
      newBody=body.replace(/<\/article>$/i,'')===body
        ? body.replace(/<\/article>/i,`<p class="article-hashtags">${tags.map(t=>'#'+t).join(' ')}</p></article>`)
        : body;
      // fallback: last </article> in block
      if(newBody===body) newBody=body.slice(0,body.lastIndexOf('</article>'))+`<p class="article-hashtags">${tags.map(t=>'#'+t).join(' ')}</p></article>`;
      stats.added++;
    }
  }
  if(newBody!==body){
    html=html.replace(body,newBody);
    writeFileSync(file,html);
    stats.files++;
  }
}
console.log(JSON.stringify(stats,null,2));
