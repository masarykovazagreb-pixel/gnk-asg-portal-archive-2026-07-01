import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE='https://gnk-asg.hr';
const CHART_DIMS={"chart01_ai_governance.webp": {"w": 1120, "h": 700}, "chart01b_ai_penalties.webp": {"w": 1120, "h": 700}, "chart02_minerals.webp": {"w": 1120, "h": 700}, "chart02b_cobalt_children.webp": {"w": 1120, "h": 700}, "chart03_debt.webp": {"w": 1120, "h": 700}, "chart03b_china_lending.webp": {"w": 1120, "h": 700}, "chart04_demographics.webp": {"w": 1120, "h": 700}, "chart04b_korea_fertility.webp": {"w": 1120, "h": 700}, "chart05_supplychain.webp": {"w": 1120, "h": 700}, "chart05b_vietnam_paradox.webp": {"w": 1120, "h": 700}, "chart06_water.webp": {"w": 1120, "h": 700}, "chart06b_israel_water.webp": {"w": 1120, "h": 700}, "chart07_antibiotics.webp": {"w": 1120, "h": 700}, "chart07b_amr_age.webp": {"w": 1120, "h": 700}, "chart08_space.webp": {"w": 1120, "h": 700}, "chart08b_starlink_share.webp": {"w": 980, "h": 840}, "chart09_food.webp": {"w": 1120, "h": 700}, "chart09b_deere_results.webp": {"w": 1260, "h": 700}, "chart10_cyber.webp": {"w": 1120, "h": 700}, "chart10b_solarwinds.webp": {"w": 1120, "h": 700}};
const SRC_DIR=resolve('/tmp/worldtopics-release');
const DATA_DIR=resolve('content/world-topics');
const readJson=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const imageManifest=readJson(resolve('apps/portal/data/editorial-image-manifest.json'),{items:[]});
const coversByPath=new Map((imageManifest.items||[]).map(entry=>[entry.path,entry]));
const coverFor=(route)=>{
  const cover=coversByPath.get(route);
  if(!cover?.image||!cover?.url||!cover?.alt)throw new Error(`Missing generated editorial cover for ${route}`);
  return cover;
};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s)};
const esc=(s='')=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const attr=(s='')=>esc(s).replace(/'/g,'&#39;');

const topics=[
{n:1,hr:'01-utrka-ai-regulacije-hr.md',en:'01-ai-governance-race-en.md',hrSlug:'utrka-ai-regulacije-sad-eu-kina',enSlug:'ai-governance-race-us-eu-china',hrSection:'Umjetna inteligencija i regulacija',enSection:'Artificial intelligence and regulation',charts:['chart01_ai_governance.webp','chart01b_ai_penalties.webp'],kw:['AI governance','AI regulation','EU AI Act','United States AI policy','China AI regulation'],tags:['AIGovernance','AIRegulation','EUAIAct','Geopolitics']},
{n:2,hr:'02-kriticni-minerali-hr.md',en:'02-critical-minerals-en.md',hrSlug:'kriticni-minerali-energetska-tranzicija-geopolitika',enSlug:'critical-minerals-energy-transition-geopolitics',hrSection:'Kritični minerali i geopolitika',enSection:'Critical minerals and geopolitics',charts:['chart02_minerals.webp','chart02b_cobalt_children.webp'],kw:['critical minerals','energy transition','lithium','cobalt','rare earths'],tags:['CriticalMinerals','EnergyTransition','Geopolitics','SupplyChains']},
{n:3,hr:'03-globalni-dug-hr.md',en:'03-global-debt-en.md',hrSlug:'globalni-dug-dva-desetljeca-jeftinog-novca',enSlug:'global-debt-two-decades-cheap-money',hrSection:'Globalni dug i financijska stabilnost',enSection:'Global debt and financial stability',charts:['chart03_debt.webp','chart03b_china_lending.webp'],kw:['global debt','sovereign debt','cheap money','interest rates','financial stability'],tags:['GlobalDebt','FinancialStability','InterestRates','MacroEconomics']},
{n:4,hr:'04-demografija-hr.md',en:'04-demographics-en.md',hrSlug:'demografska-preraspodjela-globalna-ekonomija',enSlug:'demographic-reshuffling-global-economy',hrSection:'Demografija i globalna ekonomija',enSection:'Demographics and the global economy',charts:['chart04_demographics.webp','chart04b_korea_fertility.webp'],kw:['demographics','Africa population','ageing Europe','fertility','global economy'],tags:['Demographics','Africa','Ageing','GlobalEconomy']},
{n:5,hr:'05-opskrbni-lanci-hr.md',en:'05-supply-chains-en.md',hrSlug:'kraj-jeftine-globalizacije-opskrbni-lanci',enSlug:'end-cheap-globalization-supply-chains',hrSection:'Opskrbni lanci i globalizacija',enSection:'Supply chains and globalization',charts:['chart05_supplychain.webp','chart05b_vietnam_paradox.webp'],kw:['supply chains','reshoring','friendshoring','globalization','industrial policy'],tags:['SupplyChains','Reshoring','Friendshoring','Globalization']},
{n:6,hr:'06-kriza-vode-hr.md',en:'06-water-scarcity-en.md',hrSlug:'globalna-nestasica-vode-sljedeca-kriza',enSlug:'global-water-scarcity-next-crisis',hrSection:'Voda, resursi i klimatski rizik',enSection:'Water, resources and climate risk',charts:['chart06_water.webp','chart06b_israel_water.webp'],kw:['water scarcity','water security','climate risk','desalination','infrastructure'],tags:['WaterScarcity','WaterSecurity','ClimateRisk','Infrastructure']},
{n:7,hr:'07-antimikrobna-rezistencija-hr.md',en:'07-antimicrobial-resistance-en.md',hrSlug:'antimikrobna-rezistencija-tiha-pandemija',enSlug:'antimicrobial-resistance-silent-pandemic',hrSection:'Zdravstvo i sistemski rizici',enSection:'Healthcare and systemic risks',charts:['chart07_antibiotics.webp','chart07b_amr_age.webp'],kw:['antimicrobial resistance','AMR','antibiotics','public health','health economics'],tags:['AMR','AntimicrobialResistance','PublicHealth','HealthEconomics']},
{n:8,hr:'08-svemirska-ekonomija-hr.md',en:'08-space-economy-en.md',hrSlug:'svemirska-ekonomija-privatni-kapital-orbita',enSlug:'space-economy-private-capital-orbit',hrSection:'Svemirska ekonomija i tehnologija',enSection:'Space economy and technology',charts:['chart08_space.webp','chart08b_starlink_share.webp'],kw:['space economy','private capital','satellites','launch market','Starlink'],tags:['SpaceEconomy','PrivateCapital','Satellites','Innovation']},
{n:9,hr:'09-sigurnost-hrane-hr.md',en:'09-food-security-en.md',hrSlug:'globalna-sigurnost-hrane-deset-milijardi',enSlug:'global-food-security-ten-billion',hrSection:'Sigurnost hrane i poljoprivreda',enSection:'Food security and agriculture',charts:['chart09_food.webp','chart09b_deere_results.webp'],kw:['food security','agriculture','population growth','agtech','food systems'],tags:['FoodSecurity','Agriculture','AgTech','GlobalEconomy']},
{n:10,hr:'10-kiberneticka-sigurnost-infrastrukture-hr.md',en:'10-critical-infrastructure-cybersecurity-en.md',hrSlug:'kiberneticka-sigurnost-kriticne-infrastrukture',enSlug:'critical-infrastructure-cybersecurity',hrSection:'Kibernetička sigurnost i infrastruktura',enSection:'Cybersecurity and infrastructure',charts:['chart10_cyber.webp','chart10b_solarwinds.webp'],kw:['critical infrastructure cybersecurity','cyber risk','NIS2','operational technology','resilience'],tags:['CyberSecurity','CriticalInfrastructure','NIS2','Resilience']}
];

function unpack(){
  const parts=readdirSync(DATA_DIR).filter(n=>/^release\.part\d+$/.test(n)).sort();
  if(parts.length<35) throw new Error(`Missing release parts: ${parts.length}`);
  const b64=parts.map(n=>readFileSync(resolve(DATA_DIR,n),'utf8').trim()).join('');
  const zip='/tmp/worldtopics-release.zip';
  writeFileSync(zip,Buffer.from(b64,'base64'));
  mkdirSync(SRC_DIR,{recursive:true});
  execFileSync('unzip',['-q','-o',zip,'-d',SRC_DIR],{stdio:'inherit'});
}

function inlineMd(s){
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" rel="nofollow noopener" target="_blank">$1</a>');
}
function mdToHtml(md){
  const lines=md.replace(/\r/g,'').split('\n');
  const out=[]; let list=null; let table=[];
  const flushList=()=>{if(list){out.push(`<${list.type}>${list.items.map(x=>`<li>${inlineMd(x)}</li>`).join('')}</${list.type}>`);list=null;}};
  const flushTable=()=>{if(table.length){const rows=table.filter(r=>!/^\s*\|?\s*:?-+/.test(r));if(rows.length){const cells=rows.map(r=>r.replace(/^\||\|$/g,'').split('|').map(c=>c.trim()));out.push('<div style="overflow:auto"><table>'+cells.map((cs,i)=>`<tr>${cs.map(c=>`<${i===0?'th':'td'}>${inlineMd(c)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')+'</table></div>');}table=[];}};
  let para=[]; const flushPara=()=>{if(para.length){out.push(`<p>${inlineMd(para.join(' '))}</p>`);para=[];}};
  for(const raw of lines){const line=raw.trimEnd();
    const figm=line.match(/^@@FIG:([^|]+)\|([^|]*)\|([^@]*)@@$/);
    if(figm){flushPara();flushList();flushTable();const fn=figm[1];const d=CHART_DIMS[fn]||{};out.push(`<figure class="world-chart"><img src="/assets/editorial/world-topics/${fn}" alt="${attr(figm[2]||'Data chart')}"${d.w?` width="${d.w}" height="${d.h}"`:''} loading="lazy" decoding="async">${figm[3].trim()?`<figcaption>${esc(figm[3].trim())}</figcaption>`:''}</figure>`);continue;}
    if(/^\|.*\|$/.test(line.trim())){flushPara();flushList();table.push(line.trim());continue;} else flushTable();
    const h=line.match(/^(#{2,6})\s+(.+)$/); if(h){flushPara();flushList();out.push(`<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`);continue;}
    const ul=line.match(/^[-*]\s+(.+)$/); const ol=line.match(/^\d+[.)]\s+(.+)$/); if(ul||ol){flushPara();const type=ol?'ol':'ul';if(!list||list.type!==type){flushList();list={type,items:[]}}list.items.push((ul||ol)[1]);continue;} else flushList();
    if(/^>\s?/.test(line)){flushPara();out.push(`<blockquote>${inlineMd(line.replace(/^>\s?/,''))}</blockquote>`);continue;}
    if(!line.trim()){flushPara();continue;}
    if(/^---+$/.test(line.trim())){flushPara();out.push('<hr>');continue;}
    para.push(line.trim());
  }
  flushPara();flushList();flushTable(); return out.join('\n');
}
function splitTitle(text){const lines=text.replace(/\r/g,'').split('\n');const title=(lines.shift()||'').replace(/^#\s*/,'').trim();return [title,lines.join('\n').trim()];}
function descFrom(body){for(const b of body.split(/\n\s*\n/)){let s=b.replace(/[#*_>`\[\]()]/g,' ').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();if(s.length>80)return s.length>205?s.slice(0,202).replace(/\s+\S*$/,'')+'…':s;}return ''}

function pageFor(t,lang){
  const isHr=lang==='hr';
  const file=resolve(SRC_DIR,isHr?t.hr:t.en);
  const [title,body]=splitTitle(readFileSync(file,'utf8'));
  const hasInline=/!\[[^\]]*\]\([^)]*chart[0-9]/i.test(body);
  const bodyPre=body.replace(/!\[([^\]]*)\]\(([^)\s]*?(chart[0-9]+b?_[a-z0-9_]+)\.(?:png|webp))\)\s*\n?\s*(?:\*([^*\n]+)\*)?/gi,(m,alt,srcp,base,cap)=>{
    const fn=base+'.webp';
    return '@@FIG:'+fn+'|'+(alt||'').replace(/[|@]/g,' ')+'|'+(cap||'').replace(/[|@]/g,' ')+'@@';
  });
  const desc=descFrom(body);
  const slug=isHr?t.hrSlug:t.enSlug;
  const altSlug=isHr?t.enSlug:t.hrSlug;
  const route=isHr?`/objave/${slug}/`:`/en/publications/${slug}/`;
  const altRoute=isHr?`/en/publications/${altSlug}/`:`/objave/${altSlug}/`;
  const section=isHr?t.hrSection:t.enSection;
  const cover=coverFor(route);
  const coverUrl=cover.url;
  const chartUrls=t.charts.map(n=>`${SITE}/assets/editorial/world-topics/${n}`);
  const tags=[...new Set(t.tags)].slice(0,6);
  const schema={
    '@context':'https://schema.org',
    '@type':'Article',
    headline:title,
    description:desc,
    datePublished:'2026-08-10T12:00:00+02:00',
    mainEntityOfPage:{'@type':'WebPage','@id':SITE+route},
    publisher:{'@type':'Organization',name:'GNK ASG d.o.o.',url:SITE+'/',logo:{'@type':'ImageObject',url:SITE+'/assets/logo-gnk-asg-canonical.svg'}},
    image:{'@type':'ImageObject',url:coverUrl,width:1200,height:630,caption:title},
    articleSection:section,
    keywords:t.kw,
    inLanguage:isHr?'hr-HR':'en-US',
  };
  const bodyHtml=mdToHtml(bodyPre);
  const figures=chartUrls.map((u,i)=>`<figure class="world-chart"><img src="${u}" alt="${attr((isHr?'Grafički prikaz uz analizu: ':'Data chart supporting the analysis: ')+title)}" title="${attr(title)} — ${i+1}" loading="${i?'lazy':'eager'}" decoding="async"><figcaption>${esc((isHr?'Grafički prilog ':'Data chart ')+(i+1)+' · GNK ASG')}</figcaption></figure>`);
  const related=isHr
    ?'<h2>Povezane teme</h2><ul><li><a href="/gnk-aktual/">AKTUAL MEDIA</a></li><li><a href="/tehnologija/">Tehnologija</a></li><li><a href="/financije/">Financije</a></li><li><a href="/objave/">Sve objave</a></li></ul>'
    :'<h2>Related topics</h2><ul><li><a href="/en/gnk-aktual/">AKTUAL MEDIA</a></li><li><a href="/en/technology/">Technology</a></li><li><a href="/en/finance/">Finance</a></li><li><a href="/en/publications/">All publications</a></li></ul>';
  const coverFigure=`<figure class="editorial-cover-figure"><img class="article-cover" src="${attr(cover.image)}" alt="${attr(cover.alt)}" title="${attr(title)} — ${isHr?'urednička ilustracija':'editorial illustration'}" width="1200" height="630" loading="eager" decoding="async" fetchpriority="high"></figure>`;
  const html=`<!doctype html><html lang="${isHr?'hr':'en'}" class="gnk-unified-shell"><head><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-TCCJJVP4P0"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TCCJJVP4P0');</script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)} | GNK ASG</title><meta name="description" content="${attr(desc)}"><meta name="keywords" content="${attr(t.kw.join(', '))}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${SITE+route}"><link rel="alternate" hreflang="${isHr?'en':'hr'}" href="${SITE+altRoute}"><meta property="og:type" content="article"><meta property="og:locale" content="${isHr?'hr_HR':'en_US'}"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${SITE+route}"><meta property="og:image" content="${coverUrl}"><meta property="og:image:secure_url" content="${coverUrl}"><meta property="og:image:type" content="image/webp"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="article:published_time" content="2026-08-10T12:00:00+02:00"><meta property="article:section" content="${attr(section)}">${tags.map(x=>`<meta property="article:tag" content="${attr(x)}">`).join('')}<meta property="og:image:alt" content="${attr(cover.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(title)}"><meta name="twitter:description" content="${attr(desc)}"><meta name="twitter:image" content="${coverUrl}"><meta name="twitter:image:alt" content="${attr(cover.alt)}"><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="stylesheet" href="/assets/style.css?v=20260723-dark-gold-theme-v1"><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260723-hashtags-v1"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260723-header-transparent-v3"><style>.world-chart{margin:28px 0}.world-chart img{width:100%;height:auto;border-radius:4px;background:#fff}</style></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="${isHr?route:altRoute}"${isHr?' aria-current="page"':''}>HR</a><a href="${isHr?altRoute:route}"${!isHr?' aria-current="page"':''}>EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">${isHr?'IZBORNIK':'MENU'}</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="editorial-wrap article"><img class="editorial-logo" src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="64" height="66"><header class="article-header"><p class="eyebrow">${isHr?'Analiza':'Analysis'} · ${esc(section)} · ${isHr?'10. kolovoza 2026.':'10 August 2026'}</p><h1>${esc(title)}</h1><p class="lead">${esc(desc)}</p></header>${coverFigure}${hasInline?'':figures[0]}<article class="article-body">${bodyHtml}${hasInline?'':figures[1]}${related}<p class="article-hashtags">${tags.map(x=>'#'+x).join(' ')}</p></article><a class="article-back" href="${isHr?'/objave/':'/en/publications/'}">${isHr?'← Povratak na objave':'← Back to publications'}</a></main><script src="/assets/app.js?v=20260728-remove-tech-radar-more-sources-v1" defer></script></body></html>`;
  const item={slug,type:'objava',collection:isHr?'Objave':'Publications',path:route,url:SITE+route,title,description:desc,keywords:t.kw,hashtags:tags,image:coverUrl,imageAlt:cover.alt,publishedAt:'2026-08-10T12:00:00+02:00',inPlan:true,seoComplete:true,language:isHr?'hr':'en'};
  return {html,item};
}

unpack();
for(const f of readdirSync(SRC_DIR).filter(x=>x.endsWith('.webp'))){const dest=resolve('apps/portal/assets/editorial/world-topics',f);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readFileSync(resolve(SRC_DIR,f)));}
const items=[];
for(const t of topics){for(const lang of ['hr','en']){const r=pageFor(t,lang);const p=lang==='hr'?resolve('apps/portal/objave',t.hrSlug,'index.html'):resolve('apps/portal/en/publications',t.enSlug,'index.html');write(p,r.html+'\n');items.push(r.item);}}
const worldRegistry={version:'GNK_ASG_WORLD_TOPICS_20260810',generatedAt:new Date().toISOString(),items};write(resolve('apps/portal/data/world-topics-registry.json'),JSON.stringify(worldRegistry,null,2)+'\n');
const promotions={version:'GNK_ASG_AKTUAL_WORLD_TOPICS_V1',timezone:'Europe/Zagreb',schedule:topics.map((t,i)=>{const hr=items.find(x=>x.language==='hr'&&x.slug===t.hrSlug),en=items.find(x=>x.language==='en'&&x.slug===t.enSlug);return {date:`2026-08-${String(10+i).padStart(2,'0')}`,id:`gnk-world-topic-${String(t.n).padStart(2,'0')}`,title_hr:hr.title,title_en:en.title,summary_hr:hr.description,summary_en:en.description,url_hr:hr.url,url_en:en.url,image:hr.image,imageAlt_hr:hr.imageAlt,imageAlt_en:en.imageAlt,source:'GNK ASG',group:'international',category:'analysis'}})};write(resolve('apps/portal/data/aktual-world-topics-schedule.json'),JSON.stringify(promotions,null,2)+'\n');

const registryPath=resolve('apps/portal/data/editorial-registry.json');const registry=readJson(registryPath,{version:'GNK_ASG_EDITORIAL_REGISTRY_V1',site:SITE,items:[]});const map=new Map((registry.items||[]).filter(x=>x?.path).map(x=>[x.path,x]));for(const item of items)map.set(item.path,item);registry.items=[...map.values()].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));registry.total=registry.items.length;registry.generatedAt=new Date().toISOString();registry.inPlan=registry.items.filter(x=>x.inPlan).length;registry.outsidePlan=registry.items.filter(x=>!x.inPlan).length;registry.seoIncomplete=registry.items.filter(x=>!x.seoComplete).length;registry.byType=registry.items.reduce((a,x)=>(a[x.type||'other']=(a[x.type||'other']||0)+1,a),{});registry.note='Sadrzi SVE objavljene tekstove, ukljucujuci World Topics 2026-08-10. Prijenos na blog radi s ovog popisa.';write(registryPath,JSON.stringify(registry,null,2)+'\n');

function injectCollection(file,lang){if(!existsSync(file))return;let html=readFileSync(file,'utf8');const start='<!-- WORLD_TOPICS_20260810_START -->',end='<!-- WORLD_TOPICS_20260810_END -->';const list=items.filter(x=>x.language===lang);const heading=lang==='hr'?'Svjetske teme — 10 velikih analiza':'World Topics — 10 major analyses';const intro=lang==='hr'?'Analize globalnih trendova: geopolitika, kapital, tehnologija, resursi i sistemski rizici.':'Analysis of global trends: geopolitics, capital, technology, resources and systemic risk.';const cards=list.map(x=>`<article style="border:1px solid rgba(255,255,255,.15);padding:16px;border-radius:6px"><a href="${x.path}" style="text-decoration:none"><img src="${x.image}" alt="${attr(x.imageAlt||x.title)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:4px"><h3>${esc(x.title)}</h3></a><p>${esc(x.description)}</p></article>`).join('');const block=`${start}<section id="world-topics-20260810" style="max-width:1180px;margin:32px auto;padding:24px"><h2>${heading}</h2><p>${intro}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">${cards}</div></section>${end}`;const re=new RegExp(start+'[\\s\\S]*?'+end);html=re.test(html)?html.replace(re,block):html.replace('</main>',block+'</main>');write(file,html)}
injectCollection(resolve('apps/portal/objave/index.html'),'hr');injectCollection(resolve('apps/portal/en/publications/index.html'),'en');
const smPath=resolve('apps/portal/editorial-sitemap.xml');if(existsSync(smPath)){let xml=readFileSync(smPath,'utf8');for(const item of items){if(xml.includes(`<loc>${item.url}</loc>`))continue;xml=xml.replace('</urlset>',`  <url><loc>${esc(item.url)}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`)}write(smPath,xml)}
const imgRows=[];for(const item of items){const t=topics.find(x=>(item.language==='hr'?x.hrSlug:x.enSlug)===item.slug);const imgs=[item.image,...t.charts.map(n=>`${SITE}/assets/editorial/world-topics/${n}`)];imgRows.push(`<url><loc>${esc(item.url)}</loc>${imgs.map(u=>`<image:image><image:loc>${esc(u)}</image:loc><image:title>${esc(item.title)}</image:title><image:caption>GNK ASG original editorial visual — ${esc(item.title)}</image:caption></image:image>`).join('')}</url>`)}write(resolve('apps/portal/world-topics-image-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${imgRows.join('\n')}\n</urlset>\n`);
console.log(JSON.stringify({ok:true,pages:items.length,charts:20,registryTotal:registry.total,promotions:promotions.schedule.length},null,2));
