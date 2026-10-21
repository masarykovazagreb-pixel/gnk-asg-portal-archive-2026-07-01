#!/usr/bin/env node
/*
 * Kadenca u bazi znanja mora odgovarati rasporedu u repozitoriju.
 *
 * Zašto: javni tekst je tvrdio "svaka dva sata", "svaki sat" i "četiri puta
 * dnevno" dok workflow ima šest dnevnih pokretanja. Kad se raspored promijeni,
 * ovaj test pada — baza se ne može tiho raziči s onim što se stvarno izvršava.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const WORDS = ['nula', 'jedan', 'dva', 'tri', 'četiri', 'pet', 'šest', 'sedam', 'osam', 'devet', 'deset', 'jedanaest', 'dvanaest'];

/** Broj pokretanja iz cron izraza "m h,h,h * * *" (UTC sati). */
function dailyRuns(workflow) {
  const text = read(`.github/workflows/${workflow}`);
  const cron = (text.match(/cron:\s*'([^']+)'/) || [])[1] || '';
  const hours = (cron.split(/\s+/)[1] || '').replace(/[^0-9,*/-]/g, '');
  if (!hours) throw new Error(`${workflow}: cron has no hour field (${cron})`);
  if (/^\*$/.test(hours)) return 24;
  if (hours.includes('/')) {
    const step = Number(hours.split('/')[1]);
    return Number.isFinite(step) && step > 0 ? Math.round(24 / step) : 0;
  }
  return hours.split(',').filter(Boolean).length;
}

const newsRuns = dailyRuns('gnk-news-refresh-v2.yml');
const marketRuns = dailyRuns('market-pulse-refresh.yml');
const macroRuns = dailyRuns('macro-market-refresh.yml');
const newsWord = WORDS[newsRuns] || String(newsRuns);
check(newsRuns === 6, `news refresh is expected to run six times a day (found ${newsRuns})`);
check(marketRuns === macroRuns, `market and macro refresh disagree (${marketRuns} vs ${macroRuns})`);

const kb = JSON.parse(read('apps/portal/data/knowledge-base.json'));
const answers = [];
for (const group of kb.skupine) {
  for (const item of group.pitanja || []) answers.push({ group: group.naslov, q: String(item.p || ''), a: String(item.o || '') });
}
const answerFor = (needle) => answers.find((item) => item.q.includes(needle));

/* ---------- 1. središnji feed ---------- */

const feed = answerFor('Kada se osvježava središnji feed');
check(Boolean(feed), 'the feed-cadence answer is missing from the base');
if (feed) {
  check(feed.a.includes(`${newsWord} puta dnevno`), `feed answer must say "${newsWord} puta dnevno": ${feed.a.slice(0, 120)}`);
  const workflow = read('.github/workflows/gnk-news-refresh-v2.yml');
  const cron = (workflow.match(/cron:\s*'([^']+)'/) || [])[1] || '';
  const hours = cron.split(/\s+/)[1].split(',');
  const missing = hours.filter((hour) => !feed.a.includes(hour.padStart(2, '0')));
  check(missing.length === 0, `feed answer does not list every cron hour: ${missing.join(', ')}`);
}

/* ---------- 2. nema zastarjele tvrdnje ---------- */

const stale = [
  /svaki sat/i, /every hour/i, /every two hours/i, /hourly/i,
  /četiri puta dnevno/i, /four times daily|four times a day/i,
  /Ažurira se svaka dva sata/i, /Updated every two hours/i,
];
for (const item of answers) {
  for (const pattern of stale) {
    check(!pattern.test(item.a), `stale cadence in "${item.q.slice(0, 60)}": ${pattern.source}`);
  }
}

/* "svaka dva sata" smije ostati samo tamo gdje je stvarno dvosatno:
   gradska izdanja (region-daily, 7 * /2). */
const everyTwo = answers.filter((item) => /svaka dva sata|every two hours/i.test(item.a));
for (const item of everyTwo) {
  check(item.group === 'Autonomija i rad sustava', `"svaka dva sata" outside the regional context: ${item.q.slice(0, 60)}`);
}

/* ---------- 3. tržišta ---------- */

const markets = answerFor('Koliko se često osvježavaju tržišni');
check(Boolean(markets), 'the market-cadence answer is missing');
if (markets) {
  check(/dvaput dnevno/.test(markets.a), `market answer must state the real cadence: ${markets.a.slice(0, 140)}`);
  check(!/svaki sat/.test(markets.a), 'market answer still claims an hourly refresh');
}

/* ---------- 4. javne stranice ---------- */

const pages = [
  'apps/portal/knowledge-center/index.html',
  'apps/portal/en/knowledge-center/index.html',
  'apps/portal/gnk-aktual/index.html',
  'apps/portal/en/gnk-aktual/index.html',
];
for (const file of pages) {
  const page = read(file);
  check(!/Ažurira se svaka dva sata|Updated every hour|Updated every two hours/.test(page),
    `${file}: stale refresh claim on a public page`);
}

/* ---------- 4b. ploča Autonomija ---------- */

const autonomy = JSON.parse(read('ops/AUTONOMY-365.json'));
const hourly = (cron) => {
  const hours = (cron.split(/\s+/)[1] || '');
  if (hours === '*') return 24;
  if (hours.includes('/')) return Math.round(24 / Number(hours.split('/')[1]));
  return hours.split(',').filter(Boolean).length;
};
for (const stage of autonomy.pipeline || []) {
  const cadence = String(stage.cadence || '');
  const cron = (cadence.match(/\(([^)]+)\)/) || [])[1];
  if (!cron) continue;
  const runs = hourly(cron);
  const claimed = cadence.match(/(\d+)×/);
  if (claimed) {
    check(Number(claimed[1]) === runs, `autonomy stage "${stage.title?.hr || stage.id}" claims ${claimed[1]}× but the cron runs ${runs}× a day`);
  }
  if (/svaki sat|hourly/i.test(cadence)) {
    check(runs === 24, `autonomy stage "${stage.title?.hr || stage.id}" says hourly but the cron runs ${runs}× a day`);
  }
  const everyHours = cadence.match(/svakih? (\d+) h/i);
  if (everyHours) {
    check(runs === Math.round(24 / Number(everyHours[1])), `autonomy stage "${stage.title?.hr || stage.id}" says every ${everyHours[1]} h but the cron runs ${runs}× a day`);
  }
}

/* ---------- 5. odgovor agenta ---------- */

const { knowledgeAnswer } = await import(new URL(`file://${path.join(ROOT, 'workers/gnk-asg-direct-operator/src/chat-retrieval-v1.js')}`).href);
const reply = knowledgeAnswer('Kada se osvježava središnji feed?').reply;
check(reply.includes(newsWord), `agent reply does not carry the real cadence: ${reply.slice(0, 160)}`);
check(!/svaka dva sata|svaki sat/.test(reply), `agent reply repeats a stale cadence: ${reply.slice(0, 160)}`);

assert.equal(failures.length, 0, failures.join('\n') || 'cadence contract failed');
console.log(JSON.stringify({
  ok: true,
  newsRunsPerDay: newsRuns,
  marketRunsPerDay: marketRuns,
  regionalEveryHours: 2,
  staleClaims: 0,
}, null, 2));
