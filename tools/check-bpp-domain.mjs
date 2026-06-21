#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const canonical = 'https://bpp.is/';
const allowedHost = 'bpp.is';
const extensions = new Set(['.html','.js','.mjs','.ts','.json','.md','.txt','.xml','.yml','.yaml','.css','.py','.ps1']);
const skipped = new Set(['.git','node_modules','dist','build','.wrangler','reports','artifacts']);
const files = [];
const issues = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (entry.isDirectory() && skipped.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
}

walk(root);

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const mentionsProduct = /Bitcoin Payment Processor/i.test(text);
  const mentionsDomain = /bpp\.is/i.test(text);

  if (mentionsProduct && !mentionsDomain) {
    issues.push({ file:path.relative(root,file).replaceAll('\\','/'), code:'BPP_DOMAIN_MISSING' });
  }

  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    try {
      const url = new URL(match[0]);
      const host = url.hostname.toLowerCase();
      const looksLikeBpp = host.startsWith('bpp.') || host.includes('bitcoinpaymentprocessor') || host.includes('bitcoin-payment-processor');
      if (looksLikeBpp && host !== allowedHost) {
        issues.push({ file:path.relative(root,file).replaceAll('\\','/'), code:'NON_CANONICAL_BPP_DOMAIN', value:match[0] });
      }
    } catch {}
  }
}

fs.mkdirSync(path.join(root,'reports','bpp-domain'), { recursive:true });
fs.writeFileSync(path.join(root,'reports','bpp-domain','report.json'), JSON.stringify({ canonical, scannedFiles:files.length, issues }, null, 2) + '\n');
console.log(`BPP domain check: ${issues.length} issue(s); canonical ${canonical}`);
if (issues.length) process.exit(1);
