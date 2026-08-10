// GNK ASG — Editorial entity linkage:
//  A) Ako og:image editorial stranice = generički market-information.svg → zamijeni s NerminSefić OG JPG
//     (samo kad ime slike točno = "market-information.svg" i unutar editorial rute).
//  B) Ubaci JSON-LD Article graf koji linka na kanonski Person i Organization iz /nermin-sefic/entity.jsonld
//     (samo ako Article schema još ne postoji za taj URL).
//  C) Meta autor + article:author kad fali.
// Ništa ne uklanja, ništa ne prepisuje.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE='https://gnk-asg.hr';
const OG_FALLBACK='/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg';
const OG_ABS=SITE+OG_FALLBACK;
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const registry=read('apps/portal/data/editorial-registry.json',{items:[]});
const stats={ogFixed:0,articleLdAdded:0,authorMetaAdded:0,files:0};
for(const it of registry.items||[]){
  if(!it?.path||!it?.url) continue;
  const file='apps/portal'+it.path.replace(/\/$/,'/index.html');
  if(!existsSync(file)) continue;
  let html=readFileSync(file,'utf8');
  const orig=html;
  // A) fix generic og:image within editorial pages
  const isEditorial=/^\/(en\/)?(publications|analyses|kolumne|komentari|analize|objave)\//.test(it.path)||/^\/(en\/)?tematske\//.test(it.path);
  if(isEditorial&&/og:image[^>]+\/assets\/editorial\/[a-z-]+\.svg/i.test(html)){
    html=html.replace(/(<meta[^>]+og:image[^>]+content=")[^"]*\/assets\/editorial\/[a-z-]+\.svg([^"]*)"/gi,`$1${OG_ABS}"`)
             .replace(/(<meta[^>]+twitter:image[^>]+content=")[^"]*\/assets\/editorial\/[a-z-]+\.svg([^"]*)"/gi,`$1${OG_ABS}"`);
    stats.ogFixed++;
  }
  // B) add Article JSON-LD linked to canonical Person + Organization if none present
  const hasArticle=/"@type"\s*:\s*"(Article|NewsArticle|BlogPosting)"/i.test(html);
  if(!hasArticle){
    const isEn=(it.language||'hr')==='en';
    const ld={
      '@context':'https://schema.org',
      '@type':'Article',
      mainEntityOfPage:{'@type':'WebPage','@id':it.url},
      headline:String(it.title||'').slice(0,110),
      description:it.description||'',
      inLanguage:isEn?'en':'hr',
      author:{'@id':`${SITE}/nermin-sefic/#person`},
      publisher:{'@id':`${SITE}/#organization`},
      isPartOf:{'@id':`${SITE}/#website`},
      image:[it.image||OG_ABS],
      datePublished:it.publishedAt||undefined,
      dateModified:it.publishedAt||undefined,
      url:it.url,
      keywords:(it.keywords||[]).join(', '),
      about:it.hashtags||[]
    };
    Object.keys(ld).forEach(k=>ld[k]===undefined&&delete ld[k]);
    const tag=`<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    html=html.replace('</head>', tag+'</head>');
    stats.articleLdAdded++;
  }
  // C) meta author (if missing)
  if(!/<meta\s+name="author"/i.test(html)){
    html=html.replace('</head>','<meta name="author" content="Nermin Sefić"></head>');
    stats.authorMetaAdded++;
  }
  if(!/article:author/i.test(html)){
    html=html.replace('</head>','<meta property="article:author" content="Nermin Sefić"></head>');
  }
  if(html!==orig){ writeFileSync(file,html); stats.files++; }
}
console.log(JSON.stringify(stats,null,2));
