import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateMarketDay, validateMarketSnapshot } from './simulated-market.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const config = JSON.parse(await readFile(path.join(root, 'config', 'public-market-simulation.json'), 'utf8'));

const start = process.argv[2] ?? '2026-07-22';
const days = Number.parseInt(process.argv[3] ?? '14', 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Start date must use YYYY-MM-DD.');
if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('Days must be an integer from 1 to 90.');

const outputDir = path.join(root, 'generated-market');
await mkdir(outputDir, { recursive: true });

const startDate = new Date(`${start}T12:00:00Z`);
let previousSnapshot = null;
const manifest = {
  schemaVersion: 'asg-simulated-market-manifest/v1',
  mode: 'OFFLINE_SIMULATION',
  generatedAt: new Date().toISOString(),
  start,
  days,
  files: [],
  totals: { participants: 0, simulatedTrades: 0, finalPortfolioValue: 0, incentivePoints: 0 }
};

for (let offset = 0; offset < days; offset += 1) {
  const date = new Date(startDate);
  date.setUTCDate(startDate.getUTCDate() + offset);
  const day = date.toISOString().slice(0, 10);
  const snapshot = simulateMarketDay({ config, date: day, previousSnapshot });
  const validation = validateMarketSnapshot(snapshot);
  if (!validation.ok) throw new Error(`${day}: ${validation.errors.join('; ')}`);

  const filename = `${day}.market.json`;
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  manifest.files.push({ date: day, filename, close: snapshot.market.close, movePct: snapshot.market.movePct });
  previousSnapshot = snapshot;
}

manifest.totals.participants = previousSnapshot?.participants.length ?? 0;
manifest.totals.simulatedTrades = previousSnapshot ? manifest.files.length * previousSnapshot.participants.filter((item) => item.lastTrade).length : 0;
manifest.totals.finalPortfolioValue = previousSnapshot?.participants.reduce((sum, item) => sum + item.portfolioValue, 0) ?? 0;
manifest.totals.incentivePoints = previousSnapshot?.participants.reduce((sum, item) => sum + item.incentivePoints, 0) ?? 0;
manifest.finalLeaderboard = previousSnapshot?.participants.map(({ rank, id, displayName, portfolioValue, dailyPnl, incentivePoints }) => ({ rank, id, displayName, portfolioValue, dailyPnl, incentivePoints })) ?? [];
manifest.publicDisclaimer = config.publicExperience.bannerText;
manifest.realTradingEnabled = false;

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
