import fs from 'node:fs';

const paths = {
  hr: 'apps/portal/gnk-aktual/index.html',
  en: 'apps/portal/en/gnk-aktual/index.html',
  js: 'apps/portal/assets/aktual-sova-v1.js',
  data: 'apps/portal/data/aktual-sova.json'
};
const read = p => fs.readFileSync(p, 'utf8');
const hr = read(paths.hr), en = read(paths.en), js = read(paths.js);
const data = JSON.parse(read(paths.data));
const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };

for (const [name, html] of [['HR',hr],['EN',en]]) {
  if (!html.includes('id="aktualSova"')) fail(`${name}: AKTUAL Sova root missing`);
  if (!html.includes('data-sova-tab="source"')) fail(`${name}: source tab missing`);
  if (!html.includes('data-sova-tab="foresight"')) fail(`${name}: foresight tab missing`);
  if (!html.includes('data-sova-tab="weekly"')) fail(`${name}: weekly tab missing`);
  if (!html.includes('data-sova-tab="explain"')) fail(`${name}: accessible explanation tab missing`);
  if (!html.includes('role="tablist"')) fail(`${name}: tablist semantics missing`);
  if (!html.includes('aria-live="polite"')) fail(`${name}: accessible status region missing`);
  if (!html.includes('/assets/aktual-sova-v1.js')) fail(`${name}: module script missing`);
}
const hrLower = hr.toLocaleLowerCase('hr');
const enLower = en.toLowerCase();
if (!hrLower.includes('modelirani digitalni vodič') || !hrLower.includes('modelirani strateški foresight vodič')) fail('HR transparent classification missing');
if (!enLower.includes('modelled digital guide') || !enLower.includes('modelled strategic foresight guide')) fail('EN transparent classification missing');

if (data.schema !== 'gnk-asg/aktual-sova/v1') fail('unexpected data schema');
if (!data.identity?.fictional || data.identity?.autonomous_agent !== false || data.identity?.superintelligence !== false) fail('identity guardrails invalid');
for (const key of ['external_accounts','messaging','third_party_publishing','scraping','business_decisions','sensitive_data','unverified_data','partnership_claims_without_evidence']) {
  if (data.boundaries?.[key] !== false) fail(`boundary ${key} must be false`);
}
if (data.identity?.human_editorial_gate !== 'Nermin Sefić') fail('human editorial gate missing');
if (data.weekly?.external_activity_claim !== false) fail('weekly metrics must not claim external activity');

const forbiddenJs = [/navigator\.sendBeacon/i,/WebSocket\s*\(/i,/XMLHttpRequest/i,/fetch\s*\(\s*['"]https?:/i,/localStorage\s*\./i,/sessionStorage\s*\./i];
for (const rx of forbiddenJs) if (rx.test(js)) fail(`unsafe browser capability detected: ${rx}`);
if (!js.includes("const localDataUrl = '/data/aktual-sova.json'")) fail('local-only data contract fetch missing');

const forbiddenClaims = [/suradnja s (CIA|FBI|NSA|SOA|VSOA)/i,/partnerstvo s Cibonom/i,/partnerstvo s NK Sesvetama/i,/superinteligencija je/i,/autonomni agent je/i];
for (const rx of forbiddenClaims) {
  if (rx.test(hr) || rx.test(en) || rx.test(js) || rx.test(JSON.stringify(data))) fail(`forbidden claim detected: ${rx}`);
}

if (!process.exitCode) console.log('AKTUAL Sova visibility/security contract: PASS');