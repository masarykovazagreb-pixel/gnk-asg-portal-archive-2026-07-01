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
const AUTHOR_NAME='Nermin Sefić';
const AUTHOR_URL='https://gnk-asg.hr/nermin-sefic/';
const AUTHOR_IMAGE='/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp';
const GROUP_ENTITY='GNK DINAMO Ltd. USA Group';
const writeIfChanged=(file,content)=>{const before=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;if(before===content)return false;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return true;};
// Pravila: meta oznake i hashtagovi ne smiju sadrzavati ime autora ni naziv grupe.
// Takva imena se uklanjaju iz kljucnih rijeci i hashtagova (ne baca se greska,
// da cron ne padne zbog starih paketa). Autorski okvir prikazuje se samo za
// stavke navedene u data/approved_mentions.json.
const BRAND_TAG='#GNKASG';
const AUTHOR_TAGS=['#NerminSefić','#NerminSefic'];
const foldText=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const isNameToken=t=>/nermin|sefic|dinamo/.test(foldText(t).replace(/[^a-z]/g,''));
const APPROVED_MENTIONS_FILE=path.join(ROOT,'data/approved_mentions.json');
const normalizeApprovedKey=value=>{
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(/^https?:\/\//i.test(raw)){
    try{return new URL(raw).pathname.replace(/\/+$/,'')+'/';}catch{return ''}
  }
  if(raw.startsWith('/'))return raw.replace(/\/+$/,'')+'/';
  return raw;
};
const APPROVED_MENTIONS_DATA=(()=>{
  if(!fs.existsSync(APPROVED_MENTIONS_FILE))return {scope:null,keys:new Set()};
  const source=JSON.parse(fs.readFileSync(APPROVED_MENTIONS_FILE,'utf8'));
  const keys=new Set();
  for(const x of [...(source.approved_items||[]),...(source.approved_urls||[])]){
    const v=typeof x==='string'?x:(x.slug||x.route||x.url||x.id||'');
    const key=normalizeApprovedKey(v);
    if(key)keys.add(key);
  }
  return {scope:source.approved_scope||null,keys};
})();
// approved_scope dopušta autorski okvir, ali konkretna stranica mora biti na vlasnikovom popisu.
const isApprovedMention=item=>{
  if(APPROVED_MENTIONS_DATA.scope!=='all_articles_with_author_box')return false;
  return APPROVED_MENTIONS_DATA.keys.has(item.slug)||APPROVED_MENTIONS_DATA.keys.has(normalizeApprovedKey(routeFor(item)));
};
const hashtagsFor=item=>{
  const source=Array.isArray(item.hashtags)&&item.hashtags.length?item.hashtags:[...(item.keywords||[]),item.section].filter(Boolean);
  const seen=new Set([foldText(BRAND_TAG)]);
  const topics=[];
  for(const raw of source){
    if(isNameToken(raw))continue;
    const text=String(raw);
    const tag=(text.startsWith('#')?text:'#'+text.split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('')).replace(/[^\p{L}\p{N}#]/gu,'');
    if(tag.length<5||isNameToken(tag))continue;
    const key=foldText(tag);
    if(seen.has(key))continue;
    seen.add(key);topics.push(tag);
    if(topics.length===9)break;
  }
  // Jedna kanonska oznaka autora, samo za stavke odobrene u approved_mentions.json.
  const head=isApprovedMention(item)?[BRAND_TAG,...AUTHOR_TAGS]:[BRAND_TAG];
  return [...head,...topics].join(' ');
};
const AUTHOR_BOX_HTML=item=>`<aside class="article-author"><img src="${AUTHOR_IMAGE}" alt="Nermin Sefić — autor teksta ${esc(item.title)}" width="320" height="320" loading="eager"><div><span>Autor</span><strong>Nermin Sefić</strong><a href="/nermin-sefic/">Profil autora</a><small>GNK ASG · GNK DINAMO Ltd. USA Group</small></div></aside>`;
function articleHtml(item,dateIso){
  const route=routeFor(item),canonical=`https://gnk-asg.hr${route}`;
  const normalizedKeywords=[...new Set([...(item.keywords||[]).filter(k=>!isNameToken(k)),'GNK ASG'])];
  const authorBox=isApprovedMention(item)?AUTHOR_BOX_HTML(item):'';
  const keywords=normalizedKeywords.join(', '),topicImage=item.image||AUTHOR_IMAGE;
  const author={type:'Person',name:AUTHOR_NAME,url:AUTHOR_URL,image:`https://gnk-asg.hr${AUTHOR_IMAGE}`};
  const ld={"@context":"https://schema.org","@type":item.type==='komentar'?'OpinionNewsArticle':'Article',headline:item.title,description:item.description,datePublished:dateIso,dateModified:dateIso,mainEntityOfPage:{"@type":"WebPage","@id":canonical},author:{"@type":"Person",name:author.name,url:author.url,image:author.image},publisher:{"@type":"Organization",name:"GNK ASG d.o.o.",url:"https://gnk-asg.hr/",logo:{"@type":"ImageObject",url:"https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg"}},image:[`https://gnk-asg.hr${topicImage}`,author.image],articleSection:item.section,keywords:normalizedKeywords,about:[{"@type":"Person","name":AUTHOR_NAME,"url":AUTHOR_URL},{"@type":"Organization","name":"GNK ASG d.o.o.","url":"https://gnk-asg.hr/"},{"@type":"Organization","name":GROUP_ENTITY}]};
  const headings=['Operativni kontekst','Ključna upravljačka odluka','Praktična primjena','Zaključak'];
  // item.headings (opcionalno): naslov za svaki odjeljak nakon prvog odlomka; prazan string = bez naslova.
  const headingFor=i=>Array.isArray(item.headings)?(item.headings[i-1]||''):headings[Math.min(i-1,headings.length-1)];
  const body=(item.paragraphs||[]).map((p,i)=>`${i&&headingFor(i)?`<h2>${esc(headingFor(i))}</h2>`:''}<p>${esc(p)}</p>`).join('');
  const links=(item.links||[]).map(link=>`<li><a href="${esc(link)}">${esc(link)}</a></li>`).join('');
  const sources=(item.sources||[]).length?`<section class="article-sources"><h2>Referentni izvori</h2><ul>${item.sources.map(source=>`<li><a href="${esc(source.url)}" rel="nofollow noopener" target="_blank">${esc(source.name)}</a></li>`).join('')}</ul><p>Objava je originalna analiza; navedeni izvori služe kao referentna dokumentacija.</p></section>`:'';
  const authorMeta=`<meta name="author" content="${AUTHOR_NAME}"><meta property="article:author" content="${AUTHOR_URL}"><meta name="author-image" content="https://gnk-asg.hr${AUTHOR_IMAGE}">`;
  const back=item.type==='objava'?'/objave/':'/komentari/';
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(item.seoTitle)}</title><meta name="description" content="${esc(item.description)}"><meta name="keywords" content="${esc(keywords)}">${authorMeta}<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="hr_HR"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${esc(item.seoTitle)}"><meta property="og:description" content="${esc(item.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://gnk-asg.hr${esc(topicImage)}"><meta property="og:image:alt" content="${esc(item.title)} — Nermin Sefić"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(item.seoTitle)}"><meta name="twitter:description" content="${esc(item.description)}"><meta name="twitter:image" content="https://gnk-asg.hr${esc(topicImage)}"><script type="application/ld+json">${JSON.stringify(ld)}</script><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260714-seo-v3"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260721-header-fulltransparent-v1"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="/" aria-label="Hrvatski" aria-current="page">HR</a><a href="/en/" aria-label="English">EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">IZBORNIK</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="editorial-wrap article"><img class="editorial-logo" src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG"><header class="article-header"><p class="eyebrow">${esc(labelFor(item))} · ${esc(item.section)} · ${dateLabel(new Date(dateIso))}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.summary)}</p></header>${authorBox}<img class="article-cover" src="${esc(topicImage)}" alt="${esc(item.title)} — autorski tekst Nermina Sefića"><article class="article-body">${body}<h2>Povezane teme</h2><ul>${links}</ul>${sources}<p class="editorial-approval"><strong>Urednička odgovornost:</strong> objavu je prije objave odobrio glavni urednik Nermin Sefić.</p><p class="article-hashtags">${esc(hashtagsFor(item))}</p></article><a class="article-back" href="${back}">← Povratak</a></main><script src="/assets/app.js?v=20260721-hero-rounded-v1" defer></script></body></html>`;
}
function appendCard(indexPath,item){
  let html=fs.readFileSync(indexPath,'utf8'),route=routeFor(item);
  if(html.includes(`href="${route}"`))return false;
  const cardImage=item.image||AUTHOR_IMAGE;
  const card=`<article class="editorial-card"><img src="${esc(cardImage)}" alt="${esc(item.title)} — naslovna ilustracija" title="${esc(item.title)}"><p class="eyebrow">${esc(item.section)}</p><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><a href="${route}">Otvori ${item.type==='objava'?'objavu':'komentar'} →</a></article>`;
  const gridStart=html.indexOf('<section class="editorial-grid">');
  const gridEnd=gridStart>=0?html.indexOf('</section>',gridStart):-1;
  if(gridStart<0||gridEnd<0)throw new Error(`Editorial grid markers not found: ${indexPath}`);
  html=html.slice(0,gridEnd)+card+html.slice(gridEnd);
  return writeIfChanged(indexPath,html);
}
function appendAktualCard(item,dateIso){
  const file=path.join(ROOT,'gnk-aktual','index.html');
  if(!fs.existsSync(file))return false;
  let html=fs.readFileSync(file,'utf8'),route=routeFor(item);
  if(html.includes(`href="${route}"`))return false;
  const start='    <div id="akKomentarIstaknuti">';
  const grid='    <div class="ak-komentari-grid" id="akKomentariGrid">';
  const a=html.indexOf(start),b=html.indexOf(grid);
  if(a<0||b<a)throw new Error('AKTUAL commentary markers not found');
  const oldSegment=html.slice(a,b);
  const oldAnchor=(oldSegment.match(/<a class="ak-komentar-istaknuti"[\s\S]*?<\/a>/)||[])[0]||'';
  const oldCard=oldAnchor?oldAnchor.replace('class="ak-komentar-istaknuti"','class="ak-komentar-kartica"'):'';
  const featuredImage=item.image||AUTHOR_IMAGE;
  const featured=`${start}<a class="ak-komentar-istaknuti" href="${route}"><img src="${esc(featuredImage)}" alt="${esc(item.title)} — naslovna ilustracija" title="${esc(item.title)}"><div class="tijelo"><span class="oznaka">Novi autorski tekst · ${dateLabel(new Date(dateIso))}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||item.description)}</p></div></a></div>\n`;
  html=html.slice(0,a)+featured+html.slice(b);
  if(oldCard&&!html.includes(oldCard.replace('class="ak-komentar-kartica"','class="ak-komentar-kartica"'))){
    const open=grid;
    html=html.replace(open,open+oldCard);
  }else if(oldCard){
    const gridPos=html.indexOf(grid)+grid.length;
    if(!html.slice(gridPos,gridPos+Math.max(1000,oldCard.length+100)).includes(oldCard))html=html.slice(0,gridPos)+oldCard+html.slice(gridPos);
  }
  return writeIfChanged(file,html);
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
  let publishedNow=false;
  // Self-heal: a package may already be marked published while its canonical HTML
  // is missing (for example after an incomplete historical materialization). In
  // that case rebuild only the missing public page from the locked package data.
  if(due&&already){
    for(const item of items){
      const target=fileFor(item),route=routeFor(item);
      if(!fs.existsSync(target)){
        if(writeIfChanged(target,articleHtml(item,pack.publishAt)))summary.publicChanged=true;
        itemSummary.published.push(route);summary.published.push(route);
      }
    }
  }
  if(due&&!already){
    if(!pack.deployApproved)throw new Error(`Package ${pack.id} lacks deploy approval`);
    const allRoutes=[];
    for(const item of items){
      const target=fileFor(item),route=routeFor(item);allRoutes.push(route);
      if(writeIfChanged(target,articleHtml(item,pack.publishAt)))summary.publicChanged=true;
      itemSummary.published.push(route);summary.published.push(route);
    }
    pack.publishedAt=now.toISOString();pack.status='published';pack.publishedRoutes=allRoutes;
    publishedNow=true;
    summary.stateChanged=true;
  }
  const dailyDistributionContract=pack.author===AUTHOR_NAME&&Array.isArray(pack.distribution)&&pack.distribution.includes('AKTUAL MEDIA / Komentari');
  if(due&&(publishedNow||dailyDistributionContract)){
    for(const item of items){
      const target=fileFor(item);
      if(!fs.existsSync(target))throw new Error(`Published editorial route missing: ${routeFor(item)}`);
      if(item.type==='objava'&&appendCard(path.join(ROOT,'objave','index.html'),item))summary.publicChanged=true;
      if(appendCard(path.join(ROOT,'komentari','index.html'),item))summary.publicChanged=true;
      if(appendAktualCard(item,pack.publishAt))summary.publicChanged=true;
      if(appendSitemap(item,pack.publishAt.slice(0,10)))summary.publicChanged=true;
    }
  }
  summary.packages.push(itemSummary);
}
const nextPlan=JSON.stringify(plan,null,2);
if(nextPlan!==planSource){writeIfChanged(PLAN,nextPlan);summary.stateChanged=true;}
if(summary.publicChanged||summary.stateChanged){writeIfChanged(REPORT,JSON.stringify(summary,null,2));}
console.log(JSON.stringify(summary,null,2));
