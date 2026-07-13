import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const requireTokens=(file,tokens)=>{const source=read(file);for(const token of tokens){if(!source.includes(token))throw new Error(`${file} missing required token: ${token}`)}};
const forbidTokens=(file,tokens)=>{const source=read(file);for(const token of tokens){if(source.includes(token))throw new Error(`${file} contains forbidden token: ${token}`)}};
const run=file=>{console.log(`PREDEPLOY ${file}`);execFileSync(process.execPath,[file],{stdio:'inherit'})};

const requiredFiles=[
  'apps/portal/index.html','apps/portal/en/index.html','apps/portal/newsroom/index.html','apps/portal/en/newsroom/index.html',
  'apps/portal/objave/index.html','apps/portal/analize/index.html','apps/portal/komentari/index.html','apps/portal/trzista/index.html',
  'apps/portal/en/markets/index.html','apps/portal/the-code/index.html','apps/portal/contact/index.html','apps/portal/media-application/index.html',
  'apps/portal/assets/public-compact-menu-v1.js','apps/portal/assets/public-design-tokens-v1.css',
  'apps/portal/assets/release-completion-v1.js','apps/portal/assets/index-data-resilience-v1.js','apps/portal/assets/index-editorial-order-v1.js',
  'apps/portal/assets/newsroom-live-v1.js','apps/portal/assets/public-market-live-v1.js','apps/portal/assets/market-centre-data.js',
  'apps/portal/assets/logo-gnk-asg-gold.svg','apps/portal/assets/logo-gnk-dinamo-gold.svg',
  'workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js','workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-mime-safe-v2.js','workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',
  'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-all-v1.js','workers/gnk-asg-direct-operator/src/mail-autoreply-profile-factory-v1.js',
  'workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml'
];
for(const file of requiredFiles){if(!fs.existsSync(file)||!fs.statSync(file).size)throw new Error(`Missing required file: ${file}`)}

for(const test of [
  'scripts/test-deploy-approval-guardrails.mjs',
  'scripts/test-index-runtime-ownership.mjs',
  'scripts/test-email-signature-contract.mjs',
  'scripts/test-mail-transport-guardrails.mjs',
  'scripts/test-email-mime-guardrails.mjs',
  'scripts/test-autoreply-guardrails.mjs',
  'scripts/test-autoreply-all-addresses.mjs',
  'scripts/test-news-queue-guardrails.mjs',
  'scripts/audit-public-portal-v1.mjs',
  'scripts/audit-worker-route-ownership.mjs'
])run(test);

const news=JSON.parse(read('apps/portal/data/news.json'));
if(!Array.isArray(news)||news.length<100||news.some(item=>!item||typeof item!=='object'||!String(item.title||'').trim()))throw new Error('News fallback invalid or below 100 items');
const market=JSON.parse(read('apps/portal/data/market.json'));
if(market.status!=='ok'||!Array.isArray(market.coins)||market.coins.length<2)throw new Error('Market fallback invalid');

requireTokens('apps/portal/assets/public-compact-menu-v1.js',['/newsroom/','/objave/','/analize/','/komentari/','/trzista/','/the-code/','menus.slice(1)','strips.slice(1)']);
requireTokens('apps/portal/assets/release-completion-v1.js',['GNK_RELEASE_COMPLETION_V7','data-runtime-owner="index-editorial-order"','data-runtime-owner="index-data-resilience"','release-completion-scaffold']);
forbidTokens('apps/portal/assets/release-completion-v1.js',['renderNews','renderMarkets','/api/public-news?limit=8','www.ecb.europa.eu','api.worldbank.org']);
requireTokens('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js',['STATIC_HTML_ROUTES','x-gnk-explicit-html-route','mail-identity-autoreply-all-v1.js','handleIncomingEmail(message,env,ctx,app)']);
requireTokens('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',['GNK_ASG_EMAIL_BRAND_SIGNATURE_V9','logo-gnk-asg-gold.svg','gold corporate mark']);
requireTokens('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js',['GNK_ASG_NEWS_AUTO_PUBLICATION_V8','scheduled_publication_disabled','canonicalSourceUrl']);
requireTokens('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml',[
  'main = "src/index-unified-auth-v19.js"','MAIL_AUTO_REPLY_LIVE = "true"','MAIL_STUDIO_LIVE = "true"',
  'MAIL_PROFILE_TEST_LIVE = "false"','MAIL_PROFILE_TEST_RECIPIENTS = "sefic20@gmx.com"',
  'MEDIA_OUTREACH_TEST_LIVE = "false"','MEDIA_OUTREACH_TEST_RECIPIENTS = "sefic20@gmx.com"',
  'NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE = "false"','crons = ["*/15 * * * *"]'
]);
forbidTokens('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml',[
  'binding = "GNK_ASG_KV"','routes =','route =','keep_vars = true','NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE = "true"',
  'MAIL_PROFILE_TEST_LIVE = "true"','MEDIA_OUTREACH_TEST_LIVE = "true"','MEDIA_OUTREACH_LIVE = "true"'
]);

const publicAudit=JSON.parse(read('artifacts/public-portal-audit.json'));
const routeAudit=JSON.parse(read('artifacts/worker-route-ownership.json'));
if(publicAudit.summary.errors!==0)throw new Error(`Public audit has ${publicAudit.summary.errors} errors`);
if(!routeAudit.summary.directOperatorRouteLess)throw new Error('Direct operator route-less guard changed unexpectedly');

console.log(JSON.stringify({
  ok:true,
  news:news.length,
  marketCoins:market.coins.length,
  worker:'v19-with-all-domain-autoreplies',
  routes:'route-less-config-external-newsroom-owner-unresolved',
  indexOwners:{scaffold:'release-completion-v1.js',editorial:'index-editorial-order-v1.js',marketFallback:'index-data-resilience-v1.js'},
  mail:{goldSignature:true,allDomainAutoreplies:true,testRecipient:'sefic20@gmx.com',testSendingEnabled:false},
  scheduler:'strict-opt-in-disabled',
  publicAudit:publicAudit.summary,
  routeAudit:routeAudit.summary
},null,2));
