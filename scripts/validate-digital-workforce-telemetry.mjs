#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, 'ops', 'digital-workforce-telemetry-schema.json');
const FIXTURE_PATH = path.join(ROOT, 'ops', 'digital-workforce-telemetry-example.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const event = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const errors = [];

const requiredSchemaFields = ['workerId', 'runId', 'startedAt', 'status', 'taskType'];
for (const field of requiredSchemaFields) {
  if (!schema.required?.includes(field)) errors.push(`schema.required is missing ${field}`);
  if (!(field in (schema.properties || {}))) errors.push(`schema.properties is missing ${field}`);
  if (event[field] === undefined || event[field] === null || event[field] === '') errors.push(`fixture is missing ${field}`);
}

const allowedStatuses = schema.properties?.status?.enum || [];
if (!allowedStatuses.includes(event.status)) errors.push(`fixture status is not allowed: ${event.status}`);

for (const field of ['startedAt', 'finishedAt']) {
  if (event[field] !== null && event[field] !== undefined && Number.isNaN(Date.parse(event[field]))) {
    errors.push(`${field} is not a valid date-time`);
  }
}

if (event.finishedAt && Date.parse(event.finishedAt) < Date.parse(event.startedAt)) {
  errors.push('finishedAt precedes startedAt');
}

if (event.durationMs < 0) errors.push('durationMs must not be negative');
if (event.attempt < 1) errors.push('attempt must be at least 1');
if (event.retries < 0) errors.push('retries must not be negative');
if (event.manualInterventions < 0) errors.push('manualInterventions must not be negative');

const qualityFields = ['reliability', 'outputQuality', 'timeliness', 'autonomy', 'costEfficiency', 'documentation'];
const qualityLimits = { reliability: 40, outputQuality: 20, timeliness: 15, autonomy: 10, costEfficiency: 10, documentation: 5 };
let computedTotal = 0;
for (const field of qualityFields) {
  const value = event.quality?.[field];
  if (typeof value !== 'number' || value < 0 || value > qualityLimits[field]) {
    errors.push(`quality.${field} must be between 0 and ${qualityLimits[field]}`);
  } else {
    computedTotal += value;
  }
}

if (event.quality?.total !== computedTotal) {
  errors.push(`quality.total ${event.quality?.total} does not equal computed total ${computedTotal}`);
}
if (computedTotal > 100) errors.push(`computed quality total exceeds 100: ${computedTotal}`);

if (event.status === 'success' && event.error) errors.push('successful event must not contain an error');
if (['failed', 'blocked', 'suspended'].includes(event.status) && !event.error && !event.incidentCode) {
  errors.push(`${event.status} event must contain error or incidentCode`);
}

const report = {
  contract: 'GNK_ASG_DIGITAL_WORKFORCE_TELEMETRY_V1',
  schema: path.relative(ROOT, SCHEMA_PATH),
  fixture: path.relative(ROOT, FIXTURE_PATH),
  allowedStatuses,
  qualityMaximum: Object.values(qualityLimits).reduce((sum, value) => sum + value, 0),
  computedFixtureQuality: computedTotal,
  valid: errors.length === 0,
  errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exit(1);
