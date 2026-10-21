#!/usr/bin/env node
// Guard za Autonomiju 365.
//
// Stranica /autonomija/ smije tvrditi samo ono što se može izmjeriti iz
// repozitorija. Ovaj test čuva tri stvari:
//   1. plan ima stvarni horizont, kvartale i izlazne kriterije,
//   2. svaki kriterij ima vlasnika i mjeri se u generiranom statusu,
//   3. brojevi na stranici jednaki su brojevima u statusu (nema ručnog upisa).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* ---------- 1. Plan ---------- */

const plan = JSON.parse(read('ops/AUTONOMY-365.json'));
check(plan.version === 'GNK_ASG_AUTONOMY_365_V1_20261021', 'plan: unexpected version');
check(plan.horizon?.starts === '2026-10-21', 'plan: horizon must start on 2026-10-21');
check(plan.horizon?.ends === '2027-10-21', 'plan: horizon must end on 2027-10-21');
const horizonDays = Math.round((Date.parse(plan.horizon.ends) - Date.parse(plan.horizon.starts)) / 86400000);
check(plan.horizon.days === horizonDays && horizonDays === 365, `plan: horizon must be exactly 365 days (is ${horizonDays})`);
check(Array.isArray(plan.pipeline) && plan.pipeline.length >= 5, 'plan: pipeline needs at least five stages');
for (const stage of plan.pipeline || []) {
  check(Boolean(stage.owner && stage.cadence && stage.hr && stage.en), `plan: incomplete pipeline stage ${stage.hr || '?'}`);
}
check(Array.isArray(plan.quarters) && plan.quarters.length >= 4, 'plan: needs at least four quarters');
let previousEnd = '';
for (const q of plan.quarters || []) {
  check(Boolean(q.id && q.from && q.to && q.label?.hr && q.label?.en), `plan: quarter ${q.id || '?'} incomplete`);
  check(q.from <= q.to, `plan: quarter ${q.id} has inverted dates`);
  check(!previousEnd || q.from >= previousEnd, `plan: quarter ${q.id} overlaps the previous one`);
  previousEnd = q.to;
  check(Array.isArray(q.deliverables) && q.deliverables.length >= 2, `plan: quarter ${q.id} needs at least two deliverables`);
  check(Array.isArray(q.exit) && q.exit.length >= 1, `plan: quarter ${q.id} needs an exit criterion`);
  for (const id of q.exit || []) {
    check(plan.criteria.some((c) => c.id === id), `plan: quarter ${q.id} exits on unknown criterion ${id}`);
  }
}
check(plan.quarters.at(-1).to === plan.horizon.ends, 'plan: last quarter must end on the horizon end');

/* ---------- 2. Kriteriji ---------- */

const ids = new Set();
for (const c of plan.criteria) {
  check(!ids.has(c.id), `plan: duplicate criterion ${c.id}`);
  ids.add(c.id);
  check(Boolean(c.label?.hr && c.label?.en), `criterion ${c.id}: missing bilingual label`);
  check(['hard', 'watch'].includes(c.severity), `criterion ${c.id}: severity must be hard or watch`);
  check(Boolean(c.owner), `criterion ${c.id}: missing owner`);
  check(Boolean(c.route), `criterion ${c.id}: missing route`);
  check(Boolean(c.type), `criterion ${c.id}: missing measurement type`);
}
check(plan.criteria.filter((c) => c.severity === 'hard').length >= 4, 'plan: at least four hard criteria are required');

/* ---------- 3. Generirani status i stranice ---------- */

for (const file of ['apps/portal/autonomija/index.html', 'apps/portal/en/autonomy/index.html', 'apps/portal/data/autonomy-status.json']) {
  check(exists(file), `missing generated file: ${file}`);
}
if (failures.length) {
  assert.equal(failures.length, 0, failures.join('\n'));
}

const status = JSON.parse(read('apps/portal/data/autonomy-status.json'));
const hr = read('apps/portal/autonomija/index.html');
const en = read('apps/portal/en/autonomy/index.html');

check(status.version === plan.version, 'status: version must match the plan');
check(status.criteria.length === plan.criteria.length, 'status: every criterion must be measured');
for (const c of status.criteria) {
  check(['ok', 'watch', 'fail'].includes(c.state), `status: ${c.id} has an unknown state`);
  check(Boolean(c.actual && c.actual !== '—'), `status: ${c.id} has no measured value`);
  check(c.severity === (plan.criteria.find((p) => p.id === c.id) || {}).severity, `status: ${c.id} lost its severity`);
}
for (const c of status.criteria) {
  check(hr.includes(`data-criterion="${c.id}"`), `page: missing criterion ${c.id}`);
  check(en.includes(`data-criterion="${c.id}"`), `en page: missing criterion ${c.id}`);
  check(new RegExp(`data-criterion="${c.id}" data-state="${c.state}"`).test(hr), `page: ${c.id} state differs from status`);
}
const totals = status.totals;
check(totals.all === status.criteria.length, 'status: totals.all must equal the measured criteria');
check(totals.ok + totals.watch + totals.fail === totals.all, 'status: totals must add up');
for (const [key, value] of Object.entries({ ok: totals.ok, watch: totals.watch, fail: totals.fail })) {
  check(hr.includes(`data-metric="${key}">${value}<`), `page: metric ${key} must be ${value}`);
  check(en.includes(`data-metric="${key}">${value}<`), `en page: metric ${key} must be ${value}`);
}

/* ---------- 4. Stranice: tehnika i dvojezičnost ---------- */

const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const websites = (html) => jsonLd(html).flatMap((node) => {
  const found = [];
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.includes('WebSite')) found.push(value);
    Object.values(value).forEach(walk);
  };
  walk(node);
  return found;
});

for (const [name, html, lang] of [['hr', hr, 'hr'], ['en', en, 'en']]) {
  check(new RegExp(`<html lang="${lang}"`).test(html), `${name}: wrong html lang`);
  check((html.match(/rel="canonical"/g) || []).length === 1, `${name}: exactly one canonical is required`);
  const nodes = websites(html);
  check(nodes.length === 1, `${name}: exactly one WebSite node is required (found ${nodes.length})`);
  if (nodes.length === 1) {
    check(nodes[0]['@id'] === 'https://gnk-asg.hr/#website', `${name}: WebSite @id must be canonical`);
    check(nodes[0].name === 'GNK ASG', `${name}: WebSite name must be GNK ASG`);
  }
  check(html.includes('hreflang="hr"') && html.includes('hreflang="en"') && html.includes('hreflang="x-default"'), `${name}: missing hreflang set`);
  check(html.includes('public-unified-menu-v6.js'), `${name}: missing unified menu`);
  check(html.includes('public-contrast-hardening-v1.js'), `${name}: missing contrast runtime`);
  check(html.includes('public-design-tokens-v1.css'), `${name}: missing design tokens`);
  check(/<meta name="robots" content="index,follow/.test(html), `${name}: page must be indexable`);
  check(/<meta name="description" content="[^"]{60,}"/.test(html), `${name}: description is too short`);
  const internal = new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]));
  check(internal.size >= 6, `${name}: at least six internal links are required (found ${internal.size})`);
  for (const needed of ['/gnk-aktual/', '/izdanja/', '/kanal/', '/zdravlje/', '/radio/', '/nermin-sefic/']) {
    check(internal.has(needed), `${name}: missing link to ${needed}`);
  }
}
check(hr.includes('/en/autonomy/'), 'hr page must link to the English twin');
check(en.includes('/autonomija/'), 'en page must link to the Croatian twin');
check(!en.includes('Smjer za sljedećih'), 'en page must not carry Croatian section headings');
check(en.includes('Direction for the next 365 days'), 'en page must carry the English heading');

/* ---------- 5. Sitemap ---------- */

const sitemap = read('apps/portal/sitemap.xml');
check(sitemap.includes('<loc>https://gnk-asg.hr/autonomija/</loc>'), 'sitemap: missing /autonomija/');
check(sitemap.includes('<loc>https://gnk-asg.hr/en/autonomy/</loc>'), 'sitemap: missing /en/autonomy/');

assert.equal(failures.length, 0, failures.join('\n') || 'autonomy guard failed');
console.log(JSON.stringify({
  ok: true,
  criteria: status.criteria.length,
  totals,
  quarters: plan.quarters.length,
  pipeline: plan.pipeline.length,
  horizonDays,
}, null, 2));
