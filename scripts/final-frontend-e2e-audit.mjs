import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'final-frontend-e2e');
const BASE = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const checks = [];

const pairs = [
  ['Home', '/', '/en/'],
  ['Publications', '/objave/', '/publications/'],
  ['News', '/vijesti/', '/news/'],
  ['Markets', '/trzista/', '/markets/'],
  ['Video library', '/videoteka/', '/en/video-library/'],
  ['BPP', '/platforme/bpp/', '/en/platforms/bpp/'],
  ['Privacy', '/privatnost/', '/en/privacy/'],
  ['Terms', '/uvjeti-koristenja/', '/en/terms/'],
  ['Cookies', '/kolacici/', '/en/cookies/']
];

const badText = ['Ã', 'Ä‡', 'Äč', 'Å¡', 'Å¾', 'â€“', 'â€”', 'â€¦', 'Â·', 'pomoÄ‡'];
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });

async function inspectRoute(label, route, language) {
  const url = new URL(route, BASE).href;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const html = await response.text();
    const lower = html.toLowerCase();
    const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
    const broken = badText.filter(value => html.includes(value));
    const pass = response.status >= 200 && response.status < 400 &&
      lang === language &&
      (lower.includes('charset="utf-8"') || lower.includes('charset=utf-8')) &&
      (lower.includes('name="viewport"') || lower.includes("name='viewport'")) &&
      broken.length === 0;
    add(`${label} ${language.toUpperCase()}`, pass, pass ? `HTTP ${response.status}` : JSON.stringify({ status: response.status, lang, broken }));
  } catch (error) {
    add(`${label} ${language.toUpperCase()}`, false, String(error?.message || error));
  }
}

for (const [label, hr, en] of pairs) {
  await inspectRoute(label, hr, 'hr');
  await inspectRoute(label, en, 'en');
}

const worker = read('workers/gnk-asg-public-pages-live/src/index.js');
for (const [label, hr, en] of pairs) {
  add(`Canonical pair ${label}`, worker.includes(`hr: '${hr}'`) && worker.includes(`en: '${en}'`), `${hr} ↔ ${en}`);
}
add('Canonical and hreflang normalizer', worker.includes('link[rel="canonical"]') && worker.includes('link[rel="alternate"][hreflang]') && worker.includes('hreflang="x-default"'));

const mobilePage = read('apps/portal/operator-mobile/index.html');
const publisher = read('apps/portal/assets/mobile-admin-publisher.js');
const bridge = read('apps/portal/assets/operator-mobile-live-bridge.js');
add('Mobile camera and upload', publisher.includes('capture="environment"') && publisher.includes("fetch('/operator/media-upload'") && bridge.includes("request('/api/media-upload'") && bridge.includes('fileToBase64'));
add('Mobile AI and SEO', publisher.includes("fetch('/api/ai-assist'") && publisher.includes('AI pripremi 500+ riječi') && publisher.includes('seo:') && publisher.includes('keywords'));
add('Mobile dry-run and publish', publisher.includes('dryRun') && publisher.includes('PUBLISH_URL') && mobilePage.includes('operator-token-vault.js'));

const pdfPage = read('apps/portal/pdf-publisher/index.html');
const pdfClient = read('apps/portal/assets/pdf-publisher-secure.js');
add('PDF Publisher E2E contract', pdfPage.includes('operator-token-vault.js') && pdfPage.includes('pdf-publisher-secure.js') && pdfClient.includes("fetch('/api/pdf-publications/upload'") && pdfClient.includes('application/pdf'));

const mailStudio = read('apps/portal/assets/mail-studio-pro.js');
add('AI draft review workflow', mailStudio.includes("request('/api/ai-assist'") && mailStudio.includes("currentBox === 'held' && selected.draft?.body") && mailStudio.includes('Slanje ostaje ručna radnja'));

const videos = JSON.parse(read('apps/portal/data/video-library-items.json'));
const videoPage = read('apps/portal/assets/video-library-page.js');
add('Video library workflow', Array.isArray(videos) && videoPage.includes('video-library-items.json') && videoPage.includes('VideoObject'));

const liveAudit = read('scripts/live-backend-smoke-audit.mjs');
add('Contact submit evidence', liveAudit.includes("url:'https://gnk-asg.hr/api/contact-submit'") && liveAudit.includes("expected:[200]"));
add('Contact mailbox evidence', liveAudit.includes("url:'https://gnk-asg.hr/api/contact-mailboxes'") && bridge.includes("'/api/contact-mailboxes'"));
add('Protected contact inbox evidence', liveAudit.includes("url:'https://gnk-asg.hr/operator/contact-inbox'") && bridge.includes("'/operator/contact-inbox'"));

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
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
const md = `# GNK ASG final frontend E2E audit\n\n- Status: **${report.status}**\n- Base: ${BASE}\n- Production writes: NO\n- Passed: ${report.passed}/${report.total}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), md);
console.log(md);
if (failed.length) process.exit(1);
