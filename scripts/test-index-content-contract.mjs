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
for(const marker of ['Source','Izvor','/api/public-news?limit=100','/data/news.json','gnk-news-100','Objave, vijesti, analize i komentari'])assert.match(editorial,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(newsroom,/__GNK_NEWSROOM_LIVE_V7__/);
assert.match(newsroom,/limit=100/);
for(const route of [
 '/objave/transparentno-upravljanje-kao-operativni-standard/','/analize/ai-infrastruktura-kapital-energija/','/objave/kiberneticka-otpornost-i-kontinuitet/','/komentari/trzista-traze-jasne-informacije/','/komentari/automatizacija-ne-ukida-odgovornost/',
 '/objave/tehnologija-kapital-i-odgovorno-upravljanje/','/analize/kapitalna-struktura-i-operativna-otpornost/','/komentari/inovacija-bez-povjerenja-nije-napredak/',
 '/en/publications/technology-capital-and-responsible-governance/','/en/analyses/capital-structure-and-operational-resilience/','/en/commentary/innovation-without-trust-is-not-progress/'
])assert.match(sitemap,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
const counts={objave:5,analize:4,komentari:5};
for(const[collection,expected]of Object.entries(counts)){const html=fs.readFileSync(`apps/portal/${collection}/index.html`,'utf8');assert.equal((html.match(/class="editorial-card"/g)||[]).length,expected,`${collection} must show ${expected} cards`)}
for(const collection of ['publications','analyses','commentary']){const html=fs.readFileSync(`apps/portal/en/${collection}/index.html`,'utf8');assert.equal((html.match(/class="editorial-card"/g)||[]).length,3,`${collection} must show three cards`)}
console.log(JSON.stringify({ok:true,liveNewsSources:true,visibleNews:100,collections:{hr:counts,en:{publications:3,analyses:3,commentary:3}},newImageLedArticles:5,sitemap:true},null,2));
