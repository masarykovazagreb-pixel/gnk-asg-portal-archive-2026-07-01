import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'mobile-admin-security');
const files = {
  vault: path.join(ROOT, 'apps', 'portal', 'assets', 'operator-token-vault.js'),
  publisher: path.join(ROOT, 'apps', 'portal', 'assets', 'mobile-admin-publisher.js'),
  mobile: path.join(ROOT, 'apps', 'portal', 'operator-mobile', 'index.html')
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const source = {
  vault: read(files.vault),
  publisher: read(files.publisher),
  mobile: read(files.mobile)
};

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const combinedSensitive = `${source.publisher}\n${source.mobile}`;
const vaultPosition = source.mobile.indexOf('/assets/operator-token-vault.js');
const tokenUsePosition = source.mobile.indexOf('const token=');

check(
  'Token vault uses sessionStorage',
  source.vault.includes("sessionStorage.setItem(SESSION_KEY, token)") &&
    source.vault.includes("sessionStorage.getItem(SESSION_KEY)"),
  'Operator token must live only for the active browser session.'
);
check(
  'Legacy persistent token is removed',
  source.vault.includes("localStorage.removeItem(key)") &&
    source.vault.includes("LEGACY_KEYS = ['GNK_ASG_OPERATOR_TOKEN']"),
  'Legacy localStorage token must be migrated once and deleted.'
);
check(
  'Vault exposes authenticated headers',
  source.vault.includes("'x-operator-token': token") &&
    source.vault.includes('authorization: `Bearer ${token}`'),
  'Protected calls must use both supported operator headers.'
);
check(
  'Publisher reads token through vault',
  source.publisher.includes('window.GNKOperatorToken?.get?.()') &&
    source.publisher.includes('window.GNKOperatorToken?.headers?.()'),
  'Quick publisher must not read a raw persistent token.'
);
check(
  'Publisher reacts to vault changes',
  source.publisher.includes("window.addEventListener('gnk:operator-token-changed'") &&
    source.publisher.includes('verified = false;'),
  'Token removal or replacement must immediately invalidate the verified state.'
);
check(
  'AI preparation is authenticated',
  /fetch\('\/api\/ai-assist'[\s\S]*?headers:\s*\{[\s\S]*?\.\.\.auth\(\)/.test(source.publisher),
  'Private AI preparation must include operator authentication.'
);
check(
  'Media upload is authenticated',
  /fetch\('\/operator\/media-upload'[\s\S]*?headers:\s*auth\(\)/.test(source.publisher),
  'Image upload must include operator authentication.'
);
check(
  'Publication submit is authenticated',
  /fetch\(PUBLISH_URL[\s\S]*?\.\.\.auth\(\)/.test(source.publisher),
  'Dry-run and live publish must include operator authentication.'
);
check(
  'Mobile page loads vault before token use',
  vaultPosition >= 0 && tokenUsePosition >= 0 && vaultPosition < tokenUsePosition,
  'The session vault must exist before inline mobile admin code reads the token.'
);
check(
  'No operator token is placed in a URL',
  !/[?&]token=|withToken\s*\(|URLSearchParams[\s\S]{0,120}token/i.test(combinedSensitive),
  'Operator credentials must be transported only in request headers.'
);
check(
  'No persistent raw token reads remain',
  !/localStorage\.getItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]\s*\)/.test(combinedSensitive) &&
    !/const\s+TOKEN_KEY\s*=\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(combinedSensitive),
  'The quick publisher and mobile page must not read the operator token from localStorage.'
);
check(
  'No obvious hardcoded operator secret exists',
  !/(operator[-_ ]?token|bearer)\s*[:=]\s*['"][A-Za-z0-9_-]{24,}['"]/i.test(combinedSensitive),
  'Repository files must not contain a concrete operator secret.'
);

const failed = checks.filter(item => !item.pass);
const result = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(REPORT_DIR, 'mobile-admin-security.json'),
  `${JSON.stringify(result, null, 2)}\n`
);

const markdown = [
  '# Mobile Admin Security Audit',
  '',
  `Status: **${result.status}**`,
  '',
  `Passed: ${result.passed}/${checks.length}`,
  '',
  ...checks.map(item => `- ${item.pass ? 'PASS' : 'FAIL'} — ${item.name}: ${item.detail}`),
  ''
].join('\n');
fs.writeFileSync(
  path.join(REPORT_DIR, 'mobile-admin-security.md'),
  markdown
);

console.log(markdown);
if (failed.length) process.exit(1);
