#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const controlPath = path.join(root, 'ops', 'automation-control-v1.json');
const switchesPath = path.join(root, 'ops', 'automation-kill-switches.json');
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, file)}: ${error.message}`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}

const control = readJson(controlPath);
const switches = readJson(switchesPath);

if (control && switches) {
  expect(control.timezone === 'Europe/Zagreb', 'timezone must be Europe/Zagreb');

  const daily = control.editorialCadence?.dailyReview;
  const weekly = control.editorialCadence?.weeklyReview;

  expect(daily?.frequency === 'daily', 'daily review frequency must be daily');
  expect(daily?.publishLocalTime === '20:30', 'daily review local time must be 20:30');
  expect(Number(daily?.minimumWords) >= 1500, 'daily review minimumWords must be at least 1500');
  expect(Number(daily?.targetWords) >= Number(daily?.minimumWords), 'daily review targetWords must be >= minimumWords');
  expect(Number(daily?.minimumVerifiedSources) >= 5, 'daily review requires at least 5 verified sources');
  expect(Number(daily?.minimumInternalLinks) >= 3, 'daily review requires at least 3 internal links');
  expect(Number(daily?.minimumVisuals) >= 3, 'daily review requires at least 3 visuals');
  expect(daily?.requiresOriginalAnalysis === true, 'daily review must require original analysis');
  expect(Array.isArray(daily?.destinations) && daily.destinations.length === 1 && daily.destinations[0] === 'portal', 'daily review destination must remain portal-only');
  expect(daily?.externalDistribution === 'disabled-until-separately-approved', 'daily external distribution must remain disabled');

  expect(weekly?.frequency === 'weekly', 'weekly review frequency must be weekly');
  expect(weekly?.day === 'SU', 'weekly review day must be Sunday');
  expect(weekly?.publishLocalTime === '18:00', 'weekly review local time must be 18:00');
  expect(Number(weekly?.minimumWords) >= 3500, 'weekly review minimumWords must be at least 3500');
  expect(Number(weekly?.targetWords) >= Number(weekly?.minimumWords), 'weekly review targetWords must be >= minimumWords');
  expect(Number(weekly?.minimumVerifiedSources) >= 10, 'weekly review requires at least 10 verified sources');
  expect(Number(weekly?.minimumInternalLinks) >= 8, 'weekly review requires at least 8 internal links');
  expect(Number(weekly?.minimumVisuals) >= 5, 'weekly review requires at least 5 visuals');
  expect(Number(weekly?.minimumOriginalCharts) >= 2, 'weekly review requires at least 2 original charts');
  expect(weekly?.requiresOriginalAnalysis === true, 'weekly review must require original analysis');

  const order = weekly?.distributionOrder;
  expect(JSON.stringify(order) === JSON.stringify(['portal', 'blogger', 'linkedin']), 'weekly distribution order must be portal -> blogger -> linkedin');
  expect(weekly?.linkedinMode === 'blocked-until-publishing-connector-or-endpoint-verified', 'LinkedIn must remain blocked until publishing access is verified');

  const channels = switches.channels || {};
  expect(channels.portalPublish?.enabled === false, 'portal publishing kill-switch must remain disabled during stabilization');
  expect(channels.bloggerPublish?.enabled === false, 'Blogger publishing kill-switch must remain disabled during stabilization');
  expect(channels.linkedinPublish?.enabled === false, 'LinkedIn publishing kill-switch must remain disabled during stabilization');
  expect(switches.releaseRules?.requireGreenPremiumContract === true, 'premium contract must be green before release');
  expect(switches.releaseRules?.requireCanonical200BeforeSyndication === true, 'canonical HTTP 200 must be required before syndication');
}

if (errors.length) {
  console.error('Editorial review cadence contract failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Editorial review cadence contract passed.');
