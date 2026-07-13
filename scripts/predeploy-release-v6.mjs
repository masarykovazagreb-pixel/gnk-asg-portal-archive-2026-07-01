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
  'apps/portal/komentari/index.html',
  'apps/portal/analize/index.html',
  'apps/portal/analize/ai-infrastruktura-i-potrosnja-energije/index.html',
  'apps/portal/analize/transparentnost-podataka-kao-poslovna-infrastruktura/index.html',
  'apps/portal/trzista/index.html',
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
  'workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js',
  'workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',
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
  if (!item?.title || !item?.url || !item?.published_at) throw new Error(`Invalid news item at index ${i}`);
}

includes('apps/portal/assets/public-compact-menu-v1.js', [
  "['Newsroom','Newsroom','/newsroom/']",
  "['Objave','Publications','/objave/']",
  "['Analize','Analyses','/analize/']",
  "['Komentari','Commentary','/komentari/']",
  "['Tržišta','Markets','/trzista/']",
  "['THE CODE','THE CODE','/the-code/']",
  "document.getElementById('gnk-compact-menu')",
  "menus.slice(1)"
]);

includes('apps/portal/assets/release-completion-v1.js', [
  'GNK_RELEASE_COMPLETION_V6',
  'logo-gnk-asg-gold.svg',
  'logo-gnk-dinamo-gold.svg',
  'renderNews',
  'renderMarkets',
  'the-code-experience-loop-v1.html'
]);

includes('apps/portal/assets/index-editorial-order-v1.js', [
  "en?'Publications':'Objave'",
  "en?'Business news':'Poslovne vijesti'",
  "en?'Analyses':'Analize'",
  "en?'Commentary':'Komentari'",
  '/data/news.json'
]);

includes('apps/portal/assets/index-data-resilience-v1.js', ['/data/news.json', '/data/market.json']);
includes('apps/portal/assets/newsroom-live-v1.js', ['/api/public-news', '/data/news.json']);
includes('apps/portal/assets/market-centre-data.js', ["fetch(`/data/${name}", 'setInterval(render,60000)']);

includes('apps/portal/assets/the-code-experience-loop-v1.html', ['PONOVI PROJEKCIJU', 'countdown']);
includes('apps/portal/analize/index.html', ['ai-infrastruktura-i-potrosnja-energije', 'transparentnost-podataka-kao-poslovna-infrastruktura']);
includes('apps/portal/editorial-sitemap.xml', ['/analize/', '/objave/', '/komentari/']);

includes('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js', [
  'index-data-resilience-v1.js',
  'index-editorial-order-v1.js',
  'release-completion-v1.js',
  'v6-final-resilient-editorial'
]);
includes('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml', ['main = "src/index-unified-auth-v19.js"', 'run_worker_first = true']);
includes('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js', ['renderBrandSignatureHtml', 'logoSrc']);
includes('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js', ['loadEmailLogo', 'multipart/related']);
includes('workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js', ['scheduledEnabled', 'runScheduledNewsPublication']);

notIncludes('apps/portal/assets/public-compact-menu-v1.js', ['index-live-hub-v1.js']);

console.log(JSON.stringify({
  ok: true,
  fallbackNewsItems: news.length,
  editorialSections: ['objave', 'vijesti', 'analize', 'komentari'],
  activeWorker: 'index-unified-auth-v19.js',
  menu: 'single compact menu',
  marketFallback: true,
  newsroomFallback: true,
  mailChecks: true
}, null, 2));
