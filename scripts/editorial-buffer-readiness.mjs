#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'apps/portal/data/editorial_buffer_2026-08.json');
const policyPath = path.join(root, 'apps/portal/data/publishing_policy.json');
const strict = process.argv.includes('--strict');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function words(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`~\[\](){}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const expectedDays = 24;
const requiredTypes = ['publication', 'analysis', 'comment'];

if (!manifest.manual_approval_required || manifest.silence_is_approval) {
  fail('manual approval guardrail is not preserved');
}
if (!Array.isArray(manifest.days) || manifest.days.length !== expectedDays) {
  fail(`expected ${expectedDays} calendar days, found ${manifest.days?.length ?? 0}`);
}

let total = 0;
let contentPresent = 0;
let wordReady = 0;
let approved = 0;
let metadataReady = 0;
const missing = [];
const titleSet = new Set();

for (const day of manifest.days || []) {
  for (const type of requiredTypes) {
    total += 1;
    const slot = day[type];
    if (!slot) {
      missing.push(`${day.date}:${type}:missing-slot`);
      continue;
    }
    if (!slot.title || titleSet.has(slot.title)) {
      missing.push(`${day.date}:${type}:missing-or-duplicate-title`);
    } else {
      titleSet.add(slot.title);
    }
    if (slot.approval_status === 'approved') approved += 1;
    if (!slot.content_path) {
      missing.push(`${day.date}:${type}:content-not-materialized`);
      continue;
    }
    const full = path.join(root, slot.content_path);
    if (!fs.existsSync(full)) {
      missing.push(`${day.date}:${type}:content-path-not-found:${slot.content_path}`);
      continue;
    }
    contentPresent += 1;
    const body = fs.readFileSync(full, 'utf8');
    const measured = words(body);
    const minimum = policy.content_type_word_policy?.[type]?.hard_min;
    if (Number.isFinite(minimum) && measured >= minimum) wordReady += 1;
    else missing.push(`${day.date}:${type}:words=${measured}:required=${minimum ?? 'unknown'}`);

    const requiredMetadata = [
      'seo_title', 'meta_description', 'canonical_url', 'article_schema_or_jsonld',
      'h1_h2_structure', 'internal_links', 'entity_links', 'image_plan',
      'alt_text', 'byline', 'publication_date'
    ];
    const md = slot.metadata || {};
    if (requiredMetadata.every((key) => Boolean(md[key]))) metadataReady += 1;
    else missing.push(`${day.date}:${type}:metadata-incomplete`);
  }
}

const pct = (n) => total ? Math.round((n / total) * 1000) / 10 : 0;
const result = {
  period: `${manifest.period?.start}..${manifest.period?.end}`,
  total_slots: total,
  calendar_slots_present: total - missing.filter((x) => x.endsWith('missing-slot')).length,
  unique_titles: titleSet.size,
  content_materialized: contentPresent,
  content_materialized_pct: pct(contentPresent),
  word_policy_ready: wordReady,
  word_policy_ready_pct: pct(wordReady),
  metadata_ready: metadataReady,
  metadata_ready_pct: pct(metadataReady),
  explicitly_approved: approved,
  approval_pct: pct(approved),
  manual_approval_required: manifest.manual_approval_required,
  ready_for_100_percent: contentPresent === total && wordReady === total && metadataReady === total && approved === total,
  blockers: missing.slice(0, 40),
  blocker_count: missing.length
};

console.log(JSON.stringify(result, null, 2));

if (strict && !result.ready_for_100_percent) {
  fail('editorial buffer is not at truthful 100% readiness');
}
