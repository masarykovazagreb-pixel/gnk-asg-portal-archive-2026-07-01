#!/usr/bin/env node
// Offline, read-only triage of GitHub Actions API run objects; never a live-uptime check.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CANONICAL_REPOSITORY = 'masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01';

export function summarizeRuns(input) {
  const runs = Array.isArray(input) ? input : input?.workflow_runs;
  if (!Array.isArray(runs)) throw new TypeError('Expected workflow_runs array');
  const groups = new Map();
  for (const run of runs) {
    const repository = run?.repository?.full_name;
    if (!run) throw new TypeError('Run must be an object');
    const workflow = run.path || run.workflow_id;
    if (!repository || !workflow || !/^[a-f0-9]{40}$/i.test(run.head_sha || '') ||
        !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) {
      throw new TypeError('Run requires repository, workflow, full SHA, id and run_attempt');
    }
    const key = JSON.stringify([repository, workflow, run.head_sha]);
    const group = groups.get(key) || { repository, workflow, sha: run.head_sha, attempts: new Map() };
    // API pages may repeat the same run/attempt. A newer attempt must not inherit an old failure.
    const previous = group.attempts.get(run.id);
    if (!previous || previous.run_attempt < run.run_attempt ||
        (previous.run_attempt === run.run_attempt && Date.parse(previous.updated_at) < Date.parse(run.updated_at))) {
      group.attempts.set(run.id, run);
    }
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const attempts = [...group.attempts.values()];
    const latest = attempts.sort((a, b) => b.id - a.id)[0];
    let status = 'unknown';
    if (['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(latest.status)) status = 'pending';
    else if (latest.status !== 'completed') status = 'unknown';
    else if (latest.conclusion === 'success') status = 'workflow_success';
    else if (latest.conclusion === 'failure') status = 'workflow_failure';
    else if (latest.conclusion === 'startup_failure') status = 'startup_failure';
    else if (['cancelled', 'skipped', 'neutral', 'timed_out', 'action_required', 'stale'].includes(latest.conclusion)) status = latest.conclusion;
    return {
      repository: group.repository, workflow: group.workflow, sha: group.sha,
      canonical: group.repository === CANONICAL_REPOSITORY,
      status, distinctRuns: attempts.length, latestRunId: latest.id, latestAttempt: latest.run_attempt,
      url: `https://github.com/${group.repository}/actions/runs/${latest.id}`,
      productionStatus: 'not_established', testStatus: 'not_established',
    };
  }).sort((a, b) => Number(b.canonical) - Number(a.canonical) || b.latestRunId - a.latestRunId);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const input = JSON.parse(readFileSync(process.argv[2] || 0, 'utf8'));
    console.log(JSON.stringify({
      notice: 'Workflow results are not test or production availability evidence. Pagination coverage must be checked separately.',
      groups: summarizeRuns(input),
    }, null, 2));
  } catch (error) {
    console.error(`CI evidence unavailable: ${error.message}`);
    process.exitCode = 1;
  }
}
