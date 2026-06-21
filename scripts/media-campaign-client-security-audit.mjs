import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'media-campaign-client-security');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const page = read('apps/portal/mail-studio-pro/campaign/index.html');
const client = read('apps/portal/assets/media-campaign-studio.js');
const legacyUpload = read('apps/portal/assets/media-campaign-pdf-upload.js');
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const combined = `${page}\n${client}\n${legacyUpload}`;

check(
  'Operator token is not persisted in localStorage',
  !/localStorage\.getItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(combined) &&
    !/localStorage\.setItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(combined) &&
    !/const\s+TOKEN_KEY\s*=\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(combined),
  'Only the non-secret campaign ID may remain in localStorage.'
);
check(
  'Session-only operator storage is active',
  client.includes("const SESSION_KEY = 'GNK_ASG_OPERATOR_TOKEN_SESSION'") &&
    client.includes('sessionStorage.getItem(SESSION_KEY)') &&
    client.includes('sessionStorage.setItem(SESSION_KEY') &&
    client.includes('window.GNKOperatorToken || localSession'),
  'Shared vault is preferred and sessionStorage is the safe fallback.'
);
check(
  'Legacy token is removed during session handling',
  client.includes('localStorage.removeItem(LEGACY_TOKEN_KEY)') &&
    !legacyUpload.includes('GNK_ASG_OPERATOR_TOKEN'),
  'The compatibility upload module must never read a token.'
);
check(
  'Credentials are sent only in headers',
  client.includes("'x-operator-token': token") &&
    client.includes('authorization: `Bearer ${token}`') &&
    !/[?&]token=|URLSearchParams[\s\S]{0,100}token/i.test(client),
  'No credential may be appended to a URL.'
);
check(
  'PDF upload uses the authenticated campaign endpoint once',
  client.includes('/attachment`') &&
    client.includes('pdfAttachment: state.pdf') &&
    legacyUpload.includes('performs no token reads') &&
    legacyUpload.includes('no duplicate upload'),
  'The main client owns the single controlled PDF upload.'
);
check(
  'Bulk live mode is absent from the client',
  !/mode\s*:\s*['"]live['"]|live\s*:\s*true|confirmCampaignId/.test(client) &&
    client.includes('Stvarno masovno slanje ostaje isključeno.'),
  'The browser client may execute only the safe test window.'
);
check(
  'Session logout clears private UI state',
  client.includes('session().clear()') &&
    client.includes("campaignList').innerHTML") &&
    client.includes("gnk:operator-token-changed"),
  'Logout must clear the session token and private campaign list.'
);
check(
  'Campaign page is private and non-indexable',
  page.includes('noindex,nofollow,noarchive') &&
    page.includes('type="password"') &&
    page.includes('Stvarno masovno slanje je zaključano'),
  'The campaign interface must not be indexed or present live sending as enabled.'
);

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  productionTouched: false,
  liveBulkSendEnabled: false,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${item.detail.replace(/\|/g, '\\|')} |`).join('\n');
const markdown = `# GNK ASG Media Campaign client security audit\n\n- Status: **${report.status}**\n- Production touched: NO\n- Live bulk send enabled: NO\n- Passed: ${report.passed}/${report.total}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), markdown);
console.log(markdown);
if (failed.length) process.exit(1);
