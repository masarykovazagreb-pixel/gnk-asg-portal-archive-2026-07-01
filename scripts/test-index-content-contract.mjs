import fs from 'node:fs';
import assert from 'node:assert/strict';

const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v1.js','utf8');
const sitemap=fs.readFileSync('apps/portal/editorial-sitemap.xml','utf8');
const files=[
 'apps/portal/objave/index.html','apps/portal/analize/index.html','apps/portal/komentari/index.html',
 'apps/portal/en/publications/index.html','apps/portal/en/analyses/index.html','apps/portal/en/commentary/index.html',
 'apps/portal/objave/tehnologija-kapital-i-odgovorno-upravljanje/index.html',
 'apps/portal/analize/kapitalna-struktura-i-operativna-otpornost/index.html',
 'apps/portal/komentari/inovacija-bez-povjerenja-nije-napredak/index.html',
 'apps/portal/en/publications/technology-capital-and-responsible-governance/index.html',
 'apps/portal/en/analyses/capital-structure-and-operational-resilience/index.html',
 'apps/portal/en/commentary/innovation-without-trust-is-not-progress/index.html'
];
for(const file of files){assert.ok(fs.existsSync(file),`missing ${file}`);const html=fs.readFileSync(file,'utf8');assert.match(html,/logo-gnk-asg-canonical\.svg/);assert.match(html,/editorial-content-v2\.css|contact-form-v2\.js|index-editorial-order-v1\.js/)}
for(const marker of ['sourceFor','dateFor','gnk-source','Izvor','Source','/api/public-news?limit=18','/data/news.json'])assert.match(editorial,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for(const route of [
 '/objave/tehnologija-kapital-i-odgovorno-upravljanje/','/analize/kapitalna-struktura-i-operativna-otpornost/','/komentari/inovacija-bez-povjerenja-nije-napredak/',
 '/en/publications/technology-capital-and-responsible-governance/','/en/analyses/capital-structure-and-operational-resilience/','/en/commentary/innovation-without-trust-is-not-progress/'
])assert.match(sitemap,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for(const collection of ['objave','analize','komentari']){const html=fs.readFileSync(`apps/portal/${collection}/index.html`,'utf8');assert.equal((html.match(/class="editorial-card"/g)||[]).length,3,`${collection} must show three cards`)}
for(const collection of ['publications','analyses','commentary']){const html=fs.readFileSync(`apps/portal/en/${collection}/index.html`,'utf8');assert.equal((html.match(/class="editorial-card"/g)||[]).length,3,`${collection} must show three cards`)}
console.log(JSON.stringify({ok:true,liveNewsSources:true,collections:{hr:3,en:3},cardsPerCollection:3,newArticles:6,sitemap:true},null,2));