import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/portal/en');
const write = process.argv.includes('--write');
const changed = [];

function canonicalFor(file) {
  const relDir = path.relative(path.resolve('apps/portal'), path.dirname(file)).split(path.sep).join('/');
  return `https://gnk-asg.hr/${relDir}/`;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') {
      const current = fs.readFileSync(full, 'utf8');
      if (!current.includes('https://gnk-asg.hr/en/en/')) continue;
      const expected = canonicalFor(full);
      const next = current.replaceAll(/https:\/\/gnk-asg\.hr\/en\/en\/[^"'<\\\s]+\//g, expected);
      if (next !== current) {
        changed.push(path.relative(process.cwd(), full));
        if (write) fs.writeFileSync(full, next);
      }
    }
  }
}

walk(root);

if (!changed.length) {
  console.log('No /en/en/ metadata URLs require correction.');
  process.exit(0);
}

for (const file of changed) console.log(`${write ? 'Fixed' : 'Would fix'}: ${file}`);
if (!write) {
  console.error('Run with --write and commit the corrected static pages.');
  process.exit(1);
}
