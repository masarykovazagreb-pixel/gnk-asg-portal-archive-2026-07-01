import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const page = read('apps/portal/operator-mobile/index.html');
const bridge = read('apps/portal/assets/operator-mobile-live-bridge.js');
const secureEntry = read('workers/gnk-asg-direct-operator/src/index-secure.js');
const wrangler = read('workers/gnk-asg-direct-operator/wrangler.toml');

const checks = [
  ['session vault', bridge.includes('window.GNKOperatorToken?.get?.()') && bridge.includes('window.GNKOperatorToken?.headers?.()')],
  ['no persistent token', !/localStorage\.getItem\([^)]*GNK_ASG_OPERATOR_TOKEN/.test(bridge) && !/const\s+TOKEN_KEY/.test(bridge)],
  ['session event', bridge.includes("window.addEventListener('gnk:operator-token-changed'")],
  ['automation readiness', bridge.includes('previewReady') && bridge.includes('dataSync') && bridge.includes('autoEditor')],
  ['session security state', bridge.includes("tokenStorage: 'session'") && bridge.includes('tokenInUrl: false')],
  ['vault before bridge', page.indexOf('operator-token-vault.js') >= 0 && page.indexOf('operator-token-vault.js') < page.indexOf('operator-mobile-live-bridge.js')],
  ['protected upload route', secureEntry.includes("'/api/media-upload'") && secureEntry.includes('status: 401')],
  ['protected asset list route', secureEntry.includes("'/api/admin-asset-list'") && secureEntry.includes('status: 401')],
  ['preflight preserved', secureEntry.includes("request.method === 'OPTIONS'")],
  ['secure entry active', /main\s*=\s*"src\/index-secure\.js"/.test(wrangler)]
].map(([name, pass]) => ({ name, pass }));

const failed = checks.filter(item => !item.pass);
const output = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

const reportDir = path.join(root, 'reports', 'operator-mobile-security-final');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'report.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
