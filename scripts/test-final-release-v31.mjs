import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const menu=read('apps/portal/assets/public-unified-menu-v6.js');
const contrast=read('apps/portal/assets/public-contrast-hardening-v1.js');
const indexEditorial=read('apps/portal/assets/index-editorial-order-v6.js');
const newsroom=read('apps/portal/assets/newsroom-live-v1.js');
const mailUi=read('apps/portal/assets/mail-studio-ui-v28.js');
const transport=read('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js');
const contactStudio=read('workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js');
const newsBackend=read('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js');
const worker=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js');
const wrapper=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js');
const editorialWrapper=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js');
const editorialRouter=read('workers/gnk-asg-direct-operator/src/public-editorial-asset-router-v1.js');
const marketApi=read('workers/gnk-asg-direct-operator/src/public-market-data-v1.js');
const marketClient=read('apps/portal/assets/market.js');
const config=read('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml');
const mime=read('workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js');
const signature=read('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js');
const comments=read('apps/portal/komentari/index.html');
const publications=read('apps/portal/objave/index.html');
const analyses=read('apps/portal/analize/index.html');

assert.match(menu,/__GNK_UNIFIED_MENU_V6__/);
for(const marker of ['Newsroom','Objave','Komentari','WORKERI I OPERACIJE','WORKERS & OPERATIONS','Worker Operations','Operator Dashboard','Mail Studio','Webmail','Campaign Mailer','Digital Headquarters'])assert.ok(menu.includes(marker),`menu missing ${marker}`);

assert.match(contrast,/__GNK_CONTRAST_HARDENING_V1__/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V2__/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V3__/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V4__/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V4_20260714_ALL_PAGES_VISUAL_REPAIR/);
assert.match(contrast,/targetRatio\(el\)/);
assert.match(contrast,/current\+(?:0)?\.05<target/);
assert.match(contrast,/MutationObserver/);
assert.match(contrast,/ResizeObserver/);
assert.match(contrast,/\.group-section \.group-card/);
assert.match(contrast,/#ffe08a/);
assert.match(contrast,/#f8fafc/);
assert.match(contrast,/gradientColor/);
assert.match(contrast,/effectiveBackgroundCandidates/);
assert.match(contrast,/bestColor/);
assert.match(contrast,/input,select,textarea/);

assert.match(indexEditorial,/__GNK_INDEX_EDITORIAL_ORDER_V6__/);
assert.match(indexEditorial,/limit=100/);
assert.match(indexEditorial,/Objave, vijesti, analize i komentari/);
assert.match(indexEditorial,/gnk-news-100/);
assert.match(newsroom,/__GNK_NEWSROOM_LIVE_V7__/);
assert.match(newsroom,/limit=100/);
assert.match(newsroom,/transparentno-upravljanje-kao-operativni-standard/);
assert.match(newsroom,/automatizacija-ne-ukida-odgovornost/);

assert.match(newsBackend,/VISIBLE_LIMIT=100/);
assert.match(newsBackend,/ARCHIVE_CAP=2000/);
assert.match(newsBackend,/PRUNE_OLDEST=1000/);
assert.match(newsBackend,/TOTAL_RETENTION_CAP=VISIBLE_LIMIT\+ARCHIVE_CAP/);
assert.match(newsBackend,/while\(retained\.length>=TOTAL_RETENTION_CAP\)/);
assert.doesNotMatch(newsBackend,/slice\(0,500\)/);

assert.match(transport,/from 'cloudflare:email'/);
assert.match(transport,/new EmailMessage\(base\.from,recipient,raw\)/);
assert.match(transport,/createTrackedMessage/);
assert.match(transport,/assembleMime\(base,htmlForRecipient\)/);
assert.match(transport,/Content-ID: <\$\{EMAIL_LOGO_CID\}>/);
assert.match(transport,/Content-Location:/);
assert.match(transport,/X-Attachment-Id:/);
assert.match(transport,/enforceRequiredSignature/);
assert.match(contactStudio,/CONTACT_PATH='\/api\/contact-submit'/);
assert.match(contactStudio,/STUDIO_PATH='\/api\/studio-message\/send'/);
assert.match(contactStudio,/sendBrandedEmail/);
assert.match(contactStudio,/createContactCase/);
assert.match(contactStudio,/CONTACT_INTERNAL=env=>.*'rht@gmx\.com'/);
assert.match(mime,/width="64" height="66"/);
assert.match(mime,/Content-Location:/);
assert.match(mime,/X-Attachment-Id:/);
assert.match(signature,/width="64" height="66"/);

assert.match(mailUi,/min-height:520px!important/);
assert.match(mailUi,/height:52vh/);
assert.match(mailUi,/logo-gnk-asg-canonical\.svg/);

assert.match(worker,/GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST/);
assert.match(worker,/public-unified-menu-v6\.js/);
assert.match(worker,/public-contrast-hardening-v1\.js/);
assert.match(worker,/index-editorial-order-v6\.js/);
assert.match(worker,/mail-studio-ui-v28\.js/);
assert.match(worker,/handleContactStudio/);
assert.match(wrapper,/GNK_ASG_UNIFIED_AUTH_V32_DETAILED_EMAIL_STATUS_RECEIPT/);
assert.match(wrapper,/index-unified-auth-v21\.js/);
assert.match(wrapper,/x-gnk-contrast-runtime','hardened-v4-all-pages-visual/);
assert.match(editorialWrapper,/GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS/);
assert.match(editorialWrapper,/servePublicEditorialAsset/);
assert.match(editorialWrapper,/index-unified-auth-v22\.js/);
assert.match(editorialWrapper,/serveCurrentNewsAsset/);
assert.match(editorialWrapper,/serveNewsShareRedirect/);
assert.match(editorialWrapper,/servePublicMarketData/);
assert.match(editorialWrapper,/MARKET_ORIGIN/);
assert.match(editorialRouter,/GNK_PUBLIC_EDITORIAL_ASSETS_V2_20260715/);
for(const marker of ['/objave','/komentari','/analize','/en/publications','/en/commentary','/en/analyses','x-gnk-explicit-html-route','x-gnk-editorial-request-path','x-gnk-editorial-assets','redirect:\'follow\''])assert.ok(editorialRouter.includes(marker),`editorial router missing ${marker}`);
assert.match(marketApi,/GNK_ASG_PUBLIC_MARKET_DATA_V6_20260719_OFFICIAL_INSTITUTIONAL_SERVER_SIDE/);
assert.match(marketApi,/PRIMARY_API_PATH='\/api\/market'/);
assert.match(marketApi,/PUBLIC_API_PATH='\/api\/public-market'/);
assert.match(marketApi,/API_PATHS=new Set\(\[PRIMARY_API_PATH,PUBLIC_API_PATH\]\)/);
assert.match(marketApi,/x-gnk-market-source/);
assert.match(marketApi,/x-gnk-market-route/);
assert.match(marketApi,/fallback_reason/);
assert.match(marketClient,/fetch\('\/api\/market/);
assert.match(marketClient,/fetch\('\/api\/public-market/);
assert.match(marketClient,/zastarjeli rezervni presjek/);
assert.match(config,/main = "src\/index-unified-auth-v23\.js"/);
assert.match(config,/html_handling = "auto-trailing-slash"/);

const newPages=[
 'apps/portal/objave/transparentno-upravljanje-kao-operativni-standard/index.html',
 'apps/portal/analize/ai-infrastruktura-kapital-energija/index.html',
 'apps/portal/objave/kiberneticka-otpornost-i-kontinuitet/index.html',
 'apps/portal/komentari/trzista-traze-jasne-informacije/index.html',
 'apps/portal/komentari/automatizacija-ne-ukida-odgovornost/index.html',
 'apps/portal/objave/globalne-kamatne-stope-nakon-inflacijskog-soka/index.html',
 'apps/portal/komentari/brzina-bez-kontrole-nije-inovacija/index.html'
];
const images=[
 'apps/portal/assets/editorial/transparent-governance.svg',
 'apps/portal/assets/editorial/ai-infrastructure.svg',
 'apps/portal/assets/editorial/cyber-resilience.svg',
 'apps/portal/assets/editorial/market-information.svg',
 'apps/portal/assets/editorial/responsible-automation.svg'
];
for(const file of [...newPages,...images])assert.ok(fs.existsSync(file)&&fs.statSync(file).size>100,`missing ${file}`);
for(const page of newPages){const html=read(page);assert.match(html,/class="article-cover"/);assert.match(html,/editorial-content-v2\.css/);assert.match(html,/logo-gnk-asg-canonical\.svg/)}
function cards(html,label,minimum){
 const count=(html.match(/class="editorial-card"/g)||[]).length;
 assert.ok(count>=minimum,`${label} must contain at least ${minimum} cards; actual=${count}`);
 const links=[...html.matchAll(/<a href="(\/(?:objave|komentari|analize)\/[^"#?]+\/)"/g)].map(match=>match[1]);
 assert.equal(new Set(links).size,links.length,`${label} contains duplicate editorial links`);
 return count;
}
const publicationCount=cards(publications,'publications',5);
const commentCount=cards(comments,'comments',5);
const analysisCount=cards(analyses,'analyses',4);

const localNewsPayload=JSON.parse(read('apps/portal/data/news.json'));
const localNews=Array.isArray(localNewsPayload)?localNewsPayload:Array.isArray(localNewsPayload?.items)?localNewsPayload.items:[];
assert.ok(localNews.length>=60,`local news fallback must contain >=60 items; actual=${localNews.length}`);

console.log(JSON.stringify({ok:true,deployPerformed:false,menu:'v6-full-with-workers',logo:'64x66',contrast:'WCAG-rendered-v4-all-pages',news:{visible:100,archive:2000,prune:1000,totalRetention:2100,localFallback:localNews.length},market:{sameOrigin:true,primary:'/api/market',fallback:'/api/public-market',staleFallbackExplicit:true},mail:{transport:'EmailMessage',contact:true,studio:true,inlineLogo:true,composerMinHeight:520,emailStatus:'v8-click-tracking'},editorial:{assetRouting:'v2-canonical-trailing-slash-v38',minimums:{publications:5,analyses:4,commentary:5},actual:{publications:publicationCount,analyses:analysisCount,commentary:commentCount}},worker:'v38-over-v32-over-v31'},null,2));
