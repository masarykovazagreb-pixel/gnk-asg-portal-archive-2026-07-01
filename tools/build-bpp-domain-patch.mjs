#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const repoRoot = process.cwd();
const outRoot = path.resolve(valueAfter('--out', 'reports/portal-quality-gate'), 'bpp-patched');
const manifest = [];
const canonicalUrl = 'https://bpp.is/';

const targetFiles = [
  'apps/portal/index.html',
  'apps/portal/en/index.html',
  'apps/portal/assets/bpp-group-asset.js',
  'apps/portal/assets/bpp-public-card.js',
  'apps/portal/scripts/generate_seo.py',
  'apps/portal/podijeli/bpp/index.html',
  'apps/portal/podijeli/bpp-kartica/index.html',
  'apps/portal/tests/market-centre.spec.js',
  'workers/gnk-asg-direct-operator/homepage-current-raw.html',
  'workers/gnk-asg-direct-operator/homepage-current-source-before-media-kit-preview.html',
  'workers/gnk-asg-direct-operator/homepage-origin-audit/homepage-live.html',
  'workers/gnk-asg-direct-operator/homepage-origin-audit/homepage-live.html.preview-media-kit-link.html',
  'workers/gnk-asg-direct-operator/homepage-preview-media-kit-safe.html'
];

function normalizeAliases(text) {
  return text
    .replace(/https?:\/\/(?:www\.)?(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)\.gnk-asg\.hr\/?/gi, canonicalUrl)
    .replace(/https?:\/\/(?:www\.)?gnk-asg\.hr\/(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)\/?/gi, canonicalUrl)
    .replace(/http:\/\/(?:www\.)?bpp\.is\/?/gi, canonicalUrl)
    .replace(/https:\/\/www\.bpp\.is\/?/gi, canonicalUrl);
}

function updateHomeDescriptions(text, english) {
  const oldHr = 'Službeni korporativni portal GNK ASG d.o.o. i GNK DINAMO Ltd. grupe: FY 2025 pokazatelji, globalna mreža, tržišta, vijesti i javni prikaz softverskog rješenja Bitcoin Payment Processor razvijenog za grupu.';
  const newHr = 'Službeni korporativni portal GNK ASG d.o.o. i GNK DINAMO Ltd. grupe: FY 2025 pokazatelji, globalna mreža, tržišta, vijesti i javni prikaz softverskog rješenja Bitcoin Payment Processor na službenoj domeni bpp.is, razvijenog za grupu.';
  const oldEn = 'Official corporate portal for GNK ASG d.o.o. and the GNK DINAMO Ltd. group: FY 2025 indicators, global network, markets, news and a public overview of the Bitcoin Payment Processor software solution developed for the group.';
  const newEn = 'Official corporate portal for GNK ASG d.o.o. and the GNK DINAMO Ltd. group: FY 2025 indicators, global network, markets, news and a public overview of the Bitcoin Payment Processor software solution at the official domain bpp.is, developed for the group.';
  text = text.split(oldHr).join(newHr).split(oldEn).join(newEn);

  if (!/name=["']bpp:canonical-domain["']/i.test(text)) {
    const marker = english
      ? '<meta name="bpp:canonical-domain" content="bpp.is">\n  <link rel="authoritative" href="https://bpp.is/">\n  '
      : '<meta name="bpp:canonical-domain" content="bpp.is">\n  <link rel="authoritative" href="https://bpp.is/">\n  ';
    text = text.replace(/(<meta\s+name=["']description["'][^>]*>)/i, `$1\n  ${marker}`);
  }

  if (!/class=["'][^"']*gnk-asg-final-bpp/i.test(text)) {
    const profile = english
      ? /(<a href="https:\/\/gnk-asg\.hr\/en\/#o-nama">Profile<\/a>)/i
      : /(<a href="https:\/\/gnk-asg\.hr\/#o-nama">Profil<\/a>)/i;
    text = text.replace(profile, `$1\n    <a class="gnk-asg-final-bpp" href="https://bpp.is/" target="_blank" rel="noopener noreferrer">BPP.IS</a>`);
  }
  return text;
}

function transform(file, input) {
  let text = normalizeAliases(input);

  if (file === 'apps/portal/index.html') text = updateHomeDescriptions(text, false);
  if (file === 'apps/portal/en/index.html') text = updateHomeDescriptions(text, true);

  if (file.endsWith('bpp-group-asset.js')) {
    text = text
      .replace(/aria-label="Bitcoin Payment Processor"/g, 'aria-label="Bitcoin Payment Processor — bpp.is"')
      .replace(/<h3>Bitcoin Payment Processor<\/h3>/g, '<h3>Bitcoin Payment Processor — bpp.is</h3>')
      .replace(/rel="noopener">Open bpp\.is/g, 'rel="noopener noreferrer">Open bpp.is')
      .replace(/rel="noopener">Otvori bpp\.is/g, 'rel="noopener noreferrer">Otvori bpp.is');
  }

  if (file.endsWith('bpp-public-card.js')) {
    text = text
      .replace(/title:'Bitcoin Payment Processor'/g, "title:'Bitcoin Payment Processor — bpp.is'")
      .replace(/rel="noopener">/g, 'rel="noopener noreferrer">');
  }

  if (file.endsWith('generate_seo.py')) {
    text = text
      .replace(/Bitcoin Payment Processor razvijenog za grupu\./g, 'Bitcoin Payment Processor na službenoj domeni bpp.is, razvijenog za grupu.')
      .replace(/Bitcoin Payment Processor software solution developed for the group\./g, 'Bitcoin Payment Processor software solution at the official domain bpp.is, developed for the group.');
  }

  if (file.includes('/podijeli/bpp/')) {
    text = text.replace(/programskog rješenja Bitcoin Payment Processor koje/g, 'programskog rješenja Bitcoin Payment Processor na službenoj domeni bpp.is koje');
  }

  if (file.includes('/podijeli/bpp-kartica/')) {
    text = text.replace(/Bitcoin Payment Processor(?![^<]{0,100}bpp\.is)/g, 'Bitcoin Payment Processor — bpp.is');
  }

  if (file.endsWith('market-centre.spec.js')) {
    text = text.replace(/bpp: 'Bitcoin Payment Processor'/g, "bpp: 'Bitcoin Payment Processor — bpp.is'");
  }

  if (file.startsWith('workers/')) {
    text = updateHomeDescriptions(text, false);
  }

  return text;
}

function savePatched(file, original, patched) {
  if (patched === original) return;
  const destination = path.join(outRoot, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, patched, 'utf8');
  manifest.push({ path: file, bytes: Buffer.byteLength(patched, 'utf8') });
}

for (const file of targetFiles) {
  const source = path.join(repoRoot, file);
  if (!fs.existsSync(source)) continue;
  const original = fs.readFileSync(source, 'utf8');
  savePatched(file, original, transform(file, original));
}

const contract = `${JSON.stringify({
  schemaVersion: 1,
  product: 'Bitcoin Payment Processor',
  shortName: 'BPP',
  canonicalHost: 'bpp.is',
  canonicalUrl,
  displayDomain: 'BPP.IS',
  frontend: { publicUrl: canonicalUrl, label: 'bpp.is' },
  backend: { canonicalUrl, host: 'bpp.is' }
}, null, 2)}\n`;
savePatched('contracts/bpp-domain.json', '', contract);

const moduleText = `export const BPP_PRODUCT_NAME = 'Bitcoin Payment Processor';\nexport const BPP_CANONICAL_HOST = 'bpp.is';\nexport const BPP_CANONICAL_URL = 'https://bpp.is/';\nexport const BPP_DISPLAY_DOMAIN = 'BPP.IS';\n`;
savePatched('packages/config/bpp-domain.mjs', '', moduleText);

fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), canonicalUrl, files: manifest }, null, 2)}\n`, 'utf8');
console.log(`BPP patch package: ${manifest.length} file(s) prepared in ${outRoot}`);
