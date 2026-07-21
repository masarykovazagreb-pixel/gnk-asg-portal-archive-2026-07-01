import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const shadowDir = path.join(root, 'generated-shadow');
const reviewDir = path.join(root, 'generated-review');
const adminDir = path.join(root, 'generated-admin');

await mkdir(adminDir, { recursive: true });

const shadowManifest = JSON.parse(await readFile(path.join(shadowDir, 'manifest.json'), 'utf8'));
const reviewIndex = JSON.parse(await readFile(path.join(reviewDir, 'index.json'), 'utf8'));

const lines = [
  '# GNK ASG Digital Workforce — offline admin pregled',
  '',
  `Generirano: ${new Date().toISOString()}`,
  '',
  '> OFFLINE / SHADOW ONLY — javna objava, produkcijski upis i cron ostaju isključeni.',
  '',
  '## Sažetak',
  '',
  `- Razdoblje: ${shadowManifest.start} · ${shadowManifest.days} dana`,
  `- Događaji: ${shadowManifest.totals.events}`,
  `- Komentari: ${shadowManifest.totals.comments}`,
  `- Sastanci: ${shadowManifest.totals.meetings}`,
  `- Zadaci: ${shadowManifest.totals.tasks}`,
  `- Draftovi: ${shadowManifest.totals.drafts}`,
  `- Javna objava dopuštena: NE`,
  '',
  '## Uredničke odluke',
  ''
];

for (const decision of ['PASS_INTERNAL', 'REVISE', 'HOLD', 'REJECT']) {
  lines.push(`- ${decision}: ${reviewIndex.totals?.[decision] ?? 0}`);
}

lines.push('', '## Dnevni pregled', '');

for (const day of reviewIndex.days) {
  const cycle = JSON.parse(await readFile(path.join(shadowDir, day.source), 'utf8'));
  const review = JSON.parse(await readFile(path.join(reviewDir, day.review), 'utf8'));
  const blocked = review.items.filter((item) => ['HOLD', 'REJECT'].includes(item.decision));
  const revisions = review.items.filter((item) => item.decision === 'REVISE');
  const tabs = Object.entries(cycle.drafts.reduce((acc, draft) => {
    acc[draft.tab] = (acc[draft.tab] ?? 0) + 1;
    return acc;
  }, {})).map(([tab, count]) => `${tab}: ${count}`).join(', ');

  lines.push(
    `### ${day.date}`,
    '',
    `- Događaji: ${cycle.events.length}`,
    `- Sastanci: ${cycle.meetings.length}`,
    `- Zadaci: ${cycle.tasks.length}`,
    `- Draftovi po tabovima: ${tabs || 'nema'}`,
    `- Za doradu: ${revisions.length}`,
    `- Zadržano ili odbijeno: ${blocked.length}`,
    ''
  );

  if (blocked.length) {
    lines.push('**Blokirane stavke**', '');
    for (const item of blocked.slice(0, 10)) {
      lines.push(`- ${item.decision} · ${item.draftId} · ${(item.reasons ?? []).join('; ')}`);
    }
    lines.push('');
  }
}

lines.push(
  '## Kontrolne granice',
  '',
  '- nema produkcijskih upisa;',
  '- nema javnog publish statusa;',
  '- nema zakazanog vremena objave;',
  '- simulirane financije moraju ostati označene kao SIMULATED;',
  '- obvezujuće pravne, ugovorne i platne tvrdnje moraju biti blokirane;',
  '- završna odluka uvijek ostaje na ovlaštenoj osobi.',
  ''
);

const output = `${lines.join('\n')}\n`;
await writeFile(path.join(adminDir, 'shadow-admin-summary.md'), output, 'utf8');

const machineSummary = {
  schemaVersion: 'offline-workforce-admin-summary/v1',
  mode: 'OFFLINE',
  publicReleaseAllowed: false,
  period: { start: shadowManifest.start, days: shadowManifest.days },
  totals: shadowManifest.totals,
  reviewTotals: reviewIndex.totals,
  output: 'shadow-admin-summary.md'
};

await writeFile(path.join(adminDir, 'summary.json'), `${JSON.stringify(machineSummary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(machineSummary, null, 2));
