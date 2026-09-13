#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = {
  htmlFiles: 0,
  pictures: 0,
  sources: 0,
  missingFallback: 0,
  invalidSource: 0,
  missingLocalCandidate: 0,
  typeMismatch: 0,
  mixedDescriptorFamilies: 0,
  invalidSizesUsage: 0,
};

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const attr = (tag, n) => tag.match(new RegExp(`\\s${n}=["']([^"']*)["']`, 'i'))?.[1]?.trim() || '';
const hasAttr = (tag, n) => new RegExp(`\\s${n}(?:\\s*=|\\s|>)`, 'i').test(`${tag}>`);
const exists = u => {
  if (!u || /^(?:https?:|data:|blob:|\/\/)/i.test(u)) return true;
  const clean = u.split(/[?#]/)[0].replace(/^\/+/, '');
  return fs.existsSync(path.join(PORTAL, clean));
};
const ext = u => path.extname((u || '').split(/[?#]/)[0]).toLowerCase();
const typeOk = (t, e) => !t || ({
  '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml'
}[e] === t.toLowerCase());

for (const file of walk(PORTAL).filter(f => f.endsWith('.html'))) {
  stats.htmlFiles++;
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)) {
    stats.pictures++;
    const body = m[1];
    if (!/<img\b[^>]*>/i.test(body)) {
      stats.missingFallback++;
      failures.push(`${file}: <picture> missing <img> fallback`);
    }

    for (const sm of body.matchAll(/<source\b[^>]*>/gi)) {
      stats.sources++;
      const tag = sm[0];
      const srcset = attr(tag, 'srcset');
      const type = attr(tag, 'type');
      const sizesPresent = hasAttr(tag, 'sizes');
      const sizes = attr(tag, 'sizes');
      if (!srcset) {
        stats.invalidSource++;
        failures.push(`${file}: <source> missing srcset`);
        continue;
      }

      const families = new Set();
      for (const raw of srcset.split(',')) {
        const candidate = raw.trim();
        if (!candidate) continue;
        const [u, descriptor = ''] = candidate.split(/\s+/);
        if (!u) continue;
        if (/^\d+w$/.test(descriptor)) families.add('w');
        else if (descriptor === '' || /^(?:\d+(?:\.\d+)?|\.\d+)x$/.test(descriptor)) families.add('x');
        else {
          stats.invalidSource++;
          failures.push(`${file}: invalid <source> srcset descriptor ${descriptor} for ${u}`);
        }
        if (!exists(u)) {
          stats.missingLocalCandidate++;
          failures.push(`${file}: local <source> candidate missing: ${u}`);
        }
        if (!typeOk(type, ext(u))) {
          stats.typeMismatch++;
          failures.push(`${file}: source type ${type} mismatches ${u}`);
        }
      }

      if (families.size > 1) {
        stats.mixedDescriptorFamilies++;
        failures.push(`${file}: <source> srcset must not mix width and density/default descriptor families`);
      }
      if (families.has('w') && (!sizesPresent || !sizes)) {
        stats.invalidSizesUsage++;
        failures.push(`${file}: width-descriptor <source> srcset requires non-empty sizes`);
      }
      if (!families.has('w') && sizesPresent) {
        stats.invalidSizesUsage++;
        failures.push(`${file}: density/default <source> srcset must not declare sizes`);
      }
    }
  }
}

const report = {
  version: 'GNK_ASG_PICTURE_SOURCE_CONTRACT_V2',
  semantics: 'STATIC_RESPONSIVE_IMAGE_INTEGRITY_NOT_INDEXED_PROOF',
  ok: !failures.length,
  stats,
  failures
};
const out = path.join(ROOT, 'artifacts', 'picture-source-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
