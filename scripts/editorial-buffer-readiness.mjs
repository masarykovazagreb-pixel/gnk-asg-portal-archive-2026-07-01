#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'apps/portal/data/editorial_buffer_2026-08.json');
const policyPath = path.join(root, 'apps/portal/data/publishing_policy.json');
const editorialDir = path.join(root, 'apps/portal/content/editorial');
const strict = process.argv.includes('--strict');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function words(text) {
  return text
    .replace(/^---[\s\S]*?---/m, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`~\[\](){}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const out = {};
  let listKey = null;
  for (const raw of lines) {
    const list = raw.match(/^\s+-\s+(.+)$/);
    if (list && listKey) {
      out[listKey] ||= [];
      out[listKey].push(list[1].replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (!value) {
      out[key] = [];
      listKey = key;
      continue;
    }
    listKey = null;
    if (value === 'true') out[key] = true;
    else if (value === 'false') out[key] = false;
    else out[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function discoverContentPath(date, type) {
  if (!fs.existsSync(editorialDir)) return { path: null, candidates: [] };
  const prefix = `${date}-${type}-`;
  const candidates = fs.readdirSync(editorialDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.md'))
    .sort()
    .map((name) => path.posix.join('apps/portal/content/editorial', name));
  return { path: candidates.length === 1 ? candidates[0] : null, candidates };
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
let autoDiscovered = 0;
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

    let contentPath = slot.content_path || null;
    if (!contentPath) {
      const discovered = discoverContentPath(day.date, type);
      if (discovered.path) {
        contentPath = discovered.path;
        autoDiscovered += 1;
      } else if (discovered.candidates.length > 1) {
        missing.push(`${day.date}:${type}:ambiguous-content-candidates=${discovered.candidates.length}`);
        continue;
      } else {
        missing.push(`${day.date}:${type}:content-not-materialized`);
        continue;
      }
    }

    const full = path.join(root, contentPath);
    if (!fs.existsSync(full)) {
      missing.push(`${day.date}:${type}:content-path-not-found:${contentPath}`);
      continue;
    }
    contentPresent += 1;
    const body = fs.readFileSync(full, 'utf8');
    const measured = words(body);
    const minimum = policy.content_type_word_policy?.[type]?.hard_min;
    if (Number.isFinite(minimum) && measured >= minimum) wordReady += 1;
    else missing.push(`${day.date}:${type}:words=${measured}:required=${minimum ?? 'unknown'}`);

    const frontmatter = parseFrontmatter(body);
    const requiredMetadata = [
      'seo_title', 'meta_description', 'canonical_url', 'article_schema_or_jsonld',
      'h1_h2_structure', 'internal_links', 'entity_links', 'image_plan',
      'alt_text', 'byline', 'publication_date'
    ];
    const md = { ...frontmatter, ...(slot.metadata || {}) };
    if (requiredMetadata.every((key) => Boolean(md[key]) && (!Array.isArray(md[key]) || md[key].length > 0))) {
      metadataReady += 1;
    } else {
      missing.push(`${day.date}:${type}:metadata-incomplete`);
    }
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
  content_auto_discovered: autoDiscovered,
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
