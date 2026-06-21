import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'apps/portal/operator-mobile/index.html'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'apps/portal/assets/operator-mobile-live-bridge.js'), 'utf8');
const checks = [
  {
    name: 'Bridge uses shared session vault',
    pass: bridge.includes('window.GNKOperatorToken?.get?.()') && bridge.includes('window.GNKOperatorToken?.headers?.()')
  },
  {
    name: 'Bridge does not read persistent operator token',
    pass: !/localStorage\.getItem\([^)]*GNK_ASG_OPERATOR_TOKEN/.test(bridge) && !/const\s+TOKEN_KEY/.test(bridge)
  },
  {
    name: 'Bridge reacts to session changes',
    pass: bridge.includes("window.addEventListener('gnk:operator-token-changed'")
  },
  {
    name: 'Bridge reports automation readiness',
    pass: bridge.includes('automationPreviewReady') && bridge.includes('dataSync') && bridge.includes('autoEditor')
  },
  {
    name: 'Bridge reports session security state',
    pass: bridge.includes("tokenStorage: 'session'") && bridge.includes('tokenInUrl: false')
  },
  {
    name: 'Page loads vault before live bridge',
    pass: page.indexOf('operator-token-vault.js') >= 0 &&
      page.indexOf('operator-token-vault.js') < page.indexOf('operator-mobile-live-bridge.js')
  }
];

const failed = checks.filter(item => !item.pass);
const output = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};
const reportDir = path.join(root, 'reports', 'operator-mobile-bridge-security');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'report.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
