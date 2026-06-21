import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'mobile-admin-security');
const files = {
  vault: path.join(ROOT, 'apps', 'portal', 'assets', 'operator-token-vault.js'),
  publisher: path.join(ROOT, 'apps', 'portal', 'assets', 'mobile-admin-publisher.js'),
  mobile: path.join(ROOT, 'apps', 'portal', 'operator-mobile', 'index.html'),
  studio: path.join(ROOT, 'apps', 'portal', 'assets', 'mail-studio-pro.js'),
  studioPage: path.join(ROOT, 'apps', 'portal', 'mail-studio-pro', 'index.html')
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)])
);

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const combinedSensitive = [
  source.publisher,
  source.mobile,
  source.studio,
  source.studioPage
].join('\n');
const mobileVaultPosition = source.mobile.indexOf('/assets/operator-token-vault.js');
const mobileTokenUsePosition = source.mobile.indexOf('const token=');
const studioVaultPosition = source.studioPage.indexOf('/assets/operator-token-vault.js');
const studioScriptPosition = source.studioPage.indexOf('/assets/mail-studio-pro.js');

check(
  'Token vault uses sessionStorage',
  source.vault.includes("sessionStorage.setItem(SESSION_KEY, token)") &&
    source.vault.includes("sessionStorage.getItem(SESSION_KEY)"),
  'Operator token must live only for the active browser session.'
);
check(
  'Legacy persistent token is removed',
  source.vault.includes('localStorage.removeItem(key)') &&
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
  'AI publication preparation is authenticated',
  /fetch\('\/api\/ai-assist'[\s\S]*?headers:\s*\{[\s\S]*?\.\.\.auth\(\)/.test(source.publisher),
  'Private publication AI preparation must include operator authentication.'
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
  mobileVaultPosition >= 0 && mobileTokenUsePosition >= 0 && mobileVaultPosition < mobileTokenUsePosition,
  'The session vault must exist before inline mobile admin code reads the token.'
);
check(
  'Mail Studio reads token through vault',
  source.studio.includes('window.GNKOperatorToken?.get?.()') &&
    source.studio.includes('window.GNKOperatorToken?.headers?.()') &&
    source.studio.includes('window.GNKOperatorToken?.set?.(value)') &&
    source.studio.includes('window.GNKOperatorToken?.clear?.()'),
  'Mail Studio authentication must use the shared session vault.'
);
check(
  'Mail Studio loads vault before application code',
  studioVaultPosition >= 0 && studioScriptPosition >= 0 && studioVaultPosition < studioScriptPosition,
  'The vault script must execute before Mail Studio Pro.'
);
check(
  'Mail Studio protected requests receive auth headers',
  source.studio.includes('for (const [key, value] of Object.entries(auth())) headers.set(key, value)') &&
    source.studio.includes("request('/api/ai-assist'") &&
    source.studio.includes("request('/api/admin-mail-send'"),
  'AI and send requests must pass through the authenticated request helper.'
);
check(
  'Held AI draft is reviewable before manual sending',
  source.studio.includes("currentBox === 'held' && selected.draft?.body") &&
    source.studio.includes('AI draft je učitan za provjeru') &&
    source.studio.includes('Slanje ostaje ručna radnja'),
  'Sensitive or non-automatic replies must remain visible for human approval.'
);
check(
  'Mail Studio forwards thread context to AI',
  source.studio.includes('threadContext: compactThreadContext()') &&
    source.studio.includes('threadMessageCount:') &&
    source.studio.includes('cijeli dostupni thread'),
  'AI assistance must receive the available conversation chronology.'
);
check(
  'No operator token is placed in a URL',
  !/[?&]token=|withToken\s*\(|URLSearchParams[\s\S]{0,120}token/i.test(combinedSensitive),
  'Operator credentials must be transported only in request headers.'
);
check(
  'No persistent raw token reads remain',
  !/localStorage\.getItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]\s*\)/.test(combinedSensitive) &&
    !/const\s+TOKEN_KEY\s*=\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(combinedSensitive) &&
    !/localStorage\.setItem\(\s*TOKEN_KEY/.test(combinedSensitive),
  'Mobile admin and Mail Studio must not persist the operator token in localStorage.'
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
  '# Operator Security Audit',
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
