#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-aktual-meta-audit-'));
const route = '/gnk-aktual/audit-fixture/';
const file = path.join(temp, 'apps/portal/gnk-aktual/audit-fixture/index.html');
const description = "There's a practical editorial note that preserves its author's wording while giving readers enough context to understand the AKTUAL MEDIA page and its subject.";
const canonical = `https://gnk-asg.hr${route}`;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.mkdirSync(path.join(temp, 'apps/portal/data'), { recursive: true });
fs.writeFileSync(path.join(temp, 'apps/portal/data/approved_mentions.json'), JSON.stringify({ approved_urls: [], approved_items: [] }));
fs.writeFileSync(file, `<!doctype html><html lang="hr"><head>
<title>AKTUAL MEDIA — apostrophe parser fixture</title>
<meta name="description" content="${description}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${canonical}">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/en/gnk-aktual/audit-fixture/">
<link rel="alternate" hreflang="x-default" href="${canonical}">
<meta property="og:title" content="AKTUAL MEDIA — apostrophe parser fixture">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://gnk-asg.hr/assets/test.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="keywords" content="editorial review">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","url":"${canonical}"}</script>
</head><body><main><h1>AKTUAL MEDIA — apostrophe parser fixture</h1></main></body></html>`);

try {
  const result = spawnSync(process.execPath, [
    path.resolve('scripts/audit-aktual-all-pages-v2.mjs'),
  ], { cwd: temp, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const reportPath = path.join(temp, 'artifacts/seo/aktual-all-pages-matrix-v2.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.counts.critical, 0);
  assert.equal(report.counts.description_review, 0);
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].description_length, description.length,
    'a straight apostrophe inside a double-quoted meta attribute must not truncate its parsed value');
  console.log(JSON.stringify({
    ok: true,
    apostropheSafeDescriptionLength: report.rows[0].description_length,
    critical: report.counts.critical,
    descriptionReview: report.counts.description_review,
  }, null, 2));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
