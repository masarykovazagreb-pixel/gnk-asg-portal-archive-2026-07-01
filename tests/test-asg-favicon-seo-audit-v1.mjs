#!/usr/bin/env node
// Fixture-based regression tests. No network, production modifications or deploy.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo=join(dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(join(tmpdir(),'asg-seo-audit-'));
const save=(rel,data)=>{const dest=join(temp,rel);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);};
try {
  save('apps/shared/brand/favicon.svg',readFileSync(join(repo,'apps/shared/brand/favicon.svg'),'utf8'));
  const favicon=readFileSync(join(repo,'apps/shared/brand/favicon.svg'),'utf8');
  save('apps/portal/assets/favicon.svg',favicon);
  save('apps/sites/site/test-hr/assets/favicon.svg',favicon);
  const head='<title>Test ASG</title><meta name="description" content="Reliable human-readable summary"><link rel="canonical" href="https://example.com/"><meta property="og:title" content="Test ASG">';
  const icon='<link rel="icon" href="/assets/favicon.svg">';
  save('apps/portal/index.html',`<html><head>${head}${icon}<script type="application/ld+json">{}</script></head><body><a href="/about/">About</a></body></html>`);
  save('apps/sites/site/test-hr/index.html',`<html><head>${head}<link rel="icon" href="assets/favicon.svg"></head><body></body></html>`);
  save('apps/portal/private/index.html',`<html><head>${icon}<meta name="robots" content="noindex,nofollow"></head><body></body></html>`);
  save('apps/portal/broken/index.html','<html><head><title>Broken</title></head><body></body></html>');
  const script='scripts/audit-asg-favicon-seo-v1.mjs';
  save(script,readFileSync(join(repo,script),'utf8'));
  const run=spawnSync(process.execPath,[join(temp,script)],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout);
  assert.equal(result.stats.pages,4);
  assert.equal(result.excludedSeoPages,1);
  assert.equal(result.stats.faviconMatches,3);
  assert.equal(result.issueCounts['favicon missing'],1);
  assert.equal(result.issueCounts['meta description missing'],1);
  const strict=spawnSync(process.execPath,[join(temp,script),'--strict'],{encoding:'utf8'});
  assert.equal(strict.status,1,'strict mode must fail on real inconsistencies');
  console.log('PASS: canonical ASG icon, nested edition, noindex exclusion, issue counting and strict mode');
} finally {rmSync(temp,{recursive:true,force:true});}
