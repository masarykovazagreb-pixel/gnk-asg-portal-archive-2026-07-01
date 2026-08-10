import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve('.');
const PORTAL = resolve('apps/portal');
const META = resolve('content/world-topics/world-topics-meta.json');
const PAGE_CHUNKS = [1,2,3,4,5].map(n => resolve(`content/world-topics/world-topics-pages-${String(n).padStart(2,'0')}.json`));
const CHUNKS = [1,2,3,4].map(n => resolve(`content/world-topics/world-topics-charts-${String(n).padStart(2,'0')}.json`));
const readJson=(p,f)=>{try{return JSON.parse(readFileSync(p,'utf8'))}catch{return f}};
const write=(p,s)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s)};
const esc=(s='')=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const meta = readJson(META,null);
const pages = PAGE_CHUNKS.flatMap(p => readJson(p,{pages:[]}).pages||[]);
const release = {...meta,pages};
if (!release || !Array.isArray(release.pages) || !release.registry?.items?.length) throw new Error('Invalid world-topics release source');

for (const page of release.pages) {
  const p=resolve(page.path);
  write(p, page.content.endsWith('\n') ? page.content : page.content+'\n');
}

const chartNames=[];
for (const chunkPath of CHUNKS) {
  const chunk=readJson(chunkPath,{charts:[]});
  for (const chart of chunk.charts||[]) {
    const p=resolve('apps/portal/assets/editorial/world-topics', chart.filename);
    mkdirSync(dirname(p),{recursive:true});
    writeFileSync(p, Buffer.from(chart.base64,'base64'));
    chartNames.push(chart.filename);
  }
}
if (chartNames.length !== 20) throw new Error(`Expected 20 charts, wrote ${chartNames.length}`);

write(resolve('apps/portal/data/world-topics-registry.json'), JSON.stringify(release.registry,null,2)+'\n');
write(resolve('apps/portal/data/aktual-world-topics-schedule.json'), JSON.stringify(release.promotions,null,2)+'\n');

const registryPath=resolve('apps/portal/data/editorial-registry.json');
const registry=readJson(registryPath,{version:'GNK_ASG_EDITORIAL_REGISTRY_V1',site:'https://gnk-asg.hr',items:[]});
const map=new Map((registry.items||[]).filter(x=>x?.path).map(x=>[x.path,x]));
for (const item of release.registry.items) map.set(item.path,item);
registry.items=[...map.values()].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
registry.total=registry.items.length;
registry.generatedAt=new Date().toISOString();
registry.inPlan=registry.items.filter(x=>x.inPlan).length;
registry.outsidePlan=registry.items.filter(x=>!x.inPlan).length;
registry.seoIncomplete=registry.items.filter(x=>!x.seoComplete).length;
registry.byType=registry.items.reduce((a,x)=>(a[x.type||'other']=(a[x.type||'other']||0)+1,a),{});
registry.note='Sadrzi SVE objavljene tekstove, ukljucujuci World Topics 2026-08-10. Prijenos na blog radi s ovog popisa.';
write(registryPath,JSON.stringify(registry,null,2)+'\n');

function injectCollection(file,lang){
  if(!existsSync(file)) return;
  let html=readFileSync(file,'utf8');
  const start='<!-- WORLD_TOPICS_20260810_START -->', end='<!-- WORLD_TOPICS_20260810_END -->';
  const items=release.registry.items.filter(x=>x.language===lang);
  const heading=lang==='hr'?'Svjetske teme — 10 velikih analiza':'World Topics — 10 major analyses';
  const intro=lang==='hr'?'Nova autorska serija Nermina Sefića: geopolitika, kapital, tehnologija, resursi i sistemski rizici.':'A new author series by Nermin Sefić covering geopolitics, capital, technology, resources and systemic risk.';
  const cards=items.map(x=>`<article style="border:1px solid rgba(255,255,255,.15);padding:16px;border-radius:6px"><a href="${x.path}" style="text-decoration:none"><img src="${x.image}" alt="Nermin Sefić — ${esc(x.title)}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:4px"><h3>${esc(x.title)}</h3></a><p>${esc(x.description)}</p></article>`).join('');
  const block=`${start}<section id="world-topics-20260810" style="max-width:1180px;margin:32px auto;padding:24px"><h2>${heading}</h2><p>${intro}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">${cards}</div></section>${end}`;
  const re=new RegExp(start+'[\\s\\S]*?'+end);
  if(re.test(html)) html=html.replace(re,block);
  else html=html.replace('</main>',block+'</main>');
  write(file,html);
}
injectCollection(resolve('apps/portal/objave/index.html'),'hr');
injectCollection(resolve('apps/portal/en/publications/index.html'),'en');

const smPath=resolve('apps/portal/editorial-sitemap.xml');
if(existsSync(smPath)){
  let xml=readFileSync(smPath,'utf8');
  for(const item of release.registry.items){
    if(xml.includes(`<loc>${item.url}</loc>`)) continue;
    const node=`  <url><loc>${esc(item.url)}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
    xml=xml.replace('</urlset>',node+'</urlset>');
  }
  write(smPath,xml);
}
const imgRows=[];
for(const item of release.registry.items){
  const idx = release.registry.items.filter(x=>x.language===item.language).findIndex(x=>x.path===item.path);
  const topic=Math.max(1,idx+1);
  const prefixes={1:['chart01_ai_governance.png','chart01b_ai_penalties.png'],2:['chart02_minerals.png','chart02b_cobalt_children.png'],3:['chart03_debt.png','chart03b_china_lending.png'],4:['chart04_demographics.png','chart04b_korea_fertility.png'],5:['chart05_supplychain.png','chart05b_vietnam_paradox.png'],6:['chart06_water.png','chart06b_israel_water.png'],7:['chart07_antibiotics.png','chart07b_amr_age.png'],8:['chart08_space.png','chart08b_starlink_share.png'],9:['chart09_food.png','chart09b_deere_results.png'],10:['chart10_cyber.png','chart10b_solarwinds.png']};
  const imgs=[item.image,...(prefixes[topic]||[]).map(n=>`https://gnk-asg.hr/assets/editorial/world-topics/${n}`)];
  imgRows.push(`<url><loc>${esc(item.url)}</loc>${imgs.map(u=>`<image:image><image:loc>${esc(u)}</image:loc><image:title>${esc(item.title)}</image:title><image:caption>Nermin Sefić / GNK ASG — ${esc(item.title)}</image:caption></image:image>`).join('')}</url>`);
}
write(resolve('apps/portal/world-topics-image-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${imgRows.join('\n')}\n</urlset>\n`);

console.log(JSON.stringify({ok:true,pages:release.pages.length,charts:chartNames.length,registryTotal:registry.total,promotions:release.promotions.schedule?.length||0},null,2));
