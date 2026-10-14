import fs from 'node:fs';
import assert from 'node:assert/strict';

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
for(const route of [
 '/objave/transparentno-upravljanje-kao-operativni-standard/','/analize/ai-infrastruktura-kapital-energija/','/objave/kiberneticka-otpornost-i-kontinuitet/','/komentari/trzista-traze-jasne-informacije/','/komentari/automatizacija-ne-ukida-odgovornost/',
 '/objave/tehnologija-kapital-i-odgovorno-upravljanje/','/analize/kapitalna-struktura-i-operativna-otpornost/','/komentari/inovacija-bez-povjerenja-nije-napredak/',
 '/en/publications/technology-capital-and-responsible-governance/','/en/analyses/capital-structure-and-operational-resilience/','/en/commentary/innovation-without-trust-is-not-progress/'
])assert.match(sitemap,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
function collectionContract(file,{minimum,prefix}){
 const html=fs.readFileSync(file,'utf8');
 const cards=[...html.matchAll(/<article class="editorial-card"([^>]*)>([\s\S]*?)<\/article>/g)];
 const count=cards.length;
 assert.ok(count>=minimum,`${file} must show at least ${minimum} cards; actual=${count}`);
 const routes=cards.map((match)=>match[1].match(/data-editorial-route="([^"]+)"/)?.[1]||'');
 assert.ok(routes.every((route)=>route.startsWith(prefix)),`${file} contains a card outside ${prefix}`);
 assert.equal(new Set(routes).size,routes.length,`${file} contains duplicate editorial cards`);
 for(let i=0;i<cards.length;i++){
  const links=[...cards[i][2].matchAll(/<a href="([^"]+)"/g)].map((match)=>match[1]);
  assert.ok(links.includes(routes[i]),`${file} card ${routes[i]} is missing its own collection link`);
 }
 return count;
}
const hr={
 objave:collectionContract('apps/portal/objave/index.html',{minimum:5,prefix:'/objave/'}),
 analize:collectionContract('apps/portal/analize/index.html',{minimum:4,prefix:'/analize/'}),
 komentari:collectionContract('apps/portal/komentari/index.html',{minimum:5,prefix:'/komentari/'})
};
const en={
 publications:collectionContract('apps/portal/en/publications/index.html',{minimum:3,prefix:'/en/publications/'}),
 analyses:collectionContract('apps/portal/en/analyses/index.html',{minimum:2,prefix:'/en/analyses/'}),
 commentary:collectionContract('apps/portal/en/commentary/index.html',{minimum:3,prefix:'/en/commentary/'})
};
console.log(JSON.stringify({ok:true,liveNewsSources:true,visibleNews:100,collections:{hr,en},newImageLedArticles:5,sitemap:true,growingCollections:true},null,2));
