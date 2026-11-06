#!/usr/bin/env node
/* Regresijski test: dnevni ciklus ne smije ponovno odbacivati zapise s fiksnim
   limitom (420), jer tada nastaju stranice bez zapisa (region-audit).
   node tests/test-daily-cap-v1.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'apps', 'region', 'engine', 'daily.mjs'), 'utf8');

assert.ok(!/\.slice\(0, 420\)/.test(src), 'daily.mjs ne smije imati fiksni limit 420');
assert.match(src, /const MAX_ITEMS = Number\(arg\('--max-items', '5000'\)\);/, 'limit mora biti parametar s 5000');
assert.match(src, /\.slice\(0, MAX_ITEMS\);/, 'spajanje mora koristiti MAX_ITEMS');

console.log(JSON.stringify({ ok: true, tests: 3 }));
