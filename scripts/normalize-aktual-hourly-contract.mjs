import { readFile, writeFile } from 'node:fs/promises';

const statusPath = 'apps/portal/data/news-automation-status.json';
const hrPath = 'apps/portal/gnk-aktual/index.html';
const enPath = 'apps/portal/en/gnk-aktual/index.html';
const hrHomePath = 'apps/portal/index.html';
const enHomePath = 'apps/portal/en/index.html';

const status = JSON.parse(await readFile(statusPath, 'utf8'));
status.cadence = 'six times daily at 01:12, 05:12, 09:12, 13:12, 17:12 and 21:12 UTC; watchdog recovery if stale';
status.scheduled_interval_hours = 4;
status.freshness_sla_minutes = 290;
status.watchdog = '.github/workflows/ops-automation-sla-watchdog.yml';
await writeFile(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');

let hr = await readFile(hrPath, 'utf8');
hr = hr
  .replaceAll('Ažurira se svaka dva sata.', 'Ažurira se šest puta dnevno.')
  .replaceAll('Ažurira se svaka dva sata', 'Ažurira se šest puta dnevno')
  .replaceAll('Ažurira se svaka 2 sata.', 'Ažurira se šest puta dnevno.')
  .replaceAll('Sadržaj se automatski osvježava svaka dva sata', 'Sadržaj se automatski osvježava šest puta dnevno')
  .replaceAll('Ažurira se svaki sat.', 'Ažurira se šest puta dnevno.')
  .replaceAll('Ažurira se svaki sat', 'Ažurira se šest puta dnevno')
  .replaceAll('Sadržaj se automatski osvježava svaki sat', 'Sadržaj se automatski osvježava šest puta dnevno');
await writeFile(hrPath, hr, 'utf8');

let en = await readFile(enPath, 'utf8');
en = en
  .replaceAll('Updated every two hours.', 'Updated six times daily.')
  .replaceAll('Updates every two hours', 'Updates six times daily')
  .replaceAll('Content refreshes automatically every two hours', 'Content refreshes automatically six times daily')
  .replaceAll('Updated every hour.', 'Updated six times daily.')
  .replaceAll('Updates every hour', 'Updates six times daily')
  .replaceAll('Content refreshes automatically every hour', 'Content refreshes automatically six times daily');
await writeFile(enPath, en, 'utf8');

for (const [path, replacements] of [
  [hrHomePath, [['Osvježavanje svaka 2 sata', 'Osvježavanje šest puta dnevno'], ['Osvježeno svaka 2 sata', 'Osvježeno šest puta dnevno'], ['svaka 2 sata', 'šest puta dnevno']]],
  [enHomePath, [['Refresh every 2 hours', 'Refresh six times daily'], ['Refreshed every 2 hours', 'Refreshed six times daily']]],
]) {
  let page = await readFile(path, 'utf8');
  for (const [from, to] of replacements) page = page.replaceAll(from, to);
  await writeFile(path, page, 'utf8');
}

console.log('AKTUAL six-refresh daily public/status contract normalized.');
