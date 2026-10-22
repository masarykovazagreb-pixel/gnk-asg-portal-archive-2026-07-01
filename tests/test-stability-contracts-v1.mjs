#!/usr/bin/env node
/**
 * STABILNOST I AŽURNOST — gate.
 *
 * Provjerava tri stvari koje su 22. 10. 2026. ostavile izdanja šest sati bez
 * novog sadržaja:
 *
 *   1. nadzor mora izravno čuvati gradska izdanja (do tada ih nitko nije
 *      gledao — oporavak je ovisio o tuđem ciklusu),
 *   2. nijedan posao ne smije PREKIDATI pisce sadržaja dijeljenom concurrency
 *      grupom (dva pokretanja izdanja otkazana su nakon 11 i 32 sekunde),
 *   3. svako izdanje mora pokazivati vrijeme, ne samo datum, i javna stranica
 *      /status/ mora objavljivati isto mjerenje.
 *
 * Pad ovog testa znači da se kvar iz tišine može ponoviti.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const WF = join(ROOT, '.github', 'workflows');

const fails = [];
const read = (p) => readFileSync(p, 'utf8');
const wf = (name) => read(join(WF, name));
const page = (rel) => read(join(PORTAL, rel));
const has = (rel) => existsSync(join(PORTAL, rel));

/* ---------- 1. nadzor pokriva izdanja ---------- */

const watchdog = wf('ops-automation-sla-watchdog.yml');
const crons = [...watchdog.matchAll(/cron:\s*'([^']+)'/g)].map((m) => m[1]);
if (crons.length < 2) fails.push(`watchdog ima ${crons.length} termina, očekivana su barem 2 (satni nadzor ne smije ovisiti o jednom terminu)`);
if (!watchdog.includes("cron: '42 * * * *'")) fails.push('watchdog je izgubio glavni satni termin (:42)');
if (!watchdog.includes("_status.json")) fails.push('watchdog ne čita apps/region/data/_status.json — izdanja nisu pod nadzorom');
if (!watchdog.includes("dispatch('region-daily.yml')")) fails.push('watchdog ne pokreće region-daily.yml kad izdanja zastare');
if (!watchdog.includes('210')) fails.push('watchdog nema tvrdi prag (210 min) za izdanja');
if (!/if age > 180:/.test(watchdog)) fails.push('središnji AKTUAL više nema prag od 180 min');
if (!watchdog.includes("ensure_age('region-daily.yml'")) fails.push('nema rezervne provjere zadnjeg uspješnog ciklusa izdanja');

/* ---------- 2. nitko ne prekida pisce ---------- */

const files = ['aeo-ai-visibility.yml', 'content-queue-publish.yml', 'deploy-admin-auth-v6.yml',
  'editorial-scheduled-publish.yml', 'gallery-sync.yml', 'gnk-news-refresh-v2.yml',
  'image-health-scan.yml', 'kanal-daily.yml', 'macro-market-refresh.yml', 'market-pulse-refresh.yml',
  'region-daily.yml', 'tjednik-daily.yml'];

for (const name of files) {
  if (!existsSync(join(WF, name))) continue;
  const src = wf(name);
  if (!src.includes('gnk-asg-main-mutation')) continue;
  if (/cancel-in-progress:\s*true/.test(src)) {
    fails.push(`${name}: cancel-in-progress: true na dijeljenoj grupi gnk-asg-main-mutation — prekida tuđi ciklus`);
  }
}

if (!/--max-age 3/.test(wf('gnk-news-refresh-v2.yml'))) fails.push('news ciklus još javlja izdanja zastarjelima tek nakon 5 h (očekivano 3 h)');

/* ---------- 2b. izdanje se ne smije izgubiti kad se main pomakne ---------- */

const region = wf('region-daily.yml');
if (!/id: push/.test(region)) fails.push('region-daily: push korak nema id — deploy se ne može vezati na stvarni zapis');
if (!region.includes('git rebase "origin/$ref"')) fails.push('region-daily: nema rebase na svježi main (izdanje se odbacuje kad se main pomakne)');
if (!/if git push origin "HEAD:\$ref"; then pushed=true/.test(region)) fails.push('region-daily: push nema provjeru uspjeha');
if (!/steps\.push\.outputs\.pushed == 'true'/.test(region)) fails.push('region-daily: deploy nije vezan na uspješan push (može objaviti nezapisano izdanje)');
if (!/gh workflow run region-daily\.yml/.test(region)) fails.push('region-daily: nema samoobnavljanja kad zapis ne prođe');

const news = wf('gnk-news-refresh-v2.yml');
if (!/gh workflow run gnk-news-refresh-v2\.yml/.test(news)) fails.push('news: kad se main pomakne, nema odmah novog ciklusa (čeka se do 4 h)');

const indexRefresh = wf('refresh-index-live-data.yml');
if (!indexRefresh.includes("'gnk-asg-index-refresh'")) fails.push('refresh-index-live-data nije dobio vlastitu concurrency grupu');

/* ---------- 3. vrijeme na svakom izdanju ---------- */

const channels = JSON.parse(read(join(ROOT, 'apps', 'region', 'channels.json'))).channels;
for (const c of channels) {
  const rel = `kanal/${c.id}/index.html`;
  if (!has(rel)) { fails.push(`${rel}: nema stranice`); continue; }
  const html = page(rel);
  /* Riječ je lokalizirana (Ažurirano, Frissítve, Aggiornato, Обновено…), ali
     vrijeme mora biti isto: datum, točka, sat i minuta unutar <time>. */
  if (!/<time datetime="20\d\d-[^"]+">\s*\d{1,2}\.\s*\d{1,2}\.\s*·\s*\d{2}:\d{2}\s*<\/time>/.test(html)) {
    fails.push(`${rel}: vrijeme ažuriranja nije ispisano sa satom`);
  }
  if (!/"dateModified":"20\d\d-\d\d-\d\dT/.test(html)) fails.push(`${rel}: JSON-LD nema dateModified`);
  if (!c.timezone) fails.push(`channels.json: ${c.id} nema vremensku zonu`);
}

/* ---------- 4. javna stranica statusa ---------- */

for (const rel of ['status/index.html', 'en/status/index.html']) {
  if (!has(rel)) { fails.push(`${rel}: nema stranice statusa`); continue; }
  const html = page(rel);
  for (const id of channels.map((c) => c.id)) {
    if (!html.includes(`/kanal/${id}/`)) fails.push(`${rel}: nema poveznice na izdanje ${id}`);
  }
  if ((html.match(/<tr class=/g) || []).length < 18) fails.push(`${rel}: tablica nema 1 + 8 + 9 redaka`);
  if (!html.includes('rel="alternate" hreflang="hr"') || !html.includes('rel="alternate" hreflang="en"')) fails.push(`${rel}: nema hreflang par`);
  if (!/"@type":"WebPage"/.test(html)) fails.push(`${rel}: nema WebPage čvora`);
  if (!/"@type":"NewsMediaOrganization"/.test(html)) fails.push(`${rel}: nema čvora izdavača`);
  if (!html.includes('/assets/brand/aktual-media-hr-og.jpg')) fails.push(`${rel}: kartica za dijeljenje nije znak kuće`);
}

const sitemap = read(join(PORTAL, 'sitemap.xml'));
if (!sitemap.includes('<loc>https://gnk-asg.hr/status/</loc>')) fails.push('sitemap nema /status/');
if (!sitemap.includes('<loc>https://gnk-asg.hr/en/status/</loc>')) fails.push('sitemap nema /en/status/');

/* ---------- 5. linkovi na status ---------- */

for (const rel of ['izdanja/index.html', 'izdanja/moda/index.html', 'kanal/zagreb/index.html']) {
  if (!has(rel)) { fails.push(`${rel}: nema stranice`); continue; }
  if (!page(rel).includes('href="/status/"')) fails.push(`${rel}: nema poveznice na /status/`);
}

console.log(JSON.stringify({
  ok: fails.length === 0,
  version: 'GNK_ASG_STABILITY_CONTRACT_V1_20261022',
  crons,
  channels: channels.length,
  failures: fails,
}, null, 2));

if (fails.length) process.exitCode = 1;
