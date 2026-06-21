import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'mobile-admin-upload-publish-smoke');
const checks = [];
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail: String(detail) });
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const mobilePage = read('apps/portal/operator-mobile/index.html');
const publisherClient = read('apps/portal/assets/mobile-admin-publisher.js');
const secureOperator = read('workers/gnk-asg-direct-operator/src/index-secure.js');
const publishWorkerSource = read('workers/gnk-asg-publish-operator/src/index.js');

add('Mobile camera input exists', mobilePage.includes('type="file"') && mobilePage.includes('accept="image/*"') && mobilePage.includes('capture="environment"'));
add('Mobile upload uses protected operator route', publisherClient.includes("fetch('/operator/media-upload'") && /headers:\s*auth\(\)/.test(publisherClient));
add('Secure operator protects media upload', secureOperator.includes("'/api/media-upload'") && secureOperator.includes('status: 401') && secureOperator.includes('protectedCorsHeaders(request)'));
add('Dry-run and publish controls exist', mobilePage.includes('id="dryRun"') && mobilePage.includes('id="publishNow"') && publisherClient.includes('PUBLISH_URL'));
add('Operator token is sent only in headers', publisherClient.includes('window.GNKOperatorToken?.headers?.()') && !/[?&]token=/.test(publisherClient));

const form = new FormData();
form.append('title', 'mobilna-smoke-fotografija');
form.append('file', new Blob(['fake-image-bytes'], { type: 'image/jpeg' }), 'smoke.jpg');
const formFile = form.get('file');
add('Upload FormData contains title', form.get('title') === 'mobilna-smoke-fotografija');
add('Upload FormData contains image file', Boolean(formFile) && formFile.name === 'smoke.jpg' && formFile.type === 'image/jpeg');

const encodedWorker = Buffer.from(publishWorkerSource, 'utf8').toString('base64');
const workerModule = await import(`data:text/javascript;base64,${encodedWorker}`);
const worker = workerModule.default;

class FakeKV {
  constructor() {
    this.values = new Map();
    this.puts = [];
  }
  async get(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  async put(key, value) {
    this.puts.push({ key, value: String(value) });
    this.values.set(key, String(value));
  }
}

const kv = new FakeKV();
const env = { OPERATOR_TOKEN: 'test-operator-token', GNK_ASG_KV: kv };
const headers = {
  'content-type': 'application/json',
  'authorization': 'Bearer test-operator-token',
  'x-operator-token': 'test-operator-token'
};
const call = async (pathname, init = {}) => {
  const response = await worker.fetch(new Request(`https://publish.gnk-asg.hr${pathname}`, init), env);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body, text };
};

const unauthorized = await call('/api/publications/status');
add('Status rejects missing token', unauthorized.response.status === 401 && unauthorized.body?.error === 'unauthorized', `HTTP ${unauthorized.response.status}`);

const authorized = await call('/api/publications/status', { headers });
add('Status accepts valid token', authorized.response.status === 200 && authorized.body?.ok === true && authorized.body?.hasKV === true, `HTTP ${authorized.response.status}`);

const words = Array.from({ length: 520 }, (_, index) => `riječ${index + 1}`).join(' ');
const validPayload = {
  title: 'GNK ASG mobilni smoke test objave',
  lang: 'hr',
  summary: 'Izolirani smoke test potvrđuje mobilni tijek pripreme, provjere i objave bez pristupa produkcijskom spremištu.',
  bodyHtml: `<p>${words}</p><script>alert(1)</script><p onclick="bad()">Zaključak testa.</p>`,
  category: 'AI i tehnologija',
  image: 'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png',
  imageAlt: 'GNK ASG mobilni smoke test',
  author: 'Nermin Sefić',
  sources: [{ title: 'Izvor', url: 'https://gnk-asg.hr/' }],
  keywords: ['GNK ASG', 'mobilni admin', 'smoke test'],
  seo: { description: 'Mobilni admin smoke test.' }
};

const writesBeforeDryRun = kv.puts.length;
const dryRun = await call('/api/publications/publish', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ...validPayload, dryRun: true })
});
add('Dry-run validates publication', dryRun.response.status === 200 && dryRun.body?.dryRun === true && dryRun.body?.validationPassed === true, `HTTP ${dryRun.response.status}`);
add('Dry-run performs zero KV writes', kv.puts.length === writesBeforeDryRun, `${kv.puts.length - writesBeforeDryRun} writes`);
add('Dry-run enforces 500-word evidence', Number(dryRun.body?.item?.wordCount) >= 500, `${dryRun.body?.item?.wordCount || 0} words`);
add('Dry-run sanitizes active HTML', !String(dryRun.body?.item?.bodyHtml || '').includes('<script') && !/onclick\s*=/.test(String(dryRun.body?.item?.bodyHtml || '')));

const shortRun = await call('/api/publications/publish', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ...validPayload, bodyHtml: '<p>Premalo riječi.</p>', dryRun: true })
});
add('Short article is rejected', shortRun.response.status === 400 && shortRun.body?.validation?.includes('minimum_500_words'), `HTTP ${shortRun.response.status}`);

const liveSimulation = await call('/api/publications/publish', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ...validPayload, dryRun: false })
});
add('Isolated publish simulation succeeds', liveSimulation.response.status === 200 && liveSimulation.body?.published === true, `HTTP ${liveSimulation.response.status}`);
add('Isolated publish writes expected fake-KV keys', ['publish:approved', 'data:articles:items', `article:${liveSimulation.body?.item?.slug}`, 'publish:last'].every(key => kv.values.has(key)), [...kv.values.keys()].join(', '));

const duplicate = await call('/api/publications/publish', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ...validPayload, dryRun: false })
});
add('Duplicate slug is blocked', duplicate.response.status === 409 && duplicate.body?.error === 'slug_already_exists', `HTTP ${duplicate.response.status}`);

const update = await call('/api/publications/publish', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ...validPayload, allowUpdate: true, dryRun: false })
});
add('Explicit update is accepted', update.response.status === 200 && update.body?.published === true && update.body?.updated === true, `HTTP ${update.response.status}`);

const slug = update.body?.item?.slug;
const jsonArticle = await call(`/api/publications/${slug}`, { headers: { accept: 'application/json' } });
add('Published article JSON is retrievable', jsonArticle.response.status === 200 && jsonArticle.body?.item?.slug === slug, `HTTP ${jsonArticle.response.status}`);

const htmlArticle = await call(`/api/publications/${slug}`, { headers: { accept: 'text/html' } });
add('Published article HTML is retrievable', htmlArticle.response.status === 200 && htmlArticle.text.includes('<!doctype html>') && htmlArticle.text.includes('application/ld+json'), `HTTP ${htmlArticle.response.status}`);

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'isolated-mobile-admin-upload-publish-smoke',
  productionNetworkUsed: false,
  productionWrites: false,
  livePublishSimulation: 'fake-kv-only',
  liveBulkMailSending: false,
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${item.detail.replace(/\|/g, '\\|')} |`).join('\n');
const markdown = `# GNK ASG mobile admin upload and publish smoke\n\n- Status: **${report.status}**\n- Production network used: NO\n- Production writes: NO\n- Publish simulation: fake KV only\n- Passed: ${report.passed}/${checks.length}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), markdown);
console.log(markdown);
if (failed.length) process.exit(1);
