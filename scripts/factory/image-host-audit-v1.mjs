#!/usr/bin/env node
// Diagnostika: ne dodaje hostove, ne preuzima slike i ne potvrđuje prava.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { allowedImageHosts } from '../../workers/gnk-asg-direct-operator/src/image-proxy-v1.js';

export function auditImageHosts(datasets, allowedHosts = allowedImageHosts()) {
  if (!Array.isArray(datasets) || !Array.isArray(allowedHosts)) throw new TypeError('Očekivani su popisi skupova i dopuštenih hostova');
  const allowed = new Set(allowedHosts.map(h => String(h).toLowerCase()));
  const missing = new Map();
  let invalid = 0, images = 0;
  for (const dataset of datasets) {
    const rows = Array.isArray(dataset?.data) ? dataset.data : dataset?.data?.items;
    if (!Array.isArray(rows)) throw new TypeError(`Neispravan skup: ${dataset?.name || '?'}`);
    for (const item of rows) {
      if (!item?.image) continue;
      images++;
      let url;
      try { url = new URL(item.image); } catch { invalid++; continue; }
      if (url.protocol !== 'https:' || url.username || url.password || url.port) { invalid++; continue; }
      const host = url.hostname.toLowerCase();
      if (allowed.has(host)) continue;
      if (!missing.has(host)) missing.set(host, { host, count: 0, datasets: new Set(), sources: new Set() });
      const entry = missing.get(host);
      entry.count++;
      entry.datasets.add(String(dataset.name));
      if (item.sourceName || item.source) entry.sources.add(String(item.sourceName || item.source));
    }
  }
  return {
    images, invalid,
    missing: [...missing.values()].sort((a, b) => a.host.localeCompare(b.host)).map(e => ({host:e.host, count:e.count, datasets:[...e.datasets].sort(), sources:[...e.sources].sort()})),
    note: 'Dijagnostika nije dozvola za uporabu slike ili proširenje proxyja.'
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Uporaba: node scripts/factory/image-host-audit-v1.mjs <JSON> [JSON ...]'); process.exit(2); }
  try {
    const datasets = files.map(file => ({name: path.basename(file), data: JSON.parse(fs.readFileSync(file, 'utf8'))}));
    const report = auditImageHosts(datasets);
    console.log(JSON.stringify(report, null, 2));
    if (report.invalid || report.missing.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
