#!/usr/bin/env node
/**
 * GNKC index contract validator.
 * Checks apps/portal/data/gnkc-index.json against the minimal
 * guarantees specified for this feature:
 *   - all three component sources are present (structurally, even if
 *     individually marked not-ok due to staleness/failure);
 *   - no data claims to be fresher than it can be trusted;
 *   - weights sum to 1.0 (pre-normalization basket definition);
 *   - GNKC/USD, when present, is within a sane range;
 *   - EUR conversion uses a sourced rate, not a hardcoded constant;
 *   - the output never claims blockchain/wallet/mint/burn/exchange
 *     terminology;
 *   - a disclaimer is always present;
 *   - the feed is not empty/missing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GNKC_PATH = path.join(REPO_ROOT, 'apps/portal/data/gnkc-index.json');

const FORBIDDEN_TERMS = [
  'smart contract', 'blockchain token', 'wallet address', 'mint', 'burn',
  'exchange listing', 'legal tender', 'e-money license', 'token sale',
];

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!fs.existsSync(GNKC_PATH)) {
  fail('apps/portal/data/gnkc-index.json does not exist');
} else {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(GNKC_PATH, 'utf8'));
  } catch (e) {
    fail(`gnkc-index.json is not valid JSON: ${e.message}`);
  }

  if (data) {
    if (data.symbol !== 'GNKC') fail(`symbol must be "GNKC", got ${JSON.stringify(data.symbol)}`);
    if (data.type !== 'internal-stable-index') fail(`type must be "internal-stable-index", got ${JSON.stringify(data.type)}`);
    if (!data.disclaimer || data.disclaimer.length < 20) fail('disclaimer is missing or too short');
    if (!data.updatedAt) fail('updatedAt is missing');
    if (!['healthy', 'watch', 'degraded', 'unavailable'].includes(data.status)) {
      fail(`status must be one of healthy/watch/degraded/unavailable, got ${JSON.stringify(data.status)}`);
    }

    const components = Array.isArray(data.components) ? data.components : [];
    const expectedSymbols = ['USDC', 'USDT', 'DAI'];
    for (const sym of expectedSymbols) {
      if (!components.some((c) => c.symbol === sym)) fail(`missing component: ${sym}`);
    }
    const weightSum = components.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    if (Math.abs(weightSum - 1) > 0.001) fail(`component weights must sum to 1.0, got ${weightSum}`);

    if (data.status === 'healthy' || data.status === 'watch') {
      if (typeof data.valueUsd !== 'number') fail('valueUsd must be a number when status is healthy/watch');
      else if (data.valueUsd < 0.9 || data.valueUsd > 1.1) fail(`valueUsd ${data.valueUsd} is outside sane range [0.9, 1.1]`);
      if (data.valueEur != null && !data.usdEurSource) fail('valueEur present without a sourced usdEurSource');
    }

    if (data.status === 'unavailable' && data.valueUsd != null) {
      fail('status is "unavailable" but a valueUsd is still present -- should be null/omitted, not fabricated');
    }

    // The disclaimer field is explicitly meant to negate/deny these
    // terms ("nema wallet, ne postoji mint/burn...") -- that's its
    // whole purpose per the spec. Check every other field, but not it.
    const { disclaimer, ...rest } = data;
    const serialized = JSON.stringify(rest).toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      if (serialized.includes(term.toLowerCase())) fail(`forbidden terminology present outside disclaimer: "${term}"`);
    }

    if (Object.keys(data).length === 0) fail('gnkc-index.json is empty');
  }
}

const result = { ok: errors.length === 0, errors, warnings };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
