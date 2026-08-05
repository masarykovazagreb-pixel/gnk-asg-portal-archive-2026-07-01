import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('apps/portal');
const PLAN_DIR=path.join(ROOT,'data/editorial-plan');
const PLAN=path.join(PLAN_DIR,'manifest.json');
const HOLDS=path.join(PLAN_DIR,'publication-holds.json');
const REPORT=path.resolve('artifacts/editorial-scheduled-publish.json');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const routeFor=item=>`/${item.type==='objava'?'objave':'komentari'}/${item.slug}/`;
const fileFor=item=>path.join(ROOT,item.type==='objava'?'objave':'komentari',item.slug,'index.html');
const labelFor=item=>item.type==='objava'?'Objava':'Komentar Nermina Sefića';
const dateLabel=date=>new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'long',year:'numeric',timeZone:'Europe/Zagreb'}).format(date);
const writeIfChanged=(file,content)=>{const before=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;if(before===content)return false;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return true;};
const hashtagsFor=item=>{
  // Oznake s kvacicama ne rade pouzdano na drustvenim mrezama, pa uz svaku ide
  // i inacica bez njih. Opcenite oznake poput #Sefic izbacene su jer hvataju
  // tudji sadrzaj i ne donose nista.
  const bezKvacica=t=>t.replace(/[čćžšđČĆŽŠĐ]/g,z=>({'č':'c','ć':'c','ž':'z','š':'s','đ':'d','Č':'C','Ć':'C','Ž':'Z','Š':'S','Đ':'D'}[z]));
  const base=['#GNKASG','#NerminSefic','#NerminSefić','#GNKDINAMOLtd'];
  const topicTags=(item.keywords||[]).slice(0,3)
    .map(k=>'#'+k.split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('').replace(/[^\wŠĐČĆŽšđčćž]/g,''))
    .filter(t=>t.length>4&&!base.includes(t));
  const sve=[];
  for(const t of [...topicTags,...base]){
    if(!sve.includes(t)) sve.push(t);
    const b=bezKvacica(t);
    if(b!==t&&!sve.includes(b)) sve.push(b);
  }
  return sve.join(' ');
};
function articleHtml(item,dateIso){
  const route=routeFor(item),canonical=`https://gnk-asg.hr${route}`,keywords=(item.keywords||[]).join(', ');
  const author=item.type==='komentar'?{type:'Person',name:'Nermin Sefić',url:'https://gnk-asg.hr/nermin-sefic/'}:{type:'Organization',name:'GNK ASG d.o.o.',url:'https://gnk-asg.hr/'};
  const ld={"@context":"https://schema.org","@type":item.type==='komentar'?'OpinionNewsArticle':'Article',headline:item.title,description:item.description,datePublished:dateIso,dateModified:dateIso,mainEntityOfPage:{"@type":"WebPage","@id":canonical},author:{"@type":author.type,name:author.name,url:author.url},publisher:{"@type":"Organization",name:"GNK ASG d.o.o.",url:"https://gnk-asg.hr/",logo:{"@type":"ImageObject",url:"https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg"}},image:`https://gnk-asg.hr${item.image}`,articleSection:item.section,keywords:item.keywords||[]};
  const headings=['Operativni kontekst','Ključna upravljačka odluka','Praktična primjena','Zaključak'];
  const body=(item.paragraphs||[]).map((p,i)=>`${i?`<h2>${esc(headings[Math.min(i-1,headings.length-1)])}</h2>`:''}<p>${esc(p)}</p>`).join('');
  const links=(item.links||[]).map(link=>`<li><a href="${esc(link)}">${esc(link)}</a></li>`).join('');
  const sources=(item.sources||[]).length?`<section class="article-sources"><h2>Referentni izvori</h2><ul>${item.sources.map(source=>`<li><a href="${esc(source.url)}" rel="nofollow noopener" target="_blank">${esc(source.name)}</a></li>`).join('')}</ul><p>Objava je originalna analiza; navedeni izvori služe kao referentna dokumentacija.</p></section>`:'';
  const authorMeta=item.type==='komentar'?'<meta name="author" content="Nermin Sefić">':'<meta name="author" content="GNK ASG Editorial Desk">';
  const back=item.type==='objava'?'/objave/':'/komentari/';
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(item.seoTitle)}</title><meta name="description" content="${esc(item.description)}"><meta name="keywords" content="${esc(keywords)}">${authorMeta}<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="hr_HR"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${esc(item.seoTitle)}"><meta property="og:description" content="${esc(item.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://gnk-asg.hr${esc(item.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(item.seoTitle)}"><meta name="twitter:description" content="${esc(item.description)}"><meta name="twitter:image" content="https://gnk-asg.hr${esc(item.image)}"><script type="application/ld+json">${JSON.stringify(ld)}</script><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260714-seo-v3"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260721-header-fulltransparent-v1"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="/" aria-label="Hrvatski" aria-current="page">HR</a><a href="/en/" aria-label="English">EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">IZBORNIK</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="editorial-wrap article"><img class="editorial-logo" src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG"><header class="article-header"><p class="eyebrow">${esc(labelFor(item))} · ${esc(item.section)} · ${dateLabel(new Date(dateIso))}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.summary)}</p></header><img class="article-cover" src="${esc(item.image)}" alt="${esc(item.title)}"><article class="article-body">${body}<h2>Povezane teme</h2><ul>${links}</ul>${sources}<p class="editorial-approval"><strong>Urednička odgovornost:</strong> objavu je prije objave odobrio glavni urednik Nermin Sefić.</p><p class="article-hashtags">${esc(hashtagsFor(item))}</p></article><a class="article-back" href="${back}">← Povratak</a></main><script src="/assets/app.js?v=20260721-hero-rounded-v1" defer></script></body></html>`;
}
function appendCard(indexPath,item){
  let html=fs.readFileSync(indexPath,'utf8'),route=routeFor(item);
  if(html.includes(`href="${route}"`))return false;
  const card=`<article class="editorial-card"><img src="${esc(item.image)}" alt="${esc(item.title)}"><p class="eyebrow">${esc(item.section)}</p><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><a href="${route}">Otvori ${item.type==='objava'?'objavu':'komentar'} →</a></article>`;
  html=html.replace('</section></main>',`${card}</section></main>`);
  return writeIfChanged(indexPath,html);
}
function appendSitemap(item,date){
  const file=path.join(ROOT,'editorial-sitemap.xml');let xml=fs.readFileSync(file,'utf8'),url=`https://gnk-asg.hr${routeFor(item)}`;
  if(xml.includes(`<loc>${url}</loc>`))return false;
  xml=xml.replace('</urlset>',`  <url><loc>${url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
  return writeIfChanged(file,xml);
}
function loadPublicationHolds(){
  if(!fs.existsSync(HOLDS))return {version:null,active:new Map()};
  const source=JSON.parse(fs.readFileSync(HOLDS,'utf8'));
  if(!Array.isArray(source.holds))throw new Error(`Invalid publication holds file: ${HOLDS}`);
  const active=new Map();
  for(const hold of source.holds){
    if(!hold?.active)continue;
    if(!hold.packageId||typeof hold.packageId!=='string')throw new Error('Active publication hold lacks packageId');
    if(!hold.reason||String(hold.reason).trim().length<20)throw new Error(`Publication hold ${hold.packageId} lacks a substantive reason`);
    if(active.has(hold.packageId))throw new Error(`Duplicate active publication hold: ${hold.packageId}`);
    active.set(hold.packageId,hold);
  }
  return {version:source.version||null,active};
}
if(!fs.existsSync(PLAN))throw new Error(`Missing plan: ${PLAN}`);
const planSource=fs.readFileSync(PLAN,'utf8');
const plan=JSON.parse(planSource);
const publicationHolds=loadPublicationHolds();
const packageIds=new Set((plan.packages||[]).map(pack=>pack.id));
for(const packageId of publicationHolds.active.keys())if(!packageIds.has(packageId))throw new Error(`Publication hold references unknown package: ${packageId}`);
const now=new Date(process.env.EDITORIAL_NOW||Date.now());
const summary={ok:true,version:'GNK_ASG_EDITORIAL_SCHEDULED_PUBLISH_V3_20260714',now:now.toISOString(),publicationHoldsVersion:publicationHolds.version,packages:[],published:[],held:[],publicChanged:false,stateChanged:false};
for(const pack of plan.packages||[]){
  const items=(pack.files||[]).flatMap(file=>JSON.parse(fs.readFileSync(path.join(PLAN_DIR,file),'utf8')));
  const publishAt=new Date(pack.publishAt),due=now>=publishAt,already=Boolean(pack.publishedAt),hold=publicationHolds.active.get(pack.id);
  const itemSummary={id:pack.id,publishAt:pack.publishAt,due,alreadyPublished:already,publicationHeld:Boolean(hold),holdReason:hold?.reason||null,published:[]};
  if(hold){
    if(already)throw new Error(`Publication hold ${pack.id} was applied after publication and cannot unpublish content`);
    summary.held.push(pack.id);
    summary.packages.push(itemSummary);
    continue;
  }
  if(due&&!already){
    if(!pack.deployApproved)throw new Error(`Package ${pack.id} lacks deploy approval`);
    const allRoutes=[];
    for(const item of items){
      const target=fileFor(item),route=routeFor(item);allRoutes.push(route);
      if(writeIfChanged(target,articleHtml(item,pack.publishAt)))summary.publicChanged=true;
      if(appendCard(path.join(ROOT,item.type==='objava'?'objave':'komentari','index.html'),item))summary.publicChanged=true;
      if(appendSitemap(item,pack.publishAt.slice(0,10)))summary.publicChanged=true;
      itemSummary.published.push(route);summary.published.push(route);
    }
    pack.publishedAt=now.toISOString();pack.status='published';pack.publishedRoutes=allRoutes;
    summary.stateChanged=true;
  }
  summary.packages.push(itemSummary);
}
const nextPlan=JSON.stringify(plan,null,2);
if(nextPlan!==planSource){writeIfChanged(PLAN,nextPlan);summary.stateChanged=true;}
if(summary.publicChanged||summary.stateChanged){writeIfChanged(REPORT,JSON.stringify(summary,null,2));}
console.log(JSON.stringify(summary,null,2));
