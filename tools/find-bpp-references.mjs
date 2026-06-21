#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const roots = ['apps', 'workers', 'packages', 'contracts', 'docs'];
const extensions = new Set(['.html','.htm','.css','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.jsonc','.md','.txt','.yml','.yaml','.toml','.xml','.svg','.py','.ps1','.sh','.sql']);
const skip = new Set(['.git','node_modules','dist','build','.wrangler','.cache','reports','artifacts','coverage','vendor']);
const pattern = /bpp\.is|bitcoin\s+payment\s+processor|online\s+currency\s+exchange\s*\/\s*payment\s+processor|(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)\.gnk-asg\.hr|gnk-asg\.hr\/(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)/i;
const matches = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skip.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) inspect(file);
  }
}

function inspect(file) {
  let text;
  try {
    if (fs.statSync(file).size > 8 * 1024 * 1024) return;
    text = fs.readFileSync(file, 'utf8');
  } catch { return; }
  if (text.includes('\u0000')) return;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (pattern.test(line)) matches.push({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1, text: line.trim().slice(0, 500) });
  });
}

for (const item of roots) walk(path.join(root, item));
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), count: matches.length, matches }, null, 2));
