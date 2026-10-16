import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';

const usage = 'Usage: node scripts/check-editorial-prepublication-readiness-v1.mjs --candidate <json-path> [--as-of YYYY-MM-DD] [--strict]';
const args = new Map();
let strict = false;
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (key === '--help') {
    console.log(usage);
    process.exit(0);
  }
  if (key === '--strict') {
    strict = true;
    continue;
  }
  if (!['--candidate', '--as-of'].includes(key)) throw new Error(`Unknown option: ${key}\n${usage}`);
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}\n${usage}`);
  args.set(key, value);
  index += 1;
}
const candidatePath = args.get('--candidate');
if (!candidatePath) throw new Error(`A candidate JSON file is required.\n${usage}`);
const asOfDate = args.get('--as-of') || new Date().toISOString().slice(0, 10);
const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
if (!isValidDate(asOfDate)) throw new Error('--as-of must be a valid YYYY-MM-DD date.');
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const blockers = [];
const warnings = [];
const dateAge = (date) => Math.floor((Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
const validatePublicHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !isIP(url.hostname) && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};

if (typeof candidate.title !== 'string' || !candidate.title.trim()) blockers.push('A working title is required.');
if (!Array.isArray(candidate.sources) || candidate.sources.length === 0) {
  blockers.push('At least one source record is required.');
} else {
  const eligibleSources = candidate.sources.filter((source) => (
    source && source.primary === true && source.confirmed === true && validatePublicHttpsUrl(source.url)
    && isValidDate(source.checkedAt) && dateAge(source.checkedAt) >= 0 && dateAge(source.checkedAt) <= 30
  ));
  if (eligibleSources.length === 0) blockers.push('At least one primary HTTPS source must be confirmed and checked within the last 30 days.');
  candidate.sources.forEach((source, index) => {
    if (!source?.title || !source.url) blockers.push(`Source ${index + 1} needs a title and URL.`);
    if (source?.primary !== true) warnings.push(`Source ${index + 1} is not marked as primary.`);
    if (source?.confirmed !== true) warnings.push(`Source ${index + 1} is not confirmed by an editor.`);
    if (source?.checkedAt && isValidDate(source.checkedAt) && dateAge(source.checkedAt) > 30) warnings.push(`Source ${index + 1} is older than 30 days.`);
  });
}

if (!Array.isArray(candidate.visuals)) {
  blockers.push('Visual provenance must be supplied as an array (use an empty array when no visuals are used).');
} else {
  candidate.visuals.forEach((visual, index) => {
    if (typeof visual?.asset !== 'string' || !visual.asset.trim() || typeof visual?.alt !== 'string' || !visual.alt.trim()) blockers.push(`Visual ${index + 1} needs an asset reference and descriptive alt text.`);
    if (typeof visual?.creator !== 'string' || !visual.creator.trim() || typeof visual?.license !== 'string' || !visual.license.trim() || visual?.rightsConfirmed !== true) {
      blockers.push(`Visual ${index + 1} needs a named creator, license/rights basis and explicit rights confirmation.`);
    }
  });
}

const attribution = candidate.attribution;
if (!attribution || attribution.rolesChecked !== true || attribution.authorConfirmed !== true) {
  blockers.push('Author status and role separation must be explicitly confirmed by an editor.');
} else {
  const authorIsExplicit = attribution.author === null
    || (typeof attribution.author?.name === 'string' && attribution.author.name.trim());
  if (!authorIsExplicit) blockers.push('Author must be a named, verified author or explicitly null (no personal byline).');
  if (attribution.author && attribution.author.verified !== true) blockers.push('A personal author byline needs an affirmative verification flag.');
  if (typeof attribution.editor !== 'string' || !attribution.editor.trim()) blockers.push('A named editor is required.');
  if (typeof attribution.publisher !== 'string' || !attribution.publisher.trim()) blockers.push('A named publisher is required.');
}

const approval = candidate.editorialApproval;
if (!approval || approval.approved !== true || typeof approval.reviewer !== 'string' || !approval.reviewer.trim() || !isValidDate(approval.approvedAt)) {
  blockers.push('A separate human pre-publication approval with reviewer and date is required.');
} else if (dateAge(approval.approvedAt) < 0) {
  blockers.push('The editorial approval date cannot be in the future.');
}

const report = {
  schemaVersion: '1.0',
  reportType: 'editorial-prepublication-readiness',
  candidate: candidate.title || null,
  asOfDate,
  readiness: blockers.length ? 'blocked-needs-human-review' : 'checks-complete-awaiting-separate-publication-decision',
  blockers,
  warnings,
  automaticPublishing: false,
  externalServiceCalls: 0,
  repositoryFilesWritten: 0,
  nextStep: blockers.length
    ? 'Resolve the listed items, obtain editorial approval, and rerun the check. This tool never publishes.'
    : 'A human with separate publishing authority must make any publication decision; this tool never publishes.',
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (strict && blockers.length) process.exitCode = 2;
