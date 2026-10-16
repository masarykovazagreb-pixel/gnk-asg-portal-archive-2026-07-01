#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const reportPath = 'reports/aktual-weekly-candidate-options.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const curation = JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly-curation.json', 'utf8'));
const current = JSON.parse(fs.readFileSync('apps/portal/data/aktual-weekly.json', 'utf8'));
const reviewMarkdown = fs.readFileSync(report.review_document, 'utf8');
const curatedUrls = new Set([
  ...(curation.items || []).map((item) => item.url),
  ...(current.sections || []).flatMap((section) => (section.items || []).map((item) => item.url)),
].filter(Boolean));
const candidates = (report.sections || []).flatMap((section) => section.candidates || []);
const urls = new Set();
const failures = [];

if (report.version !== 'AKTUAL_WEEKLY_CANDIDATE_OPTIONS_V1') failures.push('Unexpected candidate report version');
if (report.issue_week !== curation.issue_week) failures.push('Candidate report does not match the current planned issue week');
if (report.generated_from !== 'apps/portal/data/news.json') failures.push('Candidate report does not identify its public feed registry');
if (report.candidate_count !== candidates.length) failures.push('Candidate count does not match section entries');
if (report.publish_policy !== 'Internal editorial shortlist only. Candidates are not approved, summarized for publication, or automatically posted.') {
  failures.push('Candidate report does not explicitly prohibit auto-publication');
}
if (reportPath.startsWith('apps/portal/') || !report.review_document?.startsWith('reports/')) failures.push('Internal candidate report must not be written into the public portal tree');
if (!reviewMarkdown.includes('not approved or published') || !reviewMarkdown.includes('Human review required')) failures.push('Human-review state is missing from the readable review document');
for (const candidate of candidates) {
  if (!reviewMarkdown.includes(candidate.url)) failures.push('Readable review document is missing a candidate source URL');
}

for (const section of report.sections || []) {
  if (section.candidates.length > 3) failures.push(`${section.id}: more than three candidates`);
  const publishers = new Set();
  for (const item of section.candidates) {
    let url;
    try { url = new URL(item.url); } catch { failures.push(`${section.id}: invalid source URL`); continue; }
    if (url.protocol !== 'https:' || url.username || url.password) failures.push(`${section.id}: source URL is not safe HTTPS`);
    if (curatedUrls.has(item.url)) failures.push(`${section.id}: candidate duplicates an already curated story`);
    if (urls.has(item.url)) failures.push(`${section.id}: candidate is duplicated in another section`);
    urls.add(item.url);
    if (!item.title || !item.source || !item.published_at) failures.push(`${section.id}: candidate is missing source metadata`);
    if (item.review_status !== 'candidate_not_approved' || item.article_review_required !== true) failures.push(`${section.id}: candidate is not clearly marked for human review`);
    if ('summary' in item || 'description' in item || 'image' in item || 'imageUrl' in item) failures.push(`${section.id}: candidate includes source copy or image metadata`);
    if (!String(item.image_policy || '').includes('documented rights')) failures.push(`${section.id}: image-rights policy is missing`);
    if (publishers.has(item.source)) failures.push(`${section.id}: publisher is repeated within a section`);
    publishers.add(item.source);
    const published = new Date(item.published_at).getTime();
    if (!Number.isFinite(published) || published < new Date(report.selection_window.from).getTime()
      || published > new Date(report.selection_window.to).getTime()) failures.push(`${section.id}: candidate is outside the selection window`);
  }
}

assert.equal(failures.length, 0, failures.join('\n') || 'Candidate-options safety check failed');
console.log(JSON.stringify({
  ok: true,
  issue_week: report.issue_week,
  candidate_count: candidates.length,
  distinct_publishers: report.distinct_candidate_publishers,
  coverage_gaps: (report.coverage_gaps || []).map((gap) => gap.id),
  internalOnly: true,
  requiresHumanReview: true,
}, null, 2));
