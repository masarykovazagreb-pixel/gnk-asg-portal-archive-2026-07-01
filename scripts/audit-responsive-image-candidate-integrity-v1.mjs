import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = {
  htmlFiles: 0,
  images: 0,
  responsiveImages: 0,
  invalidCandidates: 0,
  duplicateCandidates: 0,
  missingSizes: 0,
  mixedDescriptorFamilies: 0,
  invalidSizesUsage: 0,
};

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const p = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(p) : [p];
});
const attr = (tag, name) => {
  const quoted = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1].trim();
  const bare = tag.match(new RegExp(`\\s${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.trim() || '';
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?:\\s*=|\\s|>)`, 'i').test(`${tag}>`);
const localExists = raw => {
  if (!raw || /^(https?:|data:|blob:|\/\/)/i.test(raw)) return true;
  const clean = raw.split(/[?#]/)[0];
  const candidate = clean.startsWith('/') ? path.join(PORTAL, clean.replace(/^\/+/, '')) : path.join(PORTAL, clean);
  return fs.existsSync(candidate);
};

for (const file of walk(PORTAL).filter(f => f.endsWith('.html'))) {
  stats.htmlFiles++;
  const rel = '/' + path.relative(PORTAL, file).replaceAll(path.sep, '/');
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    stats.images++;
    const tag = match[0];
    const srcset = attr(tag, 'srcset');
    if (!srcset) continue;
    stats.responsiveImages++;

    const sizesPresent = hasAttr(tag, 'sizes');
    const sizes = attr(tag, 'sizes');
    const seenUrls = new Set();
    const seenDescriptors = new Set();
    const descriptorFamilies = new Set();

    for (const rawCandidate of srcset.split(',')) {
      const candidate = rawCandidate.trim();
      if (!candidate) continue;
      const parts = candidate.split(/\s+/);
      if (parts.length < 1 || parts.length > 2) {
        stats.invalidCandidates++;
        failures.push(`${rel}: invalid srcset candidate "${candidate}"`);
        continue;
      }
      const [url, descriptor = ''] = parts;
      const widthDescriptor = /^\d+w$/.test(descriptor);
      const densityDescriptor = /^(?:\d+(?:\.\d+)?|\.\d+)x$/.test(descriptor);
      const validDescriptor = descriptor === '' || widthDescriptor || densityDescriptor;
      if (!validDescriptor) {
        stats.invalidCandidates++;
        failures.push(`${rel}: invalid srcset descriptor "${descriptor}" for ${url}`);
      } else if (widthDescriptor) {
        descriptorFamilies.add('w');
      } else {
        descriptorFamilies.add('x');
      }
      if (!localExists(url)) {
        stats.invalidCandidates++;
        failures.push(`${rel}: local srcset candidate does not materialize: ${url}`);
      }
      if (seenUrls.has(url) || (descriptor && seenDescriptors.has(descriptor))) {
        stats.duplicateCandidates++;
        failures.push(`${rel}: duplicate srcset URL or descriptor in "${candidate}"`);
      }
      seenUrls.add(url);
      if (descriptor) seenDescriptors.add(descriptor);
    }

    if (descriptorFamilies.size > 1) {
      stats.mixedDescriptorFamilies++;
      failures.push(`${rel}: srcset must not mix width (w) and density/default (x/1x) descriptor families`);
    }

    if (descriptorFamilies.has('w')) {
      if (!sizesPresent || !sizes) {
        stats.missingSizes++;
        failures.push(`${rel}: width-descriptor srcset must declare a non-empty sizes attribute`);
      }
    } else if (sizesPresent) {
      stats.invalidSizesUsage++;
      failures.push(`${rel}: sizes is only coherent with width-descriptor srcset candidates`);
    }
  }
}

const report = { version: 'GNK_ASG_RESPONSIVE_IMAGE_CANDIDATE_INTEGRITY_V2', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'responsive-image-candidate-integrity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
