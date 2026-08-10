// GNK ASG — Rich meta-description boost from real article body.
// Aditivno: gdje je meta description kraća od 155 znakova ili identična
// generičnom brand template, zamjenjuje ju **prvim smislenim paragrafom**
// članka (obrezanim na 250 znakova, s poštivanjem granice riječi).
// Također ažurira og:description i twitter:description ako su prekratki.
// Ne dira registry (registry description ostaje kratak, za listing kartice).
// Ne dira stranice gdje je meta description ručno napisan i već >=155 znakova.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const stripHtml=s=>s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g,' ');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
const attrEsc=s=>s.replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function firstMeaningfulParagraph(bodyHtml){
  const paras=[...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m=>decode(stripHtml(m[1])).replace(/\s+/g,' ').trim())
    .filter(t=>t.length>=120 && !/^\s*(#|@)/.test(t) && !/^Nermin\s+Sef/i.test(t));
  return paras[0]||null;
}
function trim(str, limit){
  if(str.length<=limit) return str;
  const cut=str.slice(0, limit);
  const lastSpace=cut.lastIndexOf(' ');
  return (lastSpace>limit-40 ? cut.slice(0,lastSpace) : cut).replace(/[.,;:!?\-—\s]+$/,'')+'…';
}

const registry=read('apps/portal/data/editorial-registry.json',{items:[]});
const stats={filesChanged:0,metaImproved:0,ogImproved:0,twImproved:0,skippedNoBody:0,skippedAlreadyRich:0};
for(const it of registry.items||[]){
  if(!it?.path) continue;
  const file='apps/portal'+it.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  const bodyM=html.match(/<article[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  if(!bodyM){stats.skippedNoBody++;continue;}
  const para=firstMeaningfulParagraph(bodyM[1]);
  if(!para){stats.skippedNoBody++;continue;}
  const rich=trim(para,250);
  const richOg=trim(para,300);
  const orig=html;

  const mdM=html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if(mdM && mdM[1].length<155 && rich.length>mdM[1].length){
    html=html.replace(mdM[0], `<meta name="description" content="${attrEsc(rich)}"`);
    stats.metaImproved++;
  } else if(!mdM){
    html=html.replace('</head>',`<meta name="description" content="${attrEsc(rich)}"></head>`);
    stats.metaImproved++;
  } else {
    stats.skippedAlreadyRich++;
  }
  const ogM=html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  if(ogM && ogM[1].length<200 && richOg.length>ogM[1].length){
    html=html.replace(ogM[0], `<meta property="og:description" content="${attrEsc(richOg)}"`); stats.ogImproved++;
  }
  const twM=html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/i);
  if(twM && twM[1].length<200 && richOg.length>twM[1].length){
    html=html.replace(twM[0], `<meta name="twitter:description" content="${attrEsc(richOg)}"`); stats.twImproved++;
  }
  if(html!==orig){writeFileSync(file,html); stats.filesChanged++;}
}
console.log(JSON.stringify(stats,null,2));
