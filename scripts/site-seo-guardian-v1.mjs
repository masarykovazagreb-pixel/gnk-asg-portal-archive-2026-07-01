// GNK ASG — Site-wide SEO guardian.
// Pokriva SVE stranice portala koje NISU u editorial-registryju
// (naslovnica, /nermin-sefic/, /gnk-aktual/, tematske, kategorije,
// tools stranice, itd.) i osigurava minimum:
//   - <meta name="description">  (aditivno; ne prepisuje postojeći ako je >=110 znakova)
//   - <meta name="author"> = Nermin Sefić (aditivno)
//   - og:title / og:description / og:image / og:type = website  (aditivno)
//   - twitter:card / twitter:title / twitter:description / twitter:image  (aditivno)
//   - link canonical  (aditivno, iz same rute)
//   - JSON-LD WebPage graf linkan na kanonski Person + Organization  (dodano samo ako nedostaje)
//   - alt/title enrichment za portret/logo/chart slike (isti standardi kao editorial)
// Aditivno u svakom koraku, nikad ne uklanja postojeće metapodatke.
import './remove-bpp-public-v2.mjs';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SITE='https://gnk-asg.hr';
const ROOT='apps/portal';
const SKIP=new Set(['admin','admin-center','control','automation-status','webmail','mail-studio','campaign-mailer','email-status','worker-ops','operator-dashboard','digital-headquarters','media-registration-admin','podijeli','api','assets','data','__preview']);
const read=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const reg=read('apps/portal/data/editorial-registry.json',{items:[]});
const editorialPaths=new Set((reg.items||[]).map(x=>x?.path).filter(Boolean));

const stats={files:0,descAdded:0,ogAdded:0,twAdded:0,canonAdded:0,jsonldAdded:0,authorAdded:0,altAdded:0,altEnriched:0,scanned:0};
const attrEsc=s=>String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const strip=s=>s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

const pages=[];
(function walk(dir){
  for(const n of readdirSync(dir)){
    const p=join(dir,n); let st;
    try{ st=statSync(p); }catch{continue;}
    if(st.isDirectory()){
      const rel=relative(ROOT,p);
      const first=rel.split('/')[0];
      if(first && SKIP.has(first)) continue;
      // also skip /en/<skipped>/
      const parts=rel.split('/');
      if(parts[0]==='en' && parts[1] && SKIP.has(parts[1])) continue;
      walk(p);
    } else if(n==='index.html'){
      pages.push(p);
    }
  }
})(ROOT);
console.log('scanning', pages.length, 'pages');

for(const file of pages){
  stats.scanned++;
  const rel=relative(ROOT,file);
  const routePath='/'+rel.replace(/index\.html$/,'');
  if(editorialPaths.has(routePath)) continue;  // editorial covered by other scripts

  let html=readFileSync(file,'utf8');
  const orig=html;
  const isEn=/<html[^>]+lang="en"/i.test(html);
  const titleM=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle=titleM?strip(titleM[1]):'GNK ASG';

  const bodyM=html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText=bodyM?strip(bodyM[1]).slice(0,320):'';
  const firstPara=(bodyM?.[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i)||[])[1];
  const desc=(firstPara?strip(firstPara).slice(0,240):'')||bodyText||(isEn?'Nermin Sefić, Director of GNK ASG (GNK DINAMO Ltd. Group). Corporate governance, AI regulation, fintech and international business strategy.':'Nermin Sefić, direktor GNK ASG (GNK DINAMO Ltd. Group). Korporativno upravljanje, AI regulativa, fintech i međunarodna poslovna strategija.');

  const has = re => re.test(html);
  const insertHead = tag => { html = html.replace('</head>', tag+'</head>'); };

  if(!has(/<meta\s+name="description"/i)){
    insertHead(`<meta name="description" content="${attrEsc(desc)}">`); stats.descAdded++;
  }
  if(!has(/<meta\s+name="author"/i)){
    insertHead(`<meta name="author" content="Nermin Sefić">`); stats.authorAdded++;
  }
  if(!has(/<link\s+rel="canonical"/i)){
    insertHead(`<link rel="canonical" href="${SITE}${routePath}">`); stats.canonAdded++;
  }
  if(!has(/property="og:title"/i)){
    const ogT=pageTitle.split(' | ')[0];
    const ogImg=`${SITE}/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg`;
    insertHead(`<meta property="og:type" content="website"><meta property="og:title" content="${attrEsc(ogT)}"><meta property="og:description" content="${attrEsc(desc.slice(0,300))}"><meta property="og:url" content="${SITE}${routePath}"><meta property="og:image" content="${ogImg}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:site_name" content="GNK ASG">`);
    stats.ogAdded++;
  }
  if(!has(/name="twitter:card"/i)){
    const ogImg=`${SITE}/assets/people/nermin-sefic/og/nermin-sefic-01-official-desk-portrait.jpg`;
    insertHead(`<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attrEsc(pageTitle.split(' | ')[0])}"><meta name="twitter:description" content="${attrEsc(desc.slice(0,240))}"><meta name="twitter:image" content="${ogImg}">`);
    stats.twAdded++;
  }
  // WebPage JSON-LD linked to canonical Person + Organization if no Person JSON-LD already exists
  if(!/"@type"\s*:\s*"(Person|Organization|WebPage|WebSite|Article)"/i.test(html)){
    const ld={
      '@context':'https://schema.org',
      '@type':'WebPage',
      '@id':`${SITE}${routePath}`,
      url:`${SITE}${routePath}`,
      name:pageTitle,
      description:desc.slice(0,300),
      inLanguage:isEn?'en':'hr',
      isPartOf:{'@id':`${SITE}/#website`},
      about:{'@id':`${SITE}/nermin-sefic/#person`},
      publisher:{'@id':`${SITE}/#organization`}
    };
    insertHead(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
    stats.jsonldAdded++;
  }
  // Alt/title enrichment (mask script blocks)
  const scripts=[]; const masked=html.replace(/<script[\s\S]*?<\/script>/gi,m=>{scripts.push(m);return `\u0000S${scripts.length-1}\u0000`;});
  let mask2=masked.replace(/<img\b[^>]*>/gi,(tag)=>{
    const src=(tag.match(/src="([^"]*)"/i)||[])[1]||'';
    const isPerson=/\/assets\/people\/nermin-sefic\//.test(src);
    const isLogo=/logo-gnk-asg/.test(src);
    const isChart=/\/assets\/editorial\/world-topics\//.test(src);
    if(!isPerson&&!isLogo&&!isChart) return tag;
    let t=tag;
    const altM=t.match(/alt="([^"]*)"/i); const alt=altM?altM[1]:null;
    const personAlt=isEn?'Nermin Sefić (Sefic Nermin) — Director, GNK ASG d.o.o. | GNK DINAMO Ltd.':'Nermin Sefić (Sefic Nermin) — direktor GNK ASG d.o.o. | GNK DINAMO Ltd.';
    const logoAlt='GNK ASG d.o.o. — GNK DINAMO Ltd. Group';
    if(alt===null||alt.trim()===''){
      const val=isPerson?personAlt:(isLogo?logoAlt:(isEn?'Data chart · Nermin Sefić / GNK ASG':'Grafički prikaz · Nermin Sefić / GNK ASG'));
      t = alt===null ? t.replace(/<img\b/i,`<img alt="${val}"`) : t.replace(/alt="[^"]*"/i,`alt="${val}"`);
      stats.altAdded++;
    } else if(isPerson&&!/sefi[ćc]/i.test(alt)){
      const enriched=/\bnermin\b/i.test(alt) ? alt.replace(/\bnermin\b/i,'Nermin Sefić') : `${alt} — Nermin Sefić (Sefic Nermin), GNK ASG`;
      t=t.replace(/alt="([^"]*)"/i,`alt="${enriched}"`); stats.altEnriched++;
    } else if(isLogo&&!/gnk/i.test(alt)){
      t=t.replace(/alt="([^"]*)"/i,(m,a)=>`alt="${a} — GNK ASG"`); stats.altEnriched++;
    } else if(isChart&&!/sefi[ćc]|gnk/i.test(alt)){
      t=t.replace(/alt="([^"]*)"/i,(m,a)=>`alt="${a} · Nermin Sefić / GNK ASG"`); stats.altEnriched++;
    }
    if(isPerson&&!/title="/i.test(t)) t=t.replace(/<img\b/i,'<img title="Nermin Sefić (Sefic Nermin) — GNK ASG · GNK DINAMO Ltd."');
    return t;
  });
  html=mask2.replace(/\u0000S(\d+)\u0000/g,(m,i)=>scripts[+i]);

  if(html!==orig){ writeFileSync(file,html); stats.files++; }
}
console.log(JSON.stringify(stats,null,2));
