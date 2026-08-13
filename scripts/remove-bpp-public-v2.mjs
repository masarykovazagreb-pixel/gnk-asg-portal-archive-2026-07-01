// GNK ASG — deterministic public-source cleanup for retired BPP.IS references.
// Scope is intentionally narrow: public index.html files only. Protected/admin/mail
// surfaces are excluded. The sanitizer removes the retired BPP.IS brand/domain from
// <head> metadata/schema and removes direct public anchors to bpp.is. It does NOT
// delete generic educational discussion of bitcoin payment processing in article body.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'apps/portal';
const SKIP = new Set([
  'admin','admin-center','control','automation-status','webmail','mail-studio',
  'campaign-mailer','email-status','worker-ops','operator-dashboard',
  'digital-headquarters','media-registration-admin','podijeli','api','assets','data','__preview'
]);

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let st;
    try { st = statSync(path); } catch { continue; }
    if (st.isDirectory()) {
      const rel = relative(ROOT, path).replaceAll('\\', '/');
      const parts = rel.split('/');
      if (parts[0] && SKIP.has(parts[0])) continue;
      if (parts[0] === 'en' && parts[1] && SKIP.has(parts[1])) continue;
      walk(path);
    } else if (name === 'index.html') {
      files.push(path);
    }
  }
})(ROOT);

function cleanHead(head) {
  let out = head;

  // Remove the exact retired SoftwareApplication entity generated on legacy pages.
  out = out.replace(
    /,?\{"@type":"SoftwareApplication","@id":"https:\/\/gnk-asg\.hr\/#bitcoin-payment-processor"[\s\S]*?,"image":"https:\/\/gnk-asg\.hr\/assets\/share-bpp\.png"\}/g,
    ''
  );

  // Remove graph references to the retired entity.
  out = out.replace(/,?\{"@id":"https:\/\/gnk-asg\.hr\/#bitcoin-payment-processor"\}/g, '');

  // Remove exact brand/domain tokens from metadata and JSON-LD string values.
  out = out
    .replace(/,\s*Bitcoin Payment Processor/gi, '')
    .replace(/\s+and\s+the\s+Bitcoin Payment Processor/gi, '')
    .replace(/\s+and\s+Bitcoin Payment Processor/gi, '')
    .replace(/\s+i\s+Bitcoin Payment Processor/gi, '')
    .replace(/,\s*bpp\.is/gi, '')
    .replace(/https?:\/\/(?:www\.)?bpp\.is\/?/gi, '')
    .replace(/BPP\.IS/gi, '')
    .replace(/#bitcoin-payment-processor/gi, '');

  return out;
}

let changed = 0;
const residuals = [];
const forbidden = [
  /bpp\.is/i,
  /https?:\/\/(?:www\.)?bpp\.is/i,
  /#bitcoin-payment-processor/i
];

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const original = html;

  html = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, cleanHead);

  // Direct public links are removed as complete anchors, including their label.
  html = html.replace(
    /<a\b[^>]*href=["']https?:\/\/(?:www\.)?bpp\.is\/?[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    ''
  );

  if (html !== original) {
    writeFileSync(file, html);
    changed++;
  }

  for (const re of forbidden) {
    if (re.test(html)) {
      residuals.push({ file: relative(ROOT, file).replaceAll('\\', '/'), pattern: re.source });
      break;
    }
  }
}

console.log(JSON.stringify({ scanned: files.length, changed, residualCount: residuals.length, residuals }, null, 2));
if (residuals.length) {
  console.error('BPP public-source hard-zero gate failed.');
  process.exit(1);
}
