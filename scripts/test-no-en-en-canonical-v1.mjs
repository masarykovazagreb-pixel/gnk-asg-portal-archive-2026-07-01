import fs from 'node:fs';
import path from 'node:path';

// Repository-wide guardrail: every static EN page must expose a single /en/ prefix.
const root = path.resolve('apps/portal/en');
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (html.includes('https://gnk-asg.hr/en/en/')) {
        violations.push(path.relative(process.cwd(), full));
      }
    }
  }
}

walk(root);

if (violations.length) {
  console.error('Invalid /en/en/ canonical or metadata URLs detected:');
  for (const file of violations) console.error(`- ${file}`);
  process.exit(1);
}

console.log('No invalid /en/en/ canonical or metadata URLs detected.');
