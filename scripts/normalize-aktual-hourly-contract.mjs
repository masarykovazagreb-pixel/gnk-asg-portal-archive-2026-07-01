import { readFile, writeFile } from 'node:fs/promises';

const statusPath = 'apps/portal/data/news-automation-status.json';
const hrPath = 'apps/portal/gnk-aktual/index.html';

const status = JSON.parse(await readFile(statusPath, 'utf8'));
status.cadence = 'hourly at minute 12 UTC; watchdog recovery if stale';
status.scheduled_interval_hours = 1;
status.freshness_sla_minutes = 110;
status.watchdog = '.github/workflows/ops-automation-sla-watchdog.yml';
await writeFile(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');

let hr = await readFile(hrPath, 'utf8');
hr = hr
  .replaceAll('Ažurira se svaka dva sata.', 'Ažurira se svaki sat.')
  .replaceAll('Ažurira se svaka 2 sata.', 'Ažurira se svaki sat.')
  .replaceAll('ažurira se svaka dva sata', 'ažurira se svaki sat')
  .replaceAll('ažurira se svaka 2 sata', 'ažurira se svaki sat');
await writeFile(hrPath, hr, 'utf8');

console.log('AKTUAL hourly public/status contract normalized.');
