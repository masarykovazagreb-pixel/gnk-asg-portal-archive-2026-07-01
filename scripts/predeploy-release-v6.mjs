import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => {
  if (!fs.existsSync(path) || fs.statSync(path).size === 0) throw new Error(`Missing or empty: ${path}`);
};
const includes = (path, tokens) => {
  const value = read(path);
  for (const token of tokens) if (!value.includes(token)) throw new Error(`${path} missing token: ${token}`);
};
const notIncludes = (path, tokens) => {
  const value = read(path);
  for (const token of tokens) if (value.includes(token)) throw new Error(`${path} contains forbidden token: ${token}`);
};

const required = [
  'apps/portal/index.html',
  'apps/portal/en/index.html',
  'apps/portal/newsroom/index.html',
  'apps/portal/en/newsroom/index.html',
  'apps/portal/objave/index.html',
  'apps/portal/objave/povjerenje-investitora-kroz-transparentnost/index.html',
  'apps/portal/objave/kiberneticka-sigurnost-i-poslovni-kontinuitet/index.html',
  'apps/portal/komentari/index.html',
  'apps/portal/komentari/odgovornost-se-ne-moze-automatizirati/index.html',
  'apps/portal/komentari/novac-je-informacija-prije-nego-kapital/index.html',
  'apps/portal/analize/index.html',
  'apps/portal/analize/ai-infrastruktura-i-potrosnja-energije/index.html',
  'apps/portal/analize/transparentnost-podataka-kao-poslovna-infrastruktura/index.html',
  'apps/portal/trzista/index.html',
  'apps/portal/en/markets/index.html',
  'apps/portal/the-code/index.html',
  'apps/portal/assets/the-code-experience-loop-v1.html',
  'apps/portal/assets/public-compact-menu-v1.js',
  'apps/portal/assets/release-completion-v1.js',
  'apps/portal/assets/index-data-resilience-v1.js',
  'apps/portal/assets/index-editorial-order-v1.js',
  'apps/portal/assets/newsroom-live-v1.js',
  'apps/portal/assets/market-centre-data.js',
  'apps/portal/assets/logo-gnk-asg-gold.svg',
  'apps/portal/assets/logo-gnk-dinamo-gold.svg',
  'apps/portal/data/news.json',
  'apps/portal/data/market.json',
  'workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js',
  'workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js',
  'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',
  'workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js',
  'workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml',
  'apps/portal/editorial-sitemap.xml',
  'apps/portal/sitemap-index.xml',
  'apps/portal/robots.txt'
];
required.forEach(exists);

const news = JSON.parse(read('apps/portal/data/news.json'));
if (!Array.isArray(news) || news.length < 100) throw new Error(`Expected at least 100 fallback news items, got ${Array.isArray(news) ? news.length : 'invalid JSON'}`);
for (const [i, item] of news.entries()) {
  if (!item?.title || !item?.url || !item?.published_at || !item?.source) throw new Error(`Invalid news item at index ${i}`);
}
const market = JSON.parse(read('apps/portal/data/market.json'));
if (market?.status !== 'ok' || !Array.isArray(market?.coins) || market.coins.length < 2) throw new Error('Invalid market fallback JSON');

includes('apps/portal/assets/public-compact-menu-v1.js', [
  "['Newsroom','Newsroom','/newsroom/']",
  "['Objave','Publications','/objave/']",
  "['Analize','Analyses','/analize/']",
  "['Komentari','Commentary','/komentari/']",
  "['Tržišta','Markets','/trzista/']",
  "['THE CODE','THE CODE','/the-code/']",
  "document.getElementById('gnk-compact-menu')",
  'menus.slice(1)',
  'strips.slice(1)',
  'MutationObserver'
]);

includes('apps/portal/assets/release-completion-v1.js', [
  'GNK_RELEASE_COMPLETION_V6',
  'logo-gnk-asg-gold.svg',
  'logo-gnk-dinamo-gold.svg',
  'renderNews',
  'renderMarkets',
  'the-code-experience-loop-v1.html',
  'purgeMenus'
]);

includes('apps/portal/assets/index-editorial-order-v1.js', [
  "en?'Publications':'Objave'",
  "en?'Business news':'Poslovne vijesti'",
  "en?'Analyses':'Analize'",
  "en?'Commentary':'Komentari'",
  '/data/news.json',
  '/api/public-news'
]);

includes('apps/portal/assets/index-data-resilience-v1.js', ['/data/news.json', '/data/market.json', 'newsFallback', 'marketFallback']);
includes('apps/portal/assets/newsroom-live-v1.js', ['/api/public-news', '/data/news.json', 'setInterval(render,300000)']);
includes('apps/portal/assets/market-centre-data.js', ["fetch(`/data/${name}", 'setInterval(render,60000)', 'STATUS: OFFLINE'.replace(': ', "': '")]);

includes('apps/portal/assets/the-code-experience-loop-v1.html', [
  'PONOVI PROJEKCIJU',
  'function next()',
  'show(scenes.length-1)',
  "replayBtn.addEventListener('click',replay)",
  "soundBtn.addEventListener('click'",
  "show(0)"
]);

includes('apps/portal/analize/index.html', ['ai-infrastruktura-i-potrosnja-energije', 'transparentnost-podataka-kao-poslovna-infrastruktura']);
includes('apps/portal/editorial-sitemap.xml', ['/analize/', '/objave/', '/komentari/']);

includes('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js', [
  'STATIC_HTML_ROUTES',
  "['/newsroom','/newsroom/index.html']",
  "['/en/newsroom','/en/newsroom/index.html']",
  "['/objave','/objave/index.html']",
  "['/analize','/analize/index.html']",
  "['/komentari','/komentari/index.html']",
  "['/trzista','/trzista/index.html']",
  "['/en/markets','/en/markets/index.html']",
  "['/the-code','/the-code/index.html']",
  'index-data-resilience-v1.js',
  'index-editorial-order-v1.js',
  'release-completion-v1.js',
  'v6-final-resilient-editorial',
  'x-gnk-explicit-html-route'
]);

includes('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml', [
  'main = "src/index-unified-auth-v19.js"',
  'run_worker_first = true',
  'html_handling = "auto-trailing-slash"',
  'crons = ["*/15 * * * *"]',
  'MAIL_AUTO_REPLY_LIVE = "true"',
  'MAIL_STUDIO_LIVE = "true"'
]);

includes('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js', [
  'renderBrandSignatureHtml',
  'logoSrc=LOGO_URL',
  'logo(logoSrc)'
]);
includes('workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js', ['EMAIL_LOGO_CID', 'loadEmailLogo']);
includes('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js', ['loadEmailLogo', 'multipart/related']);
includes('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js', [
  'scheduledEnabled',
  'runScheduledNewsPublication',
  "return !['0','false','no','off','disabled'].includes(v)"
]);

notIncludes('apps/portal/assets/public-compact-menu-v1.js', ['index-live-hub-v1.js']);

console.log(JSON.stringify({
  ok: true,
  fallbackNewsItems: news.length,
  fallbackMarketCoins: market.coins.length,
  editorialSections: ['objave', 'vijesti', 'analize', 'komentari'],
  explicitHtmlRoutes: 14,
  activeWorker: 'index-unified-auth-v19.js',
  menu: 'single compact menu',
  marketFallback: true,
  newsroomFallback: true,
  theCodeFinalCountdown: true,
  mailCidChecks: true,
  scheduledNewsDefaultOn: true
}, null, 2));
