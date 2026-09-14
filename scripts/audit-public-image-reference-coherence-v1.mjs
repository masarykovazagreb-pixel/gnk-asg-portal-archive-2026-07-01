import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('apps/portal');
const OUT = path.resolve('artifacts/public-image-reference-coherence');
const REPORT = path.join(OUT, 'report.json');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function attrs(tag) {
  const m = new Map();
  for (const hit of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gis)) {
    m.set(hit[1].toLowerCase(), hit[3].trim());
  }
  return m;
}

function isUnsafeUrl(u) {
  const v = u.trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('//') || v.startsWith('data:') || v.startsWith('blob:') || v.startsWith('javascript:');
}

function localPathFor(u) {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean || /^https:\/\//i.test(clean) || /^mailto:/i.test(clean) || /^tel:/i.test(clean)) return null;
  const rel = clean.startsWith('/') ? clean.slice(1) : clean;
  return path.resolve(ROOT, rel);
}

function underRoot(p) {
  const rel = path.relative(ROOT, p);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const failures = [];
let checkedPages = 0;
let checkedRefs = 0;

for (const file of walk(ROOT)) {
  checkedPages += 1;
  const html = fs.readFileSync(file, 'utf8');
  const relFile = path.relative(process.cwd(), file);

  const refs = [];
  for (const hit of html.matchAll(/<img\b[^>]*>/gis)) {
    const a = attrs(hit[0]);
    if (a.get('src')) refs.push({ kind: 'img:src', url: a.get('src') });
    if (a.get('srcset')) {
      for (const candidate of a.get('srcset').split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) refs.push({ kind: 'img:srcset', url });
      }
    }
  }

  const meta = new Map();
  for (const hit of html.matchAll(/<meta\b[^>]*>/gis)) {
    const a = attrs(hit[0]);
    const key = (a.get('property') || a.get('name') || '').toLowerCase();
    if (key && a.get('content')) meta.set(key, a.get('content'));
  }

  for (const key of ['og:image', 'twitter:image']) {
    if (meta.get(key)) refs.push({ kind: key, url: meta.get(key) });
  }

  if (meta.get('og:image') && !meta.get('og:image:alt')) {
    failures.push({ file: relFile, class: 'social-image-alt', field: 'og:image:alt', message: 'og:image exists without og:image:alt' });
  }
  if (meta.get('twitter:image') && !meta.get('twitter:image:alt')) {
    failures.push({ file: relFile, class: 'social-image-alt', field: 'twitter:image:alt', message: 'twitter:image exists without twitter:image:alt' });
  }

  for (const ref of refs) {
    checkedRefs += 1;
    if (isUnsafeUrl(ref.url)) {
      failures.push({ file: relFile, class: 'image-url-scheme', kind: ref.kind, url: ref.url, message: 'Image reference must not use http, protocol-relative, data, blob or javascript schemes' });
      continue;
    }
    const local = localPathFor(ref.url);
    if (local) {
      if (!underRoot(local)) {
        failures.push({ file: relFile, class: 'image-path-boundary', kind: ref.kind, url: ref.url, message: 'Local image reference escapes apps/portal' });
      } else if (!fs.existsSync(local) || !fs.statSync(local).isFile()) {
        failures.push({ file: relFile, class: 'image-materialization', kind: ref.kind, url: ref.url, message: 'Local image reference does not materialize to a file' });
      }
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
const report = {
  version: 'PUBLIC_IMAGE_REFERENCE_COHERENCE_V1',
  checkedPages,
  checkedRefs,
  failureCount: failures.length,
  failures
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (failures.length) {
  console.error(`PUBLIC_IMAGE_REFERENCE_COHERENCE_FAIL count=${failures.length}`);
  process.exit(1);
}
console.log(`PUBLIC_IMAGE_REFERENCE_COHERENCE_OK pages=${checkedPages} refs=${checkedRefs}`);
