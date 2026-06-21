import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PREVIEW_ROOT = path.resolve(ROOT, process.env.PREVIEW_ROOT || 'preview-artifact');
const OUT = path.join(ROOT, 'reports', 'final-frontend-filesystem');
const checks = [];
const pairs = [
  ['Home', '/', '/en/'],
  ['Publications', '/objave/', '/publications/'],
  ['News', '/vijesti/', '/news/'],
  ['Markets', '/trzista/', '/markets/'],
  ['Video library', '/videoteka/', '/en/video-library/'],
  ['BPP', '/platforme/bpp/', '/en/platforms/bpp/'],
  ['Media Kit', '/media-kit/', '/en/media-kit/'],
  ['Contact', '/contact/', '/en/contact/'],
  ['Legal', '/legal/', '/en/legal/'],
  ['Privacy', '/privatnost/', '/en/privacy/'],
  ['Terms', '/uvjeti-koristenja/', '/en/terms/'],
  ['Cookies', '/kolacici/', '/en/cookies/']
];
const mojibake = ['Ã', 'Ä‡', 'Äč', 'Å¡', 'Å¾', 'â€“', 'â€”', 'â€¦', 'Â·', 'pomoÄ‡'];
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });

function routeFile(route) {
  const clean = String(route || '/').replace(/^\/+|\/+$/g, '');
  return path.join(PREVIEW_ROOT, clean, 'index.html');
}

function inspectRoute(label, route, language) {
  const file = routeFile(route);
  if (!fs.existsSync(file)) {
    add(`${label} ${language.toUpperCase()}`, false, `Missing: ${file}`);
    return;
  }
  const html = fs.readFileSync(file, 'utf8');
  const lower = html.toLowerCase();
  const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
  const broken = mojibake.filter(value => html.includes(value));
  const pass = lang === language &&
    (lower.includes('charset="utf-8"') || lower.includes('charset=utf-8')) &&
    (lower.includes('name="viewport"') || lower.includes("name='viewport'")) &&
    broken.length === 0;
  add(`${label} ${language.toUpperCase()}`, pass, pass ? file : JSON.stringify({ file, lang, broken }));
}

for (const [label, hr, en] of pairs) {
  inspectRoute(label, hr, 'hr');
  inspectRoute(label, en, 'en');
}

const worker = read('workers/gnk-asg-public-pages-live/src/index.js');
for (const [label, hr, en] of pairs) {
  add(`Canonical pair ${label}`, worker.includes(`hr: '${hr}'`) && worker.includes(`en: '${en}'`), `${hr} ↔ ${en}`);
}
add('Canonical and hreflang normalizer', worker.includes('link[rel="canonical"]') && worker.includes('link[rel="alternate"][hreflang]') && worker.includes('hreflang="x-default"'));
add('Route-aware content language', worker.includes('withHeaders(response, routeSeo?.language)') && worker.includes("headers.set('content-language', language"));

const mediaKitHr = read('apps/portal/media-kit/index.html');
const mediaKitEn = read('apps/portal/en/media-kit/index.html');
add('Media Kit legal entity naming', mediaKitHr.includes('GNK ASG d.o.o.') && mediaKitEn.includes('GNK ASG d.o.o.') && !mediaKitHr.includes('GNKK') && !mediaKitEn.includes('GNKK'));
add('Media Kit controlled release notice', mediaKitHr.includes('Kontrolirano izdanje') && mediaKitEn.includes('Controlled release') && mediaKitHr.includes('ne označava ih konačnima') && mediaKitEn.includes('does not mark them as final'));
add('Media Kit contact and legal navigation', mediaKitHr.includes('/contact/') && mediaKitHr.includes('/legal/') && mediaKitEn.includes('/en/contact/') && mediaKitEn.includes('/en/legal/'));
add('Media Kit does not expose unapproved downloads', !/href=["'][^"']+\.(zip|pdf)["']/i.test(mediaKitHr) && !/href=["'][^"']+\.(zip|pdf)["']/i.test(mediaKitEn));

const mobilePage = read('apps/portal/operator-mobile/index.html');
const publisher = read('apps/portal/assets/mobile-admin-publisher.js');
const bridge = read('apps/portal/assets/operator-mobile-live-bridge.js');
add('Mobile camera and upload', publisher.includes('capture="environment"') && publisher.includes("fetch('/operator/media-upload'") && bridge.includes("request('/api/media-upload'") && bridge.includes('fileToBase64'));
add('Mobile AI and SEO', publisher.includes("fetch('/api/ai-assist'") && publisher.includes('AI pripremi 500+ riječi') && publisher.includes('seo:') && publisher.includes('keywords'));
add('Mobile dry-run and publish', publisher.includes('dryRun') && publisher.includes('PUBLISH_URL') && mobilePage.includes('operator-token-vault.js'));

const campaignClient = read('apps/portal/assets/media-campaign-studio.js');
const campaignUpload = read('apps/portal/assets/media-campaign-pdf-upload.js');
add('Campaign client uses session-only credentials', campaignClient.includes('sessionStorage.getItem(SESSION_KEY)') && campaignClient.includes('window.GNKOperatorToken || localSession') && !/localStorage\.setItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(campaignClient) && !campaignUpload.includes('GNK_ASG_OPERATOR_TOKEN'));
add('Campaign client keeps live bulk sending absent', !/mode\s*:\s*['"]live['"]|live\s*:\s*true|confirmCampaignId/.test(campaignClient) && campaignClient.includes('Stvarno masovno slanje ostaje isključeno.'));

const pdfPage = read('apps/portal/pdf-publisher/index.html');
const pdfClient = read('apps/portal/assets/pdf-publisher-secure.js');
add('PDF Publisher contract', pdfPage.includes('operator-token-vault.js') && pdfPage.includes('pdf-publisher-secure.js') && pdfClient.includes("fetch('/api/pdf-publications/upload'") && pdfClient.includes('application/pdf'));

const mailStudio = read('apps/portal/assets/mail-studio-pro.js');
add('AI draft review workflow', mailStudio.includes("request('/api/ai-assist'") && mailStudio.includes("currentBox === 'held' && selected.draft?.body") && mailStudio.includes('Slanje ostaje ručna radnja'));

const videoCatalog = JSON.parse(read('apps/portal/data/video-library-items.json'));
const items = Array.isArray(videoCatalog) ? videoCatalog : videoCatalog.items;
const videoPage = read('apps/portal/assets/video-library-page.js');
const videoSeo = read('apps/portal/assets/video-seo.js');
add('Video library workflow', Array.isArray(items) && videoPage.includes('/assets/video-seo.js') && videoPage.includes('GNKVideoSEO.apply') && videoSeo.includes("'@type': 'VideoObject'"));

const liveAudit = read('scripts/live-backend-smoke-audit.mjs');
add('Contact submit evidence', liveAudit.includes("url:'https://gnk-asg.hr/api/contact-submit'") && liveAudit.includes('expected:[200]'));
add('Contact mailbox evidence', liveAudit.includes("url:'https://gnk-asg.hr/api/contact-mailboxes'") && bridge.includes("'/api/contact-mailboxes'"));
add('Protected contact inbox evidence', liveAudit.includes("url:'https://gnk-asg.hr/operator/contact-inbox'") && bridge.includes("'/operator/contact-inbox'"));

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  source: PREVIEW_ROOT,
  mode: 'filesystem',
  productionWrites: false,
  productionTouched: false,
  status: failed.length ? 'FAIL' : 'PASS',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${String(item.detail || '').replace(/\|/g, '\\|')} |`).join('\n');
const markdown = `# GNK ASG final frontend filesystem audit\n\n- Status: **${report.status}**\n- Source: ${report.source}\n- Production writes: NO\n- Passed: ${report.passed}/${report.total}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), markdown);
console.log(markdown);
if (failed.length) process.exit(1);
