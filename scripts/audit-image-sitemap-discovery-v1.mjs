#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr';
const IMAGE_SITEMAPS = [
  'image-sitemap.xml',
  'world-topics-image-sitemap.xml'
];
const failures = [];
const stats = {
  sitemapFilesChecked: 0,
  sitemapIndexEntriesChecked: 0,
  robotsEntriesChecked: 0,
  missingFiles: 0,
  missingIndexEntries: 0,
  missingRobotsEntries: 0,
  duplicateIndexEntries: 0,
  duplicateRobotsEntries: 0
};

const indexFile = path.join(PORTAL, 'sitemap-index.xml');
const robotsFile = path.join(PORTAL, 'robots.txt');
if (!fs.existsSync(indexFile)) failures.push('sitemap-index.xml is missing');
if (!fs.existsSync(robotsFile)) failures.push('robots.txt is missing');

const indexXml = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
const robots = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, 'utf8') : '';
const indexLocs = [...indexXml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].trim());
const robotSitemaps = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map(m => m[1].trim());

for (const name of IMAGE_SITEMAPS) {
  const local = path.join(PORTAL, name);
  const url = `${ORIGIN}/${name}`;
  stats.sitemapFilesChecked++;
  if (!fs.existsSync(local) || !fs.statSync(local).isFile()) {
    stats.missingFiles++;
    failures.push(`${name}: expected image sitemap file is missing from apps/portal`);
  }

  const indexCount = indexLocs.filter(value => value === url).length;
  stats.sitemapIndexEntriesChecked++;
  if (indexCount === 0) {
    stats.missingIndexEntries++;
    failures.push(`${name}: ${url} is not registered in sitemap-index.xml`);
  } else if (indexCount > 1) {
    stats.duplicateIndexEntries++;
    failures.push(`${name}: ${url} appears ${indexCount} times in sitemap-index.xml; discovery registration must be unique`);
  }

  const robotsCount = robotSitemaps.filter(value => value === url).length;
  stats.robotsEntriesChecked++;
  if (robotsCount === 0) {
    stats.missingRobotsEntries++;
    failures.push(`${name}: ${url} is not advertised by robots.txt`);
  } else if (robotsCount > 1) {
    stats.duplicateRobotsEntries++;
    failures.push(`${name}: ${url} appears ${robotsCount} times in robots.txt; discovery registration must be unique`);
  }
}

const report = {
  version: 'GNK_ASG_IMAGE_SITEMAP_DISCOVERY_V1',
  ok: failures.length === 0,
  stats,
  failures
};
const out = path.join(ROOT, 'artifacts', 'image-sitemap-discovery');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
