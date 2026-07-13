import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const r=p=>fs.readFileSync(p,'utf8');
const ok=(p,tokens)=>{const source=r(p);for(const token of tokens)if(!source.includes(token))throw new Error(`${p} missing ${token}`)};
const absent=(p,tokens)=>{const source=r(p);for(const token of tokens)if(source.includes(token))throw new Error(`${p} contains forbidden ${token}`)};

execFileSync(process.execPath,['scripts/audit-public-portal-v1.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/audit-worker-route-ownership.mjs'],{stdio:'inherit'});

const files=[
  'apps/portal/index.html','apps/portal/en/index.html','apps/portal/newsroom/index.html','apps/portal/en/newsroom/index.html',
  'apps/portal/objave/index.html','apps/portal/analize/index.html','apps/portal/komentari/index.html','apps/portal/trzista/index.html',
  'apps/portal/en/markets/index.html','apps/portal/the-code/index.html','apps/portal/assets/public-compact-menu-v1.js',
  'apps/portal/assets/release-completion-v1.js','apps/portal/assets/index-data-resilience-v1.js',
  'apps/portal/assets/index-editorial-order-v1.js','apps/portal/assets/newsroom-live-v1.js',
  'apps/portal/assets/public-market-live-v1.js','apps/portal/assets/market-centre-data.js',
  'apps/portal/assets/the-code-experience-loop-v1.html','workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js',
  'workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js',
  'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',
  'workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml'
];
for(const file of files)if(!fs.existsSync(file)||!fs.statSync(file).size)throw new Error(`Missing ${file}`);

const news=JSON.parse(r('apps/portal/data/news.json'));
if(!Array.isArray(news)||news.length<100||news.some(item=>!item||typeof item!=='object'||!String(item.title||'').trim()))throw new Error('News fallback invalid or below 100');
const market=JSON.parse(r('apps/portal/data/market.json'));
if(market.status!=='ok'||!Array.isArray(market.coins)||market.coins.length<2)throw new Error('Market fallback invalid');

ok('apps/portal/assets/public-compact-menu-v1.js',['/newsroom/','/objave/','/analize/','/komentari/','/trzista/','/the-code/','menus.slice(1)','strips.slice(1)']);
ok('apps/portal/assets/release-completion-v1.js',['GNK_RELEASE_COMPLETION_V7','data-runtime-owner="index-editorial-order"','data-runtime-owner="index-data-resilience"','release-completion-scaffold']);
absent('apps/portal/assets/release-completion-v1.js',['renderNews','renderMarkets','/api/public-news?limit=8','www.ecb.europa.eu','api.worldbank.org']);
ok('apps/portal/assets/index-editorial-order-v1.js',['__GNK_INDEX_EDITORIAL_ORDER_V3__','Poslovne vijesti','Analize','Komentari','/api/public-news','/data/news.json','Promise.allSettled','AbortController']);
ok('apps/portal/assets/index-data-resilience-v1.js',['__GNK_INDEX_DATA_RESILIENCE_V2__','/data/market.json','marketFallback','AbortController']);
absent('apps/portal/assets/index-data-resilience-v1.js',['gnk-editorial-grid','newsFallback','/data/news.json']);
ok('apps/portal/assets/newsroom-live-v1.js',['limit=100','setInterval(load,300000)','__published','langAllowed','itemHref']);
ok('apps/portal/assets/public-market-live-v1.js',['fetchWithTimeout','Promise.allSettled','PARTIAL','ECB_XML']);
ok('apps/portal/assets/market-centre-data.js',["fetch(`/data/${encodeURIComponent(name)}",'setInterval(render,60000)','__GNK_MARKET_CENTRE_DATA_V2__','safeDate']);
ok('apps/portal/assets/the-code-experience-loop-v1.html',['show(scenes.length-1)','PONOVI PROJEKCIJU',"replayBtn.addEventListener('click',replay)"]);
ok('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js',['STATIC_HTML_ROUTES','/newsroom/index.html','/analize/index.html','/trzista/index.html','/the-code/index.html','x-gnk-explicit-html-route']);
ok('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js',['GNK_ASG_NEWS_AUTO_PUBLICATION_V8','scheduledEnabled','runScheduledNewsPublication','scheduled_publication_disabled','duplicate_item','invalid_source_url','keyByFingerprint']);
ok('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',['safeEmail','safeWeb','safeLogo','logo(logoSrc)']);
ok('workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js',['EMAIL_LOGO_CID','loadEmailLogo']);
ok('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',['multipart/related','loadEmailLogo']);
ok('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml',['main = "src/index-unified-auth-v19.js"','MAIL_AUTO_REPLY_LIVE = "true"','MAIL_STUDIO_LIVE = "true"','crons = ["*/15 * * * *"]','NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE = "false"']);
absent('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml',['binding = "GNK_ASG_KV"','routes =','route =','keep_vars = true','NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE = "true"']);

const publicAudit=JSON.parse(r('artifacts/public-portal-audit.json'));
const routeAudit=JSON.parse(r('artifacts/worker-route-ownership.json'));
if(publicAudit.summary.errors!==0)throw new Error(`Public audit has ${publicAudit.summary.errors} errors`);
if(!routeAudit.summary.directOperatorRouteLess)throw new Error('Direct operator route-less guard changed unexpectedly');

console.log(JSON.stringify({
  ok:true,
  news:news.length,
  marketCoins:market.coins.length,
  worker:'v19',
  routes:'explicit-assets-but-route-less-worker',
  indexOwners:{scaffold:'release-completion-v1.js',editorial:'index-editorial-order-v1.js',marketFallback:'index-data-resilience-v1.js'},
  menu:'single',
  mail:'cid-safe-links',
  scheduler:'strict-opt-in-and-config-locked',
  publicAudit:publicAudit.summary,
  routeAudit:routeAudit.summary
},null,2));
