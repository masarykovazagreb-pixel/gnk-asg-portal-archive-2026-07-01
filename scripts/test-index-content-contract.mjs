import fs from 'node:fs';
import assert from 'node:assert/strict';
import { publishedItems } from './lib/publication-gate-v2.mjs';

const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v6.js','utf8');
const newsroom=fs.readFileSync('apps/portal/assets/newsroom-live-v1.js','utf8');
const sitemap=fs.readFileSync('apps/portal/editorial-sitemap.xml','utf8');
const legacyFiles=[
 'apps/portal/objave/index.html','apps/portal/analize/index.html','apps/portal/komentari/index.html',
 'apps/portal/en/publications/index.html','apps/portal/en/analyses/index.html','apps/portal/en/commentary/index.html',
 'apps/portal/objave/tehnologija-kapital-i-odgovorno-upravljanje/index.html',
 'apps/portal/analize/kapitalna-struktura-i-operativna-otpornost/index.html',
 'apps/portal/komentari/inovacija-bez-povjerenja-nije-napredak/index.html',
 'apps/portal/en/publications/technology-capital-and-responsible-governance/index.html',
 'apps/portal/en/analyses/capital-structure-and-operational-resilience/index.html',
 'apps/portal/en/commentary/innovation-without-trust-is-not-progress/index.html'
];
const newFiles=[
 'apps/portal/objave/transparentno-upravljanje-kao-operativni-standard/index.html',
 'apps/portal/analize/ai-infrastruktura-kapital-energija/index.html',
 'apps/portal/objave/kiberneticka-otpornost-i-kontinuitet/index.html',
 'apps/portal/komentari/trzista-traze-jasne-informacije/index.html',
 'apps/portal/komentari/automatizacija-ne-ukida-odgovornost/index.html'
];
for(const file of [...legacyFiles,...newFiles]){assert.ok(fs.existsSync(file),`missing ${file}`);const html=fs.readFileSync(file,'utf8');assert.match(html,/logo-gnk-asg-canonical\.svg/);assert.match(html,/editorial-content-v2\.css|contact-form-v2\.js|index-editorial-order-v1\.js/)}
for(const file of newFiles){const html=fs.readFileSync(file,'utf8');assert.match(html,/class="article-cover"/);assert.match(html,/property="og:image"/)}
for(const marker of ['Source','Izvor','/api/public-news?limit=100','/api/public-news-feed','gnk-news-100','Objave, vijesti, analize i komentari'])assert.match(editorial,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(newsroom,/__GNK_NEWSROOM_LIVE_V7__/);
assert.match(newsroom,/limit=100/);

const registry=JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry.json','utf8'));
const supplement=fs.existsSync('apps/portal/data/editorial-registry-supplement.json')?JSON.parse(fs.readFileSync('apps/portal/data/editorial-registry-supplement.json','utf8')):{items:[]};
const merged=[...(registry.items||[])];
const known=new Set(merged.map(item=>item?.path).filter(Boolean));
for(const item of supplement.items||[]){if(item?.path&&!known.has(item.path)){merged.push(item);known.add(item.path)}}
const published=new Set(publishedItems({...registry,items:merged},new Date(process.env.PUBLICATION_NOW||Date.now())).map(item=>item.path));
const contractedRoutes=[
 '/objave/transparentno-upravljanje-kao-operativni-standard/','/analize/ai-infrastruktura-kapital-energija/','/objave/kiberneticka-otpornost-i-kontinuitet/','/komentari/trzista-traze-jasne-informacije/','/komentari/automatizacija-ne-ukida-odgovornost/',
 '/objave/tehnologija-kapital-i-odgovorno-upravljanje/','/analize/kapitalna-struktura-i-operativna-otpornost/','/komentari/inovacija-bez-povjerenja-nije-napredak/',
 '/en/publications/technology-capital-and-responsible-governance/','/en/analyses/capital-structure-and-operational-resilience/','/en/commentary/innovation-without-trust-is-not-progress/'
];
for(const route of contractedRoutes){
 const pattern=new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 if(published.has(route)) assert.match(sitemap,pattern,`published route missing from sitemap: ${route}`);
 else assert.doesNotMatch(sitemap,pattern,`scheduled/held route leaked into sitemap: ${route}`);
}
function collectionContract(file,{minimum,prefix}){
 const html=fs.readFileSync(file,'utf8'),count=(html.match(/class="editorial-card"/g)||[]).length;
 assert.ok(count>=minimum,`${file} must show at least ${minimum} cards; actual=${count}`);
 const links=[...html.matchAll(new RegExp(`<a href="(${prefix}[^"#?]+/)"`,'g'))].map(match=>match[1]);
 assert.equal(new Set(links).size,links.length,`${file} contains duplicate collection links`);
 return count;
}
const hr={
 objave:collectionContract('apps/portal/objave/index.html',{minimum:5,prefix:'/objave/'}),
 analize:collectionContract('apps/portal/analize/index.html',{minimum:4,prefix:'/analize/'}),
 komentari:collectionContract('apps/portal/komentari/index.html',{minimum:5,prefix:'/komentari/'})
};
const en={
 publications:collectionContract('apps/portal/en/publications/index.html',{minimum:3,prefix:'/en/publications/'}),
 analyses:collectionContract('apps/portal/en/analyses/index.html',{minimum:3,prefix:'/en/analyses/'}),
 commentary:collectionContract('apps/portal/en/commentary/index.html',{minimum:3,prefix:'/en/commentary/'})
};
console.log(JSON.stringify({ok:true,liveNewsSources:true,visibleNews:100,collections:{hr,en},newImageLedArticles:5,sitemap:true,growingCollections:true,publicationAwareSitemapContract:true},null,2));
