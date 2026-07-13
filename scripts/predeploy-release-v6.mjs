import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const run=file=>{console.log(`PREDEPLOY ${file}`);execFileSync(process.execPath,[file],{stdio:'inherit'})};

const requiredFiles=[
  'apps/portal/index.html','apps/portal/en/index.html','apps/portal/newsroom/index.html','apps/portal/en/newsroom/index.html',
  'apps/portal/contact/index.html','apps/portal/en/contact/index.html','apps/portal/trzista/index.html','apps/portal/en/markets/index.html',
  'apps/portal/objave/index.html','apps/portal/analize/index.html','apps/portal/komentari/index.html',
  'apps/portal/en/publications/index.html','apps/portal/en/analyses/index.html','apps/portal/en/commentary/index.html',
  'apps/portal/objave/tehnologija-kapital-i-odgovorno-upravljanje/index.html',
  'apps/portal/analize/kapitalna-struktura-i-operativna-otpornost/index.html',
  'apps/portal/komentari/inovacija-bez-povjerenja-nije-napredak/index.html',
  'apps/portal/en/publications/technology-capital-and-responsible-governance/index.html',
  'apps/portal/en/analyses/capital-structure-and-operational-resilience/index.html',
  'apps/portal/en/commentary/innovation-without-trust-is-not-progress/index.html',
  'apps/portal/objave/transparentno-upravljanje-kao-operativni-standard/index.html',
  'apps/portal/analize/ai-infrastruktura-kapital-energija/index.html',
  'apps/portal/objave/kiberneticka-otpornost-i-kontinuitet/index.html',
  'apps/portal/komentari/trzista-traze-jasne-informacije/index.html',
  'apps/portal/komentari/automatizacija-ne-ukida-odgovornost/index.html',
  'apps/portal/the-code/index.html','apps/portal/en/the-code/index.html','apps/portal/media-application/index.html','apps/portal/mail-studio/index.html',
  'apps/portal/assets/logo-gnk-asg-canonical.svg','apps/portal/assets/editorial-content-v2.css','apps/portal/assets/contact-form-v2.js',
  'apps/portal/assets/the-code-experience-loop-v1.html','apps/portal/assets/public-compact-menu-v1.js',
  'apps/portal/assets/public-design-tokens-v1.css','apps/portal/assets/public-design-runtime-v1.js',
  'apps/portal/assets/public-unified-menu-v5.js','apps/portal/assets/public-unified-design-v3.js','apps/portal/assets/index-editorial-order-v5.js',
  'apps/portal/assets/public-unified-menu-v6.js','apps/portal/assets/public-contrast-hardening-v1.js','apps/portal/assets/index-editorial-order-v6.js','apps/portal/assets/mail-studio-ui-v28.js',
  'apps/portal/assets/release-completion-v1.js','apps/portal/assets/index-data-resilience-v1.js','apps/portal/assets/index-editorial-order-v1.js',
  'apps/portal/assets/newsroom-live-v1.js','apps/portal/assets/public-market-live-v1.js','apps/portal/assets/market-centre-data.js',
  'apps/portal/assets/editorial/transparent-governance.svg','apps/portal/assets/editorial/ai-infrastructure.svg','apps/portal/assets/editorial/cyber-resilience.svg','apps/portal/assets/editorial/market-information.svg','apps/portal/assets/editorial/responsible-automation.svg',
  'workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','workers/gnk-asg-direct-operator/src/index-unified-auth-v20.js','workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js',
  'workers/gnk-asg-direct-operator/src/news-auto-publication-v1.js','workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js',
  'workers/gnk-asg-direct-operator/src/email-logo-endpoint-v1.js','workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js',
  'workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js','workers/gnk-asg-direct-operator/src/email-brand-mime-safe-v2.js',
  'workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',
  'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-all-v1.js','workers/gnk-asg-direct-operator/src/mail-autoreply-profile-factory-v1.js',
  'workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','scripts/assert-production-news-fallback.mjs','scripts/test-final-release-v31.mjs'
];
for(const file of requiredFiles){if(!fs.existsSync(file)||!fs.statSync(file).size)throw new Error(`Missing required file: ${file}`)}

const tests=[
  'scripts/test-deploy-approval-guardrails.mjs',
  'scripts/test-index-runtime-ownership.mjs',
  'scripts/test-public-design-contract.mjs',
  'scripts/test-unified-shell-contract.mjs',
  'scripts/test-visible-menu-logo-content-v1.mjs',
  'scripts/test-final-release-v31.mjs',
  'scripts/test-contact-form-contract.mjs',
  'scripts/test-the-code-index-contract.mjs',
  'scripts/test-index-content-contract.mjs',
  'scripts/test-email-signature-contract.mjs',
  'scripts/test-mail-transport-guardrails.mjs',
  'scripts/test-email-mime-guardrails.mjs',
  'scripts/test-autoreply-guardrails.mjs',
  'scripts/test-autoreply-all-addresses.mjs',
  'scripts/test-news-queue-guardrails.mjs',
  'scripts/audit-public-portal-v1.mjs',
  'scripts/audit-worker-route-ownership.mjs',
  'scripts/test-data-fallback-contract.mjs'
];
for(const test of tests)run(test);

const publicAudit=JSON.parse(fs.readFileSync('artifacts/public-portal-audit.json','utf8'));
const routeAudit=JSON.parse(fs.readFileSync('artifacts/worker-route-ownership.json','utf8'));
if(publicAudit.summary.errors)throw new Error(`Public portal audit has ${publicAudit.summary.errors} errors`);

console.log(JSON.stringify({
  ok:true,
  worker:'v31-over-v30-over-v29',
  routes:'route-less deploy config with canonical newsroom fallback',
  indexOwners:{scaffold:'release-completion-v1.js-v8',editorial:'index-editorial-order-v6.js-news-100',marketFallback:'index-data-resilience-v1.js-v2'},
  design:{runtime:'contrast-hardened-v1',menu:'v6-full-workers',logo:'64x66-everywhere',ticker:'index-only'},
  contact:{forms:['hr','en'],storage:'D1',transport:'EmailMessage',mail:['internal','acknowledgement'],liveSendingPerformed:false},
  theCode:{embeddedOn:['/','/en/'],initialScene:'final-countdown',playFlow:'first-to-final'},
  editorial:{visibleNews:100,archiveCap:2000,pruneOldest:1000,newTexts:5,newImages:5,collections:['publications','analyses','commentary']},
  mail:{transport:'shared-EmailMessage',canonicalPngLogo:true,inlineCidLogo:true,logoSize:'64x66',mailStudioComposerMinHeight:520,allDomainAutoreplies:true,testSendingEnabled:false},
  scheduler:'strict-opt-in-disabled',
  publicAudit:publicAudit.summary,
  routeAudit:routeAudit.summary
},null,2));
