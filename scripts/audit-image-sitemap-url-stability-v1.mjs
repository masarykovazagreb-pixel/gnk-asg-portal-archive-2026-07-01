#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAP = path.join(PORTAL, 'image-sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { imageUrlsChecked: 0, insecureUrls: 0, unstableUrls: 0, malformedUrls: 0, unsupportedExtensions: 0, sameOriginAssetsChecked: 0, missingAssets: 0 };

const decodeXml = value => String(value || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
const supportedExt = pathname => /\.(?:jpe?g|png|webp|gif)$/i.test(pathname);

if (!fs.existsSync(SITEMAP)) {
  console.error('image-sitemap.xml is missing.');
  process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
const imageLocs = [...xml.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)].map(m => decodeXml(m[1]));
for (const raw of imageLocs) {
  stats.imageUrlsChecked++;
  let url;
  try { url = new URL(raw); }
  catch {
    stats.malformedUrls++;
    failures.push(`Malformed image sitemap URL: ${raw}`);
    continue;
  }
  if (url.protocol !== 'https:') {
    stats.insecureUrls++;
    failures.push(`Image sitemap URL must use HTTPS: ${raw}`);
  }
  if (url.search || url.hash) {
    stats.unstableUrls++;
    failures.push(`Image sitemap URL must be a stable canonical asset reference without query/hash: ${raw}`);
  }
  if (!supportedExt(url.pathname)) {
    stats.unsupportedExtensions++;
    warnings.push(`Image sitemap URL has an extension not covered by the local MIME contract: ${raw}`);
  }
  if (url.origin === ORIGIN) {
    stats.sameOriginAssetsChecked++;
    const file = path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\//, ''));
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      stats.missingAssets++;
      failures.push(`Stable same-origin image sitemap URL does not resolve to a repository asset: ${raw}`);
    }
  }
}
if (!imageLocs.length) failures.push('image-sitemap.xml contains no image:loc entries.');

const report = { version: 'GNK_ASG_IMAGE_SITEMAP_URL_STABILITY_V1', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'image-sitemap-url-stability');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
